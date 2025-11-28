import express from "express";
import {
  registerUser,
  loginUser,
  updateDisplayName,
  updateUsername,
  updatePassword,
  adminLogin,
  adminEnabled,
  listUsers,
  setRole,
  updatePreferences,
  updateProfilePhoto
} from "../controllers/authController.js";

import { requireAuth, requireAdmin } from "../utils/authMiddleware.js";

const router = express.Router();

// Public routes (no login required)
router.post("/register", registerUser);
router.post("/login", loginUser);
// PIN endpoints removed
router.post("/admin-login", adminLogin);
router.get("/admin-login", (req, res) => res.status(405).json({ error: "Use POST for /auth/admin-login" }));
router.get("/admin-enabled", adminEnabled);

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Auth check
router.get("/validate", requireAuth, async (req, res) => {
  // Data already hydrated from DB in requireAuth; do not requery or special-case admin.
  res.set('Cache-Control', 'no-store');
  return res.json({ user: req.user });
});

// Protected routes
router.post("/update-display-name", requireAuth, updateDisplayName);
router.post("/update-username", requireAuth, updateUsername);
router.post("/update-password", requireAuth, updatePassword);
router.post('/preferences', requireAuth, updatePreferences);
router.post('/profile-photo', requireAuth, updateProfilePhoto);

// Admin: promote a user to admin
router.post("/make-admin", requireAuth, requireAdmin, async (req, res, next) => {
  const { makeAdmin } = await import("../controllers/authController.js");
  return makeAdmin(req, res, next);
});

// Admin user management
router.get('/users', requireAuth, requireAdmin, listUsers);
router.post('/set-role', requireAuth, requireAdmin, setRole);

export default router;
