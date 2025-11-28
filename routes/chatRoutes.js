import express from "express";
import { requireAuth } from "../utils/authMiddleware.js";
import { chatResponse, startSession, listSessions, listMessages, clearSession, deleteSession } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", requireAuth, chatResponse);
router.post("/start", requireAuth, startSession);
router.get("/sessions", requireAuth, listSessions);
router.get("/sessions/:id/messages", requireAuth, listMessages);
router.delete("/clear", requireAuth, clearSession);
router.delete("/sessions/:id", requireAuth, deleteSession);

export default router;
