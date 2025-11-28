import express from "express";
import { requireAuth, requireAdmin } from "../utils/authMiddleware.js";

import {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories,
  debugMemSchema
} from "../controllers/memoryController.js";

const router = express.Router();

// Uniform API paths:
// GET    /api/memories
// POST   /api/memories
// PATCH  /api/memories/:id
// DELETE /api/memories/:id
// DELETE /api/memories

router.get("/memories", requireAuth, getMemories);
router.post("/memories", requireAuth, createMemory);
router.patch("/memories/:id", requireAuth, updateMemory);
router.delete("/memories/:id", requireAuth, deleteMemory);
router.delete("/memories", requireAuth, deleteAllMemories);

// Admin debug endpoint
router.get("/memories/debug-schema", requireAuth, requireAdmin, debugMemSchema);

export default router;
