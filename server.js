import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";          // ⭐ Added CORS
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

// --- Express app setup ---
const app = express();

// ⭐ CORS so Vox OS frontend (served from file://) can hit Railway backend
app.use(
  cors({
    origin: "*",   // allows file://, Chrome apps, local files, anything
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true
  })
);

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

// --- Serve static frontend ---
app.use(express.static(path.join(__dirname, "public")));

// --- Routes ---
app.use("/auth", authRoutes);
app.post("/auth/profile-photo", requireAuth, updateProfilePhoto);
app.use("/chat", chatRoutes);

// Allow both /memory/* and /api/memories
app.use("/", memoryRoutes);
app.use("/api", memoryRoutes);

// --- Default landing page ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Fallback for unknown routes ---
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- Error handler ---
app.use((err, req, res, next) => {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;

async function runStartupMigrations() {
  try {
    // Remove legacy PIN column if present
    await db.query("ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS pin_hash");

    // Add new fields if missing
    await db.query(
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS profile_photo TEXT"
    );
    await db.query(
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb"
    );

    // Chat tables (sessions + messages)
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

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

(async () => {
  await runStartupMigrations();
  app.listen(PORT, () => {
    console.log(`Vox Assistant server running on port ${PORT}`);
  });
})();
