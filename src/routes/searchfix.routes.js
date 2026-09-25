import { Router } from "express";
import multer from "multer";
import os from "os";
import { analyzeCommentsController, analyzeDocumentsController, analyzeFullOrder } from "../controllers/searchfix.controller.js";

const router = Router();

const upload = multer({
    dest: os.tmpdir(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB max file size
        files: 6,
        fieldSize: 1024 * 1024
    }
});

/**
 * STEP 1 ENDPOINT:
 * POST /api/searchfix/analyze-comments
 * Receives order comments from Chrome Extension (JSON body).
 * Returns issue classification, required document types, and status: "AWAITING_DOCUMENTS".
 */
router.post("/analyze-comments", analyzeCommentsController);

/**
 * STEP 2 ENDPOINT:
 * POST /api/searchfix/analyze-documents
 * Receives uploaded PDF files downloaded by Chrome Extension (multipart/form-data).
 * Analyzes PDFs via Gemini Files API, extracts evidence, and returns ACCEPTED / DISPUTED / REVIEW_REQUIRED decision.
 */
router.post("/analyze-documents", upload.any(), analyzeDocumentsController);

/**
 * UNIFIED ENDPOINT:
 * POST /api/searchfix/analyze
 * Supports both Step 1 (JSON) and Step 2 (multipart upload) dynamically.
 */
router.post("/analyze", upload.any(), analyzeFullOrder);

export default router;
