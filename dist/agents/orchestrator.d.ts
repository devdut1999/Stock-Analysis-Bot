/**
 * Multi-Agent Orchestrator
 * Coordinates 10 specialized agents to analyze stocks comprehensively
 */
import type { AggregatedStockData } from '../types/stock-data.js';
export interface AgentResponse {
    agentId: string;
    agentName: string;
    analysis: string;
    duration: number;
}
export interface MultiAgentAnalysis {
    symbol: string;
    market: 'US' | 'INDIA';
    timestamp: Date;
    technicalPanel: AgentResponse[];
    fundamentalPanel: AgentResponse[];
    tradingPanel: AgentResponse[];
    synthesis: AgentResponse;
    totalDuration: number;
}
/**
 * Orchestrate multi-agent analysis
 */
export declare function orchestrateAnalysis(marketData: AggregatedStockData): Promise<MultiAgentAnalysis>;
/**
 * Format multi-agent analysis as text report
 */
export declare function formatAnalysisReport(analysis: MultiAgentAnalysis): string;
//# sourceMappingURL=orchestrator.d.ts.map