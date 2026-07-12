"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const graph_1 = require("./agent/graph");
// Load environment variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS so our React frontend (running on port 5173 or 3000) can talk to this backend
app.use((0, cors_1.default)({
    origin: "*", // In production, replace with specific origins for safety
}));
app.use(express_1.default.json());
// Simple in-memory cache to save API quota on free tiers (10 minute TTL)
const researchCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
/**
 * STREAMING EXPRESS ENDPOINT
 *
 * This is a standard Node.js Express endpoint.
 * Instead of returning a normal JSON response at the end, we immediately send headers
 * telling the client that this is an Event Stream (SSE).
 * We write chunks to the response object using `res.write()` and call `res.end()` only when done.
 */
app.post("/api/research", async (req, res) => {
    const { companyName } = req.body;
    if (!companyName || typeof companyName !== "string") {
        res.status(400).json({ error: "Company name is required." });
        return;
    }
    // Setup streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const cacheKey = companyName.toLowerCase().trim();
    const cachedData = researchCache.get(cacheKey);
    // Check cache hit
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log(`[Cache] Serving cached data for: ${companyName}`);
        res.write(JSON.stringify({
            type: "log",
            message: "Serving cached research (Data is less than 10 minutes old)..."
        }) + "\n");
        // Tiny delay for visual transition on frontend
        await new Promise((resolve) => setTimeout(resolve, 500));
        res.write(JSON.stringify({
            type: "result",
            data: cachedData.result
        }) + "\n");
        res.end();
        return;
    }
    try {
        console.log(`[Agent] Initializing search for: ${companyName}`);
        // We stream the graph execution using LangGraph's native stream function
        const eventStream = await graph_1.agentGraph.stream({ companyName }, { streamMode: "updates" });
        let finalState = null;
        for await (const update of eventStream) {
            const nodeName = Object.keys(update)[0];
            if (!nodeName)
                continue;
            const nodeOutput = update[nodeName];
            // Send the latest log down the HTTP stream
            if (nodeOutput.logs && nodeOutput.logs.length > 0) {
                const latestLog = nodeOutput.logs[nodeOutput.logs.length - 1];
                res.write(JSON.stringify({ type: "log", message: latestLog }) + "\n");
            }
            // Merge the outputs to construct the final cumulative state
            finalState = { ...finalState, ...nodeOutput };
        }
        if (finalState) {
            // Store in memory cache
            researchCache.set(cacheKey, {
                timestamp: Date.now(),
                result: finalState,
            });
            // Stream the final resulting state back to the UI
            res.write(JSON.stringify({ type: "result", data: finalState }) + "\n");
        }
        else {
            throw new Error("Agent finished but returned no state.");
        }
        res.end();
    }
    catch (error) {
        console.error("[Backend Error]", error);
        res.write(JSON.stringify({
            type: "error",
            message: error.message || "An error occurred during agent execution."
        }) + "\n");
        res.end();
    }
});
// Basic Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
app.listen(PORT, () => {
    console.log(`[Server] Express Backend running on http://localhost:${PORT}`);
});
