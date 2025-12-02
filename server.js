import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

import db from "./utils/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";

// Middleware
import { requireAuth } from "./utils/authMiddleware.js";
import { updateProfilePhoto } from "./controllers/authController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

// -----------------------------------------------------------
// Serve static front-end (limited caching to avoid stale assets during updates)
// -----------------------------------------------------------
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (filePath.match(/\.(css|js|svg|png|jpg|jpeg|gif|woff2?)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    }
  }
}));


// -----------------------------------------------------------
// PUBLIC AUTH ROUTES
// -----------------------------------------------------------
app.use("/auth", authRoutes);

// Profile photo
app.post("/auth/profile-photo", requireAuth, updateProfilePhoto);


// -----------------------------------------------------------
// PROTECTED API ROUTES
// -----------------------------------------------------------
app.use("/chat", requireAuth, chatRoutes);

// Memory routes available both as "/api/memories" and "/memories"
app.use("/api", requireAuth, memoryRoutes);
app.use("/", requireAuth, memoryRoutes);


// -----------------------------------------------------------
// HOME ROUTE (dashboard) — PROTECTED
// -----------------------------------------------------------
app.get(["/", "/index.html"], requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Explicit chat endpoints to avoid routing confusion
app.post('/chat', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.chatResponse(req,res,next)));
app.post('/chat/send', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.chatResponse(req,res,next)));
app.post('/chat/start', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.startSession(req,res,next)));
app.delete('/chat/clear', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.clearSession(req,res,next)));
app.get('/chat/sessions', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.listSessions(req,res,next)));
app.get('/chat/messages/:sessionId', requireAuth, (req, res, next) => import('./controllers/chatController.js').then(m => m.listMessages(req,res,next)));

// Simple web search endpoint (DuckDuckGo Instant Answer API)
app.get('/tools/search', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q required' });
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`);
    const data = await r.json();
    const items = [];
    if (data.AbstractText) items.push({ source: data.AbstractSource || 'DuckDuckGo', text: data.AbstractText });
    if (Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics.slice(0, 5)) {
        if (t && (t.Text || (t.FirstURL && t.FirstURL.length))) items.push({ source: 'web', text: t.Text || t.FirstURL });
      }
    }
    res.json({ query: q, items });
  } catch (e) {
    res.status(500).json({ error: 'search failed' });
  }
});


// -----------------------------------------------------------
// LOGIN & REGISTER ALWAYS PUBLIC
// -----------------------------------------------------------
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});


// -----------------------------------------------------------
// FALLBACK 404 for unknown routes
// -----------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});


// -----------------------------------------------------------
// ERROR HANDLER
// -----------------------------------------------------------
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
});


// -----------------------------------------------------------
// DB MIGRATIONS AT STARTUP
// -----------------------------------------------------------
async function runStartupMigrations() {
    try {
        await db.query("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS profile_photo TEXT");
        await db.query("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb");

        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
        );`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)`);

        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user','assistant')),
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
        );`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`);

        // memory_store (for long-term memories)
        await db.query(`
          CREATE TABLE IF NOT EXISTS memory_store (
            id SERIAL PRIMARY KEY,
            text TEXT NOT NULL,
            summary TEXT,
            category TEXT,
            embedding JSONB,           -- store embedding as JSON until pgvector is available
            pinned BOOLEAN DEFAULT FALSE,
            active BOOLEAN DEFAULT TRUE,
            created_by INTEGER NOT NULL,
            updated_by INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_memory_store_user ON memory_store(created_by)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_memory_store_category ON memory_store(category)`);
    } catch (e) {
        console.warn("Startup migration warning:", e?.message || e);
    }
}


// -----------------------------------------------------------
// START SERVER
// -----------------------------------------------------------
const PORT = process.env.PORT || 8080;

(async () => {
    await runStartupMigrations();
    app.listen(PORT, () => {
        console.log(`Vox Assistant server running on port ${PORT}`);
    });
})();
