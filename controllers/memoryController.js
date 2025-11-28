import db from "../utils/db.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: discover memory_store columns at runtime (tolerate schema drift)
async function getMemoryStoreColumns() {
    try {
        const { rows } = await db.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name='memory_store'`);
        const names = new Set(rows.map(r => r.column_name));
        const pick = (...candidates) => candidates.find(c => names.has(c));
        const textCol = pick('text', 'content', 'body', 'note');
        const tsCol = pick('timestamp', 'created_at', 'createdAt', 'ts');
        const createdByCol = pick('created_by', 'user_id', 'owner_id');
        const activeCol = pick('active', 'enabled');
        const embCol = pick('embedding', 'embedding_text', 'embed');
        return { textCol, tsCol, createdByCol, activeCol, embCol, hasTable: true };
    } catch (e) {
        // Table may not exist
        return { hasTable: false };
    }
}

// Ensure timestamps are ISO 8601 for reliable browser parsing
function toIsoTimestamp(value) {
    try {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d.toISOString();

        const s = String(value).replace(" ", "T");
        const d2 = new Date(s.endsWith("Z") ? s : s + "Z");
        if (!Number.isNaN(d2.getTime())) return d2.toISOString();
    } catch {}
    return null;
}

// Convert DB rows into frontend format (supports both memories and memory_store)
function normalize(row) {
    const text = row.content ?? row.text ?? row.summary ?? "";
    const rawTs = row.created_at ?? row.timestamp ?? null;
    const iso = toIsoTimestamp(rawTs);
    return {
        id: row.id,
        text,
        timestamp: iso ?? rawTs,
        embedding: row.embedding_text ?? null
    };
}

// ------------------------------------------------------------
// Get all memories (memory_store only)
// ------------------------------------------------------------
export async function getMemories(req, res) {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const scope = (req.query.scope || '').toLowerCase();
        const wantAll = scope === 'all' || scope === 'admin';

        const cols = await getMemoryStoreColumns();
        if (!cols.hasTable) return res.json([]);

        const textCol = cols.textCol || 'text';
        const tsCol = cols.tsCol || 'timestamp';
        const createdByCol = cols.createdByCol; // may be undefined
        const activeCol = cols.activeCol;       // may be undefined
        const embCol = cols.embCol;             // may be undefined

        const embSelect = embCol ? (embCol === 'embedding' ? `${embCol}::text` : embCol) : `NULL::text`;

        let sql, params;
        if (isAdmin && wantAll) {
            sql = `SELECT id, ${textCol} AS content, ${tsCol} AS created_at, ${createdByCol ?? 'NULL'} AS user_id, ${embSelect} AS embedding_text
                   FROM memory_store
                   ORDER BY ${tsCol} DESC NULLS LAST`;
            params = [];
        } else if (createdByCol) {
            sql = `SELECT id, ${textCol} AS content, ${tsCol} AS created_at, ${createdByCol} AS user_id, ${embSelect} AS embedding_text
                   FROM memory_store
                   WHERE (${createdByCol} = $1 OR ${createdByCol} IS NULL)
                   ORDER BY ${tsCol} DESC NULLS LAST`;
            params = [userId];
        } else {
            // No created_by column; show all rows to non-admin as well (best-effort)
            sql = `SELECT id, ${textCol} AS content, ${tsCol} AS created_at, NULL AS user_id, ${embSelect} AS embedding_text
                   FROM memory_store
                   ORDER BY ${tsCol} DESC NULLS LAST`;
            params = [];
        }

        const result = await db.query(sql, params);
        res.json(result.rows.map(normalize));
    } catch (err) {
        console.error("getMemories error:", err);
        res.status(500).json({ error: "Failed to load memories" });
    }
}

// ------------------------------------------------------------
// Shared: add a memory row for user (memory_store only)
// ------------------------------------------------------------
export async function addMemoryText(userId, text, isAdmin = false) {
    // Insert into memory_store
    let msRow = null;
    try {
        // Resolve created_by for admin tokens (which might not have a users row)
        let createdBy = userId;
        if (isAdmin) {
            const chk = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
            if (chk.rowCount === 0) {
                const fb = await db.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
                createdBy = fb.rows[0]?.id ?? null;
            }
        }

        const ms = await db.query(
            `INSERT INTO memory_store (text, summary, embedding, category, pinned, active, timestamp, created_by, updated_by)
             VALUES ($1, NULL, NULL, NULL, false, true, NOW(), $2, $2)
             RETURNING id, text, timestamp, created_by`,
            [text, createdBy]
        );
        msRow = ms.rows[0];

        // Auto-generate embedding if API key available (non-blocking if it fails)
        if (openai?.apiKey) {
            try {
                const emb = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: text
                });
                const vec = emb.data?.[0]?.embedding;
                if (Array.isArray(vec) && vec.length) {
                    const literal = `[${vec.join(',')}]`;
                    await db.query(
                        `UPDATE memory_store SET embedding = $1::vector WHERE id = $2`,
                        [literal, msRow.id]
                    );
                }
            } catch (embErr) {
                console.warn('embedding generation skipped:', embErr?.message || embErr);
            }
        }
    } catch (e) {
        console.error('memory_store insert failed:', e?.message || e);
        throw e;
    }

    return normalize(msRow);
}

// ------------------------------------------------------------
// Create a memory
// ------------------------------------------------------------
export async function createMemory(req, res) {
    try {
        const userId = req.user.id;
        const { text } = req.body;

        if (!text || text.trim() === "") {
            return res.status(400).json({ error: "Content cannot be empty" });
        }

        const created = await addMemoryText(userId, text, req.user?.role === 'admin');
        res.status(201).json(created);
    } catch (err) {
        console.error("createMemory error:", err);
        res.status(500).json({ error: "Failed to create memory" });
    }
}

// ------------------------------------------------------------
// Update memory (memory_store only)
// ------------------------------------------------------------
export async function updateMemory(req, res) {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const memoryId = req.params.id;
        const { text } = req.body;

        const sql = isAdmin
          ? `UPDATE memory_store SET text = $1, updated_by = $2 WHERE id = $3 RETURNING id, text AS content, timestamp AS created_at, created_by AS user_id, embedding::text AS embedding_text`
          : `UPDATE memory_store SET text = $1, updated_by = $2 WHERE id = $3 AND (created_by = $2 OR created_by IS NULL) RETURNING id, text AS content, timestamp AS created_at, created_by AS user_id, embedding::text AS embedding_text`;
        const params = [text, userId, memoryId];
        const result = await db.query(sql, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Memory not found" });
        }

        res.json(normalize(result.rows[0]));
    } catch (err) {
        console.error("updateMemory error:", err);
        res.status(500).json({ error: "Failed to update memory" });
    }
}

// ------------------------------------------------------------
// Delete memory (memory_store only)
// ------------------------------------------------------------
export async function deleteMemory(req, res) {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const memoryId = req.params.id;

        const sql = isAdmin
          ? `DELETE FROM memory_store WHERE id = $1`
          : `DELETE FROM memory_store WHERE id = $1 AND (created_by = $2 OR created_by IS NULL)`;
        const params = isAdmin ? [memoryId] : [memoryId, userId];
        const result = await db.query(sql, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Memory not found" });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("deleteMemory error:", err);
        res.status(500).json({ error: "Failed to delete memory" });
    }
}

// ------------------------------------------------------------
// Delete all memories (memory_store only)
// ------------------------------------------------------------
export async function deleteAllMemories(req, res) {
    try {
        const userId = req.user.id;
        await db.query(`DELETE FROM memory_store WHERE created_by = $1`, [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error("deleteAllMemories error:", err);
        res.status(500).json({ error: "Failed to delete memories" });
    }
}

// ------------------------------------------------------------
// Admin: debug schema to discover memory table/columns
// ------------------------------------------------------------
export async function debugMemSchema(req, res) {
    try {
        const tables = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type='BASE TABLE'
              AND (table_name ILIKE '%mem%' OR table_name ILIKE '%note%' OR table_name ILIKE '%context%')
            ORDER BY table_name
        `);

        const details = [];
        for (const row of tables.rows) {
            const t = row.table_name;
            const cols = await db.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position`, [t]);
            const sample = await db.query(`SELECT * FROM ${t} ORDER BY 1 DESC LIMIT 5`);
            details.push({ table: t, columns: cols.rows, sample: sample.rows });
        }

        res.json({ tables: details });
    } catch (err) {
        console.error('debugMemSchema error:', err);
        res.status(500).json({ error: 'debug failed' });
    }
}
