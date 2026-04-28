import type { AgentCapabilityReport, AgentHandler, AgentMessage, AgentResponse } from './types.js';
export declare class AgentMesh {
    private readonly agents;
    /**
     * Register an agent with its capability report and handler function.
     * The handler receives a message envelope and must return a response envelope.
     */
    register(report: AgentCapabilityReport, handler: AgentHandler): void;
    /** Return all registered capability reports. */
    listAgents(): AgentCapabilityReport[];
    /** Look up a single capability report by id. */
    getCapability(agentId: string): AgentCapabilityReport | undefined;
    /**
     * Route a message through the mesh.
     *
     * Flow:
     *   1. If toAgent is 'router', the scout classifies and picks a specialist.
     *   2. The specialist handles the message.
     *   3. If the specialist returns a handoffTo, that agent is called next.
     *   4. If the final responding agent is not 'master' and a master is registered,
     *      the master synthesizes before returning (only when multiple handoffs occurred).
     */
    route(message: AgentMessage): Promise<AgentResponse>;
    /**
     * Broadcast a message to all agents that support its task type,
     * collect all responses, and return them ranked by confidence descending.
     */
    broadcast(message: AgentMessage): Promise<AgentResponse[]>;
    /** Invoke a specific agent by id. Throws if agent is not registered. */
    invoke(agentId: string, message: AgentMessage): Promise<AgentResponse>;
    private findByTier;
    private pickSpecialist;
    private parseTaskFromScoutResponse;
    private resolveHandoffTaskType;
}
//# sourceMappingURL=protocol.d.ts.map