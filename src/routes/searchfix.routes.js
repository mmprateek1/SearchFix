import { Router } from "express";
import { analyzeSearchFix } from "../controllers/searchfix.controller.js";

const router = Router();

/**
 * POST /api/searchfix/analyze
 * Main entry point for Chrome Extension to analyze SearchFix order comments.
 */
router.post("/analyze", analyzeSearchFix);

export default router;
