import express from "express";
import { chatResponse } from "../controllers/chatController.js";
import { requireAuth } from "../utils/authMiddleware.js";

const router = express.Router();

// Main chat endpoint
router.post("/send", requireAuth, chatResponse);

export default router;
