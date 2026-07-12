"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionNode = exports.synthesisNode = exports.newsNode = exports.analystNode = exports.financialsNode = exports.inputNode = void 0;
const google_genai_1 = require("@langchain/google-genai");
const alphaVantage_1 = require("../tools/alphaVantage");
const finnhub_1 = require("../tools/finnhub");
const tavily_1 = require("../tools/tavily");
const zod_1 = require("zod");
const llm = new google_genai_1.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
});
const inputNode = async (state) => {
    console.log(`[Node] Input Node running for: ${state.companyName}`);
    const response = await llm.invoke([
        ["system", "You are a helpful financial assistant. The user will give you a company name. You must respond with ONLY the stock ticker symbol in uppercase. If you do not know it, respond with 'UNKNOWN'."],
        ["human", `What is the stock ticker for: ${state.companyName}?`]
    ]);
    const ticker = response.content.toString().trim().replace(/[^A-Z]/g, "");
    return {
        ticker,
        logs: [`Resolved company "${state.companyName}" to ticker: ${ticker}`]
    };
};
exports.inputNode = inputNode;
const financialsNode = async (state) => {
    console.log(`[Node] Financials Node running for: ${state.ticker}`);
    if (state.ticker === "UNKNOWN" || !state.ticker) {
        return { financialData: "No ticker available to fetch financials.", logs: ["Skipped financials (No ticker)."] };
    }
    const financialData = await alphaVantage_1.getFinancialFundamentals.invoke({ symbol: state.ticker });
    return {
        financialData,
        logs: [`Fetched financial fundamentals for ${state.ticker}`]
    };
};
exports.financialsNode = financialsNode;
const analystNode = async (state) => {
    console.log(`[Node] Analyst Node running for: ${state.ticker}`);
    if (state.ticker === "UNKNOWN" || !state.ticker) {
        return { analystData: "No ticker available to fetch analyst data.", logs: ["Skipped analyst data (No ticker)."] };
    }
    const analystData = await finnhub_1.getAnalystRecommendations.invoke({ symbol: state.ticker });
    return {
        analystData,
        logs: [`Fetched analyst recommendations for ${state.ticker}`]
    };
};
exports.analystNode = analystNode;
const newsNode = async (state) => {
    console.log(`[Node] News Node running for: ${state.companyName}`);
    const query = `Recent news, controversies, and general sentiment regarding ${state.companyName} stock`;
    const newsData = await tavily_1.getRecentNews.invoke({ query });
    return {
        newsData,
        logs: [`Searched recent news and sentiment for ${state.companyName}`]
    };
};
exports.newsNode = newsNode;
const synthesisNode = async (state) => {
    console.log(`[Node] Synthesis Node running...`);
    const prompt = `
    You are an expert financial analyst. Synthesize the following raw data about ${state.companyName} (${state.ticker}) 
    into a cohesive, 3-5 sentence plain-English summary of the company's current status.
    
    FINANCIALS:
    ${state.financialData}
    
    ANALYST RATINGS:
    ${state.analystData}
    
    RECENT NEWS:
    ${state.newsData}
  `;
    const response = await llm.invoke(prompt);
    return {
        synthesis: response.content.toString(),
        logs: ["Synthesized all data into a cohesive summary."]
    };
};
exports.synthesisNode = synthesisNode;
const decisionNode = async (state) => {
    console.log(`[Node] Decision Node running...`);
    const decisionSchema = zod_1.z.object({
        verdict: zod_1.z.enum(["INVEST", "PASS"]).describe("The final verdict."),
        confidence: zod_1.z.number().min(0).max(100).describe("Confidence percentage from 0 to 100."),
        financialScore: zod_1.z.number().min(0).max(10).describe("Score out of 10 for Financial Health (30% weight)."),
        growthScore: zod_1.z.number().min(0).max(10).describe("Score out of 10 for Growth Trajectory (25% weight)."),
        newsScore: zod_1.z.number().min(0).max(10).describe("Score out of 10 for News/Sentiment (20% weight)."),
        valuationScore: zod_1.z.number().min(0).max(10).describe("Score out of 10 for Valuation vs Peers (25% weight)."),
        reasoning: zod_1.z.string().describe("A 1-2 sentence justification for the final verdict based on the sub-scores."),
    });
    const structuredLlm = llm.withStructuredOutput(decisionSchema);
    const prompt = `
    Based on the following data for ${state.companyName} (${state.ticker}), make a final INVEST or PASS decision.
    
    Data Summary:
    ${state.synthesis}
    
    Apply this explicit weighted scoring rubric:
    - Financial health: 30%
    - Growth trajectory: 25%
    - News/sentiment: 20%
    - Valuation vs peers: 25%
    
    Evaluate each category out of 10, then determine the final verdict.
  `;
    const finalDecision = await structuredLlm.invoke(prompt);
    return {
        finalDecision: finalDecision,
        logs: [`Final decision reached: ${finalDecision.verdict} with ${finalDecision.confidence}% confidence.`]
    };
};
exports.decisionNode = decisionNode;
