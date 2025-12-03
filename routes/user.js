import express from "express";
import { avatarUpload } from "../middleware/avatarUpload.js";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Upload avatar
router.post("/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    await db.query(
      `UPDATE users SET avatar = $1, avatar_mime = $2 WHERE id = $3`,
      [req.file.buffer, req.file.mimetype, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

// Serve avatar
router.get("/avatar/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT avatar, avatar_mime FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rows.length || !result.rows[0].avatar) {
      return res.status(404).send("No avatar");
    }

    res.set("Content-Type", result.rows[0].avatar_mime);
    res.send(result.rows[0].avatar);
  } catch (err) {
    console.error("Avatar fetch failed:", err);
    res.status(500).send("Error fetching avatar");
  }
});

export default router;
