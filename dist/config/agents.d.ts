/**
 * Agent Definitions for Multi-Agent Stock Analysis System
 *
 * 10 Specialized Agents:
 * - 3 Technical Analysis Agents
 * - 4 Fundamental Analysis Agents (Investment Committee)
 * - 3 Trading/Risk Agents
 * - 1 Synthesizer Agent (CIO)
 */
export interface AgentDefinition {
    id: string;
    name: string;
    description: string;
    role: 'technical' | 'fundamental' | 'trading' | 'synthesizer';
    systemPrompt: string;
    model?: 'sonnet' | 'haiku' | 'opus';
}
/**
 * All agent definitions
 */
export declare function getAgentDefinitions(market?: 'US' | 'INDIA'): AgentDefinition[];
/**
 * Get agents by role
 */
export declare function getAgentsByRole(role: AgentDefinition['role'], market?: 'US' | 'INDIA'): AgentDefinition[];
/**
 * Get agent by ID
 */
export declare function getAgentById(id: string, market?: 'US' | 'INDIA'): AgentDefinition | undefined;
//# sourceMappingURL=agents.d.ts.map