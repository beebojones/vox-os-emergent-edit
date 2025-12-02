import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import db from "./utils/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Import routes ---
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";

import { requireAuth } from "./utils/authMiddleware.js";
import { updateProfilePhoto } from "./controllers/authController.js";

// ----------------------------------------------
// EXPRESS APP
// ----------------------------------------------
const app = express();

// ⭐ MUST COME FIRST FOR RAILWAY HTTPS COOKIE SUPPORT
app.set("trust proxy", 1);

// ⭐ CORS CONFIG — ALLOWS COOKIES + AUTH
app.use(cors({
  origin: true,
  credentials: true
}));

// BODY + COOKIE PARSERS
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

// STATIC FILES (Memory OS, login, register, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------------------------
// ROUTES
// ----------------------------------------------

// Auth routes (login, register, validate, logout, etc.)
app.use("/auth", authRoutes);

// Explicit route for profile photo upload
app.post("/auth/profile-photo", requireAuth, updateProfilePhoto);

// Chat history and sessions
app.use("/chat", chatRoutes);

// Memory routes (serves both / and /api automatically)
app.use("/", memoryRoutes);
app.use("/api", memoryRoutes);

// Landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Fallback route (404)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ----------------------------------------------
// GLOBAL ERROR HANDLER
// ----------------------------------------------
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ----------------------------------------------
// STARTUP MIGRATIONS
// ----------------------------------------------
async function runStartupMigrations() {
  try {
    // Remove legacy PIN column if present
    await db.query("ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS pin_hash");

    // Add profile photo + preferences if missing
    await db.query(`
      ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS profile_photo TEXT,
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb
    `);

    // Chat sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Chat message table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

  } catch (e) {
    console.warn("Startup migration warning:", e?.message || e);
  }
}

// ----------------------------------------------
// START SERVER
// ----------------------------------------------
const PORT = process.env.PORT || 8080;

(async () => {
  await runStartupMigrations();
  app.listen(PORT, () => {
    console.log(`Vox Assistant server running on port ${PORT}`);
  });
})();
