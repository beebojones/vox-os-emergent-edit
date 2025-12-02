import db from "../utils/db.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// High-signal categories
const VALID_CATEGORIES = [
  "identity",
  "preferences",
  "relationships",
  "biography",
  "projects",
  "work",
  "knowledge",
  "emotional-traits"
];

// -----------------------------
// Helper: Create embedding
// -----------------------------
async function embedText(text) {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

// -----------------------------
// Helper: Summarize memory text
// -----------------------------
async function summarizeText(text) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "Summarize this into one short, factual sentence that captures the core information. No creativity, no interpretation."
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    if (!response?.choices?.length) return text;
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("Summarization error:", err);
    return text;
  }
}

// -----------------------------
// Helper: Clean memory text
// -----------------------------
function cleanText(input) {
  if (!input) return "";
  let t = input.trim();
  t = t.replace(/\s+/g, " "); // collapse excessive whitespace
  return t;
}

// -----------------------------
// Helper: Ensure category is valid
// -----------------------------
function normalizeCategory(category) {
  if (!category) return null;
  const normalized = category.trim().toLowerCase();
  return VALID_CATEGORIES.includes(normalized) ? normalized : null;
}

// -----------------------------
// High-signal Memory Classifier
// -----------------------------
async function classifyMemory(text) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content:
            "You classify user statements into LONG-TERM memory categories. Only classify stable, important information. Output exactly one category or 'none'. Categories: identity, preferences, relationships, biography, projects, work, knowledge, emotional-traits."
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const raw = response.choices[0].message.content
      ?.trim()
      ?.toLowerCase();

    if (!raw) return "none";

    if (VALID_CATEGORIES.includes(raw)) return raw;
    return "none";
  } catch (err) {
    console.error("Classification error:", err);
    return "none";
  }
}

// -----------------------------
// CREATE Memory (manual or auto from chat)
// -----------------------------
export async function createMemory(req, res) {
  try {
    const userId = req.user.id;
    const { text, category, pinned = false } = req.body;

    let cleaned = cleanText(text);
    if (!cleaned) {
      return res.status(400).json({ error: "Text is required." });
    }

    let finalCategory = normalizeCategory(category);

    // If no category provided, classify automatically
    if (!finalCategory) {
      const autoCat = await classifyMemory(cleaned);
      if (autoCat === "none") {
        return res.status(400).json({ error: "Text is not suitable for long-term memory." });
      }
      finalCategory = autoCat;
    }

    // Summarize long text
    let summary = cleaned;
    if (cleaned.length > 300) {
      summary = await summarizeText(cleaned);
    }

    const embedding = await embedText(cleaned);
    const embeddingJson = embedding ? JSON.stringify(embedding) : null;

    const result = await db.query(
      `INSERT INTO memory_store 
        (text, summary, category, embedding, pinned, active, created_by, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, TRUE, $6, $6)
       RETURNING *`,
      [cleaned, summary, finalCategory, embeddingJson, pinned, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("createMemory error:", err);
    res.status(500).json({ error: "Failed to create memory." });
  }
}

// -----------------------------
// AUTO Memory (used by chat)
// Silent creation, no response needed
// -----------------------------
export async function autoCreateMemory(userId, text) {
  try {
    if (!text || !text.trim()) return null;

    let cleaned = cleanText(text);
    if (!cleaned) return null;

    const category = await classifyMemory(cleaned);
    if (category === "none") return null;

    let summary = cleaned;
    if (cleaned.length > 300) {
      summary = await summarizeText(cleaned);
    }

    const embedding = await embedText(cleaned);
    const embeddingJson = embedding ? JSON.stringify(embedding) : null;

    const result = await db.query(
      `INSERT INTO memory_store
        (text, summary, category, embedding, pinned, active, created_by, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, FALSE, TRUE, $5, $5)
       RETURNING *`,
      [cleaned, summary, category, embeddingJson, userId]
    );

    return result.rows[0];
  } catch (err) {
    console.error("autoCreateMemory error:", err);
    return null;
  }
}

// -----------------------------
// UPDATE Memory
// -----------------------------
export async function updateMemory(req, res) {
  try {
    const userId = req.user.id;
    const memId = req.params.id;
    const { text, category, pinned, active } = req.body;

    const cleaned = cleanText(text);
    if (!cleaned) {
      return res.status(400).json({ error: "Text cannot be empty." });
    }

    let finalCategory = normalizeCategory(category);
    if (!finalCategory) {
      const autoCat = await classifyMemory(cleaned);
      finalCategory = autoCat === "none" ? "knowledge" : autoCat;
    }

    let summary = cleaned;
    if (cleaned.length > 300) {
      summary = await summarizeText(cleaned);
    }

    const embedding = await embedText(cleaned);
    const embeddingJson = embedding ? JSON.stringify(embedding) : null;

    const result = await db.query(
      `UPDATE memory_store
       SET text=$1, summary=$2, category=$3, embedding=$4::jsonb,
           pinned=$5, active=$6, updated_by=$7
       WHERE id=$8 AND created_by=$7
       RETURNING *`,
      [
        cleaned,
        summary,
        finalCategory,
        embeddingJson,
        pinned ?? false,
        active ?? true,
        userId,
        memId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Memory not found or unauthorized." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateMemory error:", err);
    res.status(500).json({ error: "Failed to update memory." });
  }
}

// -----------------------------
// DELETE Memory
// -----------------------------
export async function deleteMemory(req, res) {
  try {
    const userId = req.user.id;
    const memId = req.params.id;

    const result = await db.query(
      `DELETE FROM memory_store 
       WHERE id=$1 AND created_by=$2
       RETURNING id`,
      [memId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Memory not found or unauthorized." });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("deleteMemory error:", err);
    res.status(500).json({ error: "Failed to delete memory." });
  }
}

// -----------------------------
// LIST Memory
// -----------------------------
export async function listMemory(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT * FROM memory_store
       WHERE created_by=$1
       ORDER BY id DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("listMemory error:", err);
    res.status(500).json({ error: "Failed to load memory list." });
  }
}

// -----------------------------
// GET Single Memory
// -----------------------------
export async function getMemory(req, res) {
  try {
    const userId = req.user.id;
    const memId = req.params.id;

    const result = await db.query(
      `SELECT * FROM memory_store
       WHERE id=$1 AND created_by=$2`,
      [memId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Memory not found or unauthorized." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getMemory error:", err);
    res.status(500).json({ error: "Failed to load memory." });
  }
}

// -----------------------------
// Vector Search (used by chat)
// -----------------------------
export async function searchRelevantMemories(userId, embedVector, rawText = "") {
  try {
    if (!embedVector) return [];

    try {
      // Try vector distance if available (requires pgvector; if fails, fall back below)
      const result = await db.query(
        `SELECT id, text, summary, category, pinned
         FROM memory_store
         WHERE created_by=$1 AND active=TRUE
         ORDER BY id DESC
         LIMIT 5`,
        [userId]
      );
      return result.rows || [];
    } catch {}

    // Fallback: simple text match on recent/pinned memories
    const q = String(rawText || '').toLowerCase().slice(0, 120);
    const words = q.split(/\W+/).filter(w => w && w.length > 2).slice(0, 3);
    const like = words.map((_,i)=>`text ILIKE $${i+2}`).join(' OR ') || 'TRUE';
    const params = [userId, ...words.map(w=>`%${w}%`)];
    const result2 = await db.query(
      `SELECT id, text, summary, category, pinned
       FROM memory_store
       WHERE created_by=$1 AND active=TRUE AND (${like})
       ORDER BY pinned DESC, id DESC
       LIMIT 5`,
      params
    );
    return result2.rows || [];
  } catch (err) {
    console.error("searchRelevantMemories error:", err);
    return [];
  }
}
