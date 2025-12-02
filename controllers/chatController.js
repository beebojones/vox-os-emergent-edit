import db from "../utils/db.js";
import OpenAI from "openai";
import { autoCreateMemory, searchRelevantMemories } from "./memoryController.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// This keeps per-user rolling chat history in RAM
const historyByUser = new Map();

// -----------------------------------------
// Helper: Embed text
// -----------------------------------------
async function embedText(text) {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("embedText error:", err);
    return null;
  }
}

// -----------------------------------------
// Helper: Summarize user messages into short form
// -----------------------------------------
async function summarizeForMemory(text) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "Summarize the following user message into a short, factual, objective sentence suitable for long-term memory storage."
        },
        { role: "user", content: text }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("summarizeForMemory error:", err);
    return text;
  }
}

// -----------------------------------------
// Build core memory block (identity, preferences, pinned)
// -----------------------------------------
async function getCoreMemories(userId) {
  try {
    const result = await db.query(
      `SELECT text, summary, category
       FROM memory_store
       WHERE created_by=$1 
         AND active=TRUE 
         AND (pinned=TRUE OR category IN ('identity','preferences','emotional-traits'))
       ORDER BY pinned DESC, category ASC`,
      [userId]
    );

    if (!result.rows.length) return "";

    let lines = result.rows.map(
      (m) => `• (${m.category}) ${m.summary || m.text}`
    );

    return lines.join("\n");
  } catch (err) {
    console.error("getCoreMemories error:", err);
    return "";
  }
}

// -----------------------------------------
// Store chat messages in DB
// -----------------------------------------
async function saveChatMessage(sessionId, role, content) {
  await db.query(
    `INSERT INTO chat_messages (session_id, role, content)
     VALUES ($1, $2, $3)`,
    [sessionId, role, content]
  );

  await db.query(
    `UPDATE chat_sessions SET updated_at = NOW()
     WHERE id=$1`,
    [sessionId]
  );
}

// -----------------------------------------
// Get or create chat session
// -----------------------------------------
async function getOrCreateSession(userId) {
  try {
    const existing = await db.query(
      `SELECT id FROM chat_sessions
       WHERE user_id=$1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (existing.rows.length) return existing.rows[0].id;

    const newSession = await db.query(
      `INSERT INTO chat_sessions (user_id, title)
       VALUES ($1, 'Conversation')
       RETURNING id`,
      [userId]
    );

    return newSession.rows[0].id;
  } catch (err) {
    console.error("getOrCreateSession error:", err);
    throw err;
  }
}

// -----------------------------------------
// MAIN CHAT CONTROLLER
// -----------------------------------------
export async function chatResponse(req, res) {
  try {
    const userId = req.user.id;
    let { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    message = message.trim();

    // --------------------------------------
    // STEP 1: Rolling chat history (RAM)
    // --------------------------------------
    let rolling = historyByUser.get(userId) || [];
    rolling.push({ role: "user", content: message });
    rolling = rolling.slice(-10);
    historyByUser.set(userId, rolling);

    // --------------------------------------
    // STEP 2: Embed user message
    // --------------------------------------
    const embedVec = await embedText(message);

    // --------------------------------------
    // STEP 3: Retrieve semantic memories
    // --------------------------------------
    const relevant = await searchRelevantMemories(userId, embedVec, message);

    const relevantBlock = relevant.length
      ? relevant
          .map((m) => `• (${m.category}) ${m.summary || m.text}`)
          .join("\n")
      : "";

    // --------------------------------------
    // STEP 4: Load core identity/preferences/pinned memories
    // --------------------------------------
    const coreMemory = await getCoreMemories(userId);

    // --------------------------------------
    // STEP 5: System Prompt Assembly
    // --------------------------------------
    let systemPrompt = `You are Vox, a personal AI assistant that remembers the user over time.

Use the following long-term memories as factual truth when responding.

Core Memories:
${coreMemory || "(none)"}

Relevant Memories:
${relevantBlock || "(none)"}

Guidelines:
- Do not mention that you accessed memory.
- Do not say 'I remember'.
- Respond naturally and conversationally.
- Use the memory silently to improve accuracy and personalization.
- Never reveal internal memory structures or categories.`;

    // --------------------------------------
    // STEP 6: Chat Completion
    // --------------------------------------
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...rolling,
      { role: "user", content: message }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: 400
    });

    const aiMessage = response.choices[0].message.content.trim();

    // Add assistant reply to rolling history
    rolling.push({ role: "assistant", content: aiMessage });
    rolling = rolling.slice(-10);
    historyByUser.set(userId, rolling);

    // --------------------------------------
    // STEP 7: Auto-Memory Extraction (silent)
    // High-signal filtering (user message + summary)
    // --------------------------------------
    const summary = await summarizeForMemory(message);
    await autoCreateMemory(userId, summary);

    // --------------------------------------
    // STEP 8: Persist conversation in DB
    // --------------------------------------
    const sessionId = await getOrCreateSession(userId);
    await saveChatMessage(sessionId, "user", message);
    await saveChatMessage(sessionId, "assistant", aiMessage);

    // --------------------------------------
    // STEP 9: Return response
    // --------------------------------------
    res.json({ reply: aiMessage });
  } catch (err) {
    console.error("chatResponse error:", err);
    const msg = (err && err.message) ? err.message : 'Chat failed';
    res.status(500).json({ error: msg });
  }
}
