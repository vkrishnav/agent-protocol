import type { AgentCapabilityReport, AgentMessage, ConversationTurn, RoutingDecision } from './types.js';
/**
 * Stateless router — analyzes a raw user message and a set of capability
 * reports and returns a routing decision without calling any agent.
 * The AgentMesh can call this before dispatching.
 */
export declare class Router {
    private readonly capabilities;
    constructor(capabilities: AgentCapabilityReport[]);
    /**
     * Produce a routing decision for a raw user utterance.
     * Uses lexical heuristics; swap with a real scout call in production.
     */
    decide(userMessage: string, conversationId: string, history?: ConversationTurn[]): {
        decision: RoutingDecision;
        envelope: AgentMessage;
    };
    private extractSignals;
    private inferTaskType;
    private selectAgent;
}
//# sourceMappingURL=router.d.ts.map