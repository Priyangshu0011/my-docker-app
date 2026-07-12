"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentGraph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("./state");
const nodes_1 = require("./nodes");
const graphBuilder = new langgraph_1.StateGraph(state_1.AgentState)
    .addNode("input", nodes_1.inputNode)
    .addNode("financials", nodes_1.financialsNode)
    .addNode("analyst", nodes_1.analystNode)
    .addNode("news", nodes_1.newsNode)
    .addNode("synthesisStep", nodes_1.synthesisNode)
    .addNode("decision", nodes_1.decisionNode)
    .addEdge(langgraph_1.START, "input")
    .addEdge("input", "financials")
    .addEdge("financials", "analyst")
    .addEdge("analyst", "news")
    .addEdge("news", "synthesisStep")
    .addEdge("synthesisStep", "decision")
    .addEdge("decision", langgraph_1.END);
exports.agentGraph = graphBuilder.compile();
