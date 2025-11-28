import OpenAI from "openai";
import dotenv from "dotenv";
import db from "../utils/db.js";
import { addMemoryText } from "./memoryController.js";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function wantsMemory(m) {
  const s = (m || "").toLowerCase();
  return /\b(remember|save (this|that)|note to self|store this|keep in mind)\b/.test(s);
}

// In-memory rolling history per user (persist across requests, within process lifetime)
const historyByUser = new Map(); // userId -> [{role, content}]
const MAX_TURNS = 10; // last N exchanges

function pushHistory(userId, role, content){
  if (!historyByUser.has(userId)) historyByUser.set(userId, []);
  const arr = historyByUser.get(userId);
  arr.push({ role, content });
  // Keep only the last 2*MAX_TURNS messages (user+assistant per turn)
  while (arr.length > MAX_TURNS * 2) arr.shift();
}

async function getRelevantMemories(userId, queryText){
  try {
    // Try vector search first if embedding column exists
    const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: queryText });
    const vec = emb.data?.[0]?.embedding;
    if (Array.isArray(vec) && vec.length){
      const literal = `[${vec.join(',')}]`;
      const { rows } = await db.query(
        `SELECT id, text, timestamp FROM memory_store
         WHERE (created_by = $1 OR created_by IS NULL)
         ORDER BY embedding <=> $2::vector ASC
         LIMIT 5`,
        [userId, literal]
      );
      return rows;
    }
  } catch (e) {
    // fall through to text fallback
    console.warn('vector search fallback:', e?.message || e);
  }
  try {
    const { rows } = await db.query(
      `SELECT id, text, timestamp FROM memory_store
       WHERE (created_by = $1 OR created_by IS NULL)
       ORDER BY CASE WHEN POSITION(LOWER($2) IN LOWER(text))>0 THEN 0 ELSE 1 END, timestamp DESC
       LIMIT 5`,
      [userId, queryText]
    );
    return rows;
  } catch {
    return [];
  }
}

// Main chat handler
export async function getOrCreateDefaultSession(userId){
  const sel = await db.query('SELECT id FROM chat_sessions WHERE user_id = $1 AND title = $2 LIMIT 1', [userId, 'Default']);
  if (sel.rowCount) return sel.rows[0].id;
  const ins = await db.query('INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id', [userId, 'Default']);
  return ins.rows[0].id;
}

export async function startSession(req, res){
  try {
    const userId = req.user.id;
    const { title } = req.body || {};
    const t = (title && String(title).trim()) || new Date().toLocaleString();
    const ins = await db.query('INSERT INTO chat_sessions (user_id, title) VALUES ($1,$2) RETURNING id, title, created_at, updated_at', [userId, t]);
    res.json(ins.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Failed to start session' }); }
}

export async function listSessions(req, res){
  try {
    const userId = req.user.id;
    const { rows } = await db.query('SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC, id DESC', [userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list sessions' }); }
}

export async function listMessages(req, res){
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const own = await db.query('SELECT 1 FROM chat_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!own.rowCount) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query('SELECT id, role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY id ASC', [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Failed to list messages' }); }
}

export async function clearSession(req, res){
  try {
    const userId = req.user.id;
    const { sessionId } = req.body || {};
    const sid = sessionId || await getOrCreateDefaultSession(userId);
    const own = await db.query('SELECT 1 FROM chat_sessions WHERE id = $1 AND user_id = $2', [sid, userId]);
    if (!own.rowCount) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM chat_messages WHERE session_id = $1', [sid]);
    historyByUser.delete(userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to clear session' }); }
}

export async function deleteSession(req, res){
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const own = await db.query('SELECT 1 FROM chat_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!own.rowCount) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM chat_sessions WHERE id = $1', [id]);
    historyByUser.delete(userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to delete session' }); }
}

export async function chatResponse(req, res) {
  try {
    const { message, history, sessionId } = req.body || {};
    const userId = req.user.id;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'message' field." });
    }

    // Seed server-side history with client-provided context (e.g., after reload)
    if (Array.isArray(history)){
      const sanitized = history
        .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-MAX_TURNS*2);
      historyByUser.set(userId, sanitized);
    }

    // Build a retrieval query using the last user turn + current message for better context
    const rolling = historyByUser.get(userId) || [];
    const lastUser = [...rolling].reverse().find(m => m.role === 'user')?.content || '';
    const retrievalQuery = [lastUser, message].filter(Boolean).join('\n');

    // Pull relevant long-term memories
    const memories = await getRelevantMemories(userId, retrievalQuery);
    const memoryBlock = memories.length
      ? `Relevant long-term memory (most similar first):\n` + memories.map(m => `- ${m.text}`).join('\n')
      : '';

    // Compose prompt with: system + optional memory context + rolling history + current message
    const messages = [
      { role: 'system', content: 'You are Vox, an OS-integrated assistant. You maintain and use the conversational context across turns. If the user sends a short follow-up like "in software" or "that one", interpret it relative to the most recent topic. Format with short paragraphs, bullets, and code blocks when helpful. Be concise.' },
      ...(memoryBlock ? [{ role: 'system', content: memoryBlock }] : []),
      ...rolling,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages
    });

    const reply = completion.choices[0]?.message?.content || '(no response)';

    // Update rolling history
    pushHistory(userId, 'user', message);
    pushHistory(userId, 'assistant', reply);

    // Persist to DB session
    const sid = sessionId || await getOrCreateDefaultSession(userId);
    await db.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [sid]);
    await db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1,$2,$3)', [sid, 'user', message]);
    await db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1,$2,$3)', [sid, 'assistant', reply]);

    // Opportunistic memory save if user asks to remember
    let saved = false;
    if (wantsMemory(message)) {
      try {
        const cleaned = message.replace(/^\s*(can\s+you\s+)?remember(\s+that)?\s*/i, '').trim() || message;
        await addMemoryText(userId, cleaned, req.user?.role === 'admin');
        saved = true;
      } catch (e) {
        console.warn('Memory save from chat failed:', e?.message || e);
      }
    }

    return res.json({ reply, saved, used_memories: memories.map(m => ({ id: m.id, text: m.text })) });

  } catch (error) {
    console.error("ChatController Error:", error);
    res.status(500).json({ error: "Chat service error." });
  }
}
