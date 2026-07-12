"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalystRecommendations = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const FinnhubInputSchema = zod_1.z.object({
    symbol: zod_1.z.string().describe("The stock ticker symbol of the company (e.g., AAPL)."),
});
exports.getAnalystRecommendations = (0, tools_1.tool)(async ({ symbol }) => {
    console.log(`[Tool] Fetching analyst ratings for ${symbol}...`);
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        throw new Error("FINNHUB_API_KEY is not configured.");
    }
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${apiKey}`);
        const data = await response.json();
        if (!data || data.length === 0) {
            return `No analyst rating data found for ${symbol}.`;
        }
        const latestRatings = data[0];
        return JSON.stringify({
            period: latestRatings.period,
            strongBuy: latestRatings.strongBuy,
            buy: latestRatings.buy,
            hold: latestRatings.hold,
            sell: latestRatings.sell,
            strongSell: latestRatings.strongSell,
        });
    }
    catch (error) {
        return `Error fetching analyst ratings: ${error.message}`;
    }
}, {
    name: "get_analyst_recommendations",
    description: "Fetches the latest Wall Street analyst ratings (Buy/Hold/Sell counts) for a stock symbol.",
    schema: FinnhubInputSchema,
});
