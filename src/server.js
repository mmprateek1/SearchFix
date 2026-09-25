import "dotenv/config";
import express from "express";
import cors from "cors";
import searchfixRoutes from "./routes/searchfix.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for Chrome Extension integration
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Base informational endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        message: "SearchFix AI Server is running."
    });
});

// Health check endpoint for monitoring and cloud deployment checks
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK"
    });
});

// Mount SearchFix API routes
app.use("/api/searchfix", searchfixRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error("[Server Error]", err.stack || err);
    const status = err.code?.startsWith("LIMIT_") ? 413 : (err.status === 400 ? 400 : 500);
    res.status(status).json({
        error: status === 413 ? "Upload limit exceeded: at most 6 PDFs, 20 MB per file." : status === 400 ? "Invalid request body." : "SearchFix analysis failed."
    });
});

// Start Express HTTP Server bound to 0.0.0.0 for local and Render deployment
app.listen(PORT, "0.0.0.0", () => {
    console.log(`SearchFix AI Server running on port ${PORT}`);
});

export default app;
