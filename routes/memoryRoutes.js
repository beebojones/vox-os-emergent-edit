import express from "express";
import {
  createMemory,
  updateMemory,
  deleteMemory,
  listMemory,
  getMemory
} from "../controllers/memoryController.js";
import { requireAuth } from "../utils/authMiddleware.js";

const router = express.Router();

// Create a memory (manual memory creation)
router.post("/memory", requireAuth, createMemory);

// Update an existing memory
router.put("/memory/:id", requireAuth, updateMemory);

// Delete a memory
router.delete("/memory/:id", requireAuth, deleteMemory);

// List all memories for the authenticated user
router.get("/memory", requireAuth, listMemory);

// Get a single memory
router.get("/memory/:id", requireAuth, getMemory);

export default router;
