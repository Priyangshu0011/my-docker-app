"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentState = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.AgentState = langgraph_1.Annotation.Root({
    companyName: (0, langgraph_1.Annotation)(),
    ticker: (0, langgraph_1.Annotation)(),
    financialData: (0, langgraph_1.Annotation)(),
    analystData: (0, langgraph_1.Annotation)(),
    newsData: (0, langgraph_1.Annotation)(),
    synthesis: (0, langgraph_1.Annotation)(),
    finalDecision: (0, langgraph_1.Annotation)(),
    logs: (0, langgraph_1.Annotation)({
        reducer: (currentState, newLogs) => currentState.concat(newLogs),
        default: () => [],
    }),
});
