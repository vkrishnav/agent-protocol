import { v4 as uuidv4 } from 'uuid';
export class AgentMesh {
    agents = new Map();
    /**
     * Register an agent with its capability report and handler function.
     * The handler receives a message envelope and must return a response envelope.
     */
    register(report, handler) {
        if (this.agents.has(report.id)) {
            throw new Error(`Agent already registered: ${report.id}`);
        }
        this.agents.set(report.id, { report, handler });
    }
    /** Return all registered capability reports. */
    listAgents() {
        return [...this.agents.values()].map((a) => a.report);
    }
    /** Look up a single capability report by id. */
    getCapability(agentId) {
        return this.agents.get(agentId)?.report;
    }
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
    async route(message) {
        let current = message;
        let response = null;
        const handoffChain = [];
        const MAX_HOPS = 5;
        // If explicitly addressed, skip routing logic
        if (current.toAgent !== 'router') {
            return this.invoke(current.toAgent, current);
        }
        // Scout classifies first
        const scoutAgent = this.findByTier('scout');
        if (scoutAgent) {
            const classifyMsg = {
                ...current,
                messageId: uuidv4(),
                toAgent: scoutAgent.report.id,
                taskType: 'classify',
            };
            const scoutResponse = await this.invoke(scoutAgent.report.id, classifyMsg);
            const detectedTask = this.parseTaskFromScoutResponse(scoutResponse.content);
            current = { ...current, taskType: detectedTask };
        }
        // Pick best specialist for the detected task
        const specialist = this.pickSpecialist(current.taskType);
        if (!specialist) {
            throw new Error(`No agent registered for task type: ${current.taskType}`);
        }
        current = { ...current, toAgent: specialist.report.id };
        handoffChain.push(specialist.report.id);
        for (let hop = 0; hop < MAX_HOPS; hop++) {
            response = await this.invoke(current.toAgent, current);
            if (!response.handoffTo)
                break;
            const nextId = response.handoffTo;
            if (handoffChain.includes(nextId))
                break; // prevent cycles
            handoffChain.push(nextId);
            current = {
                ...current,
                messageId: uuidv4(),
                fromAgent: current.toAgent,
                toAgent: nextId,
                payload: response.content, // pass the output forward as new payload
                taskType: this.resolveHandoffTaskType(nextId),
            };
        }
        if (!response)
            throw new Error('Mesh produced no response');
        // If there were multiple hops AND a master is registered, synthesize
        if (handoffChain.length > 1) {
            const master = this.agents.get('master');
            if (master && current.toAgent !== 'master') {
                const synthesisMsg = {
                    ...current,
                    messageId: uuidv4(),
                    fromAgent: current.toAgent,
                    toAgent: 'master',
                    taskType: 'synthesize',
                    payload: response.content,
                };
                response = await this.invoke('master', synthesisMsg);
            }
        }
        return response;
    }
    /**
     * Broadcast a message to all agents that support its task type,
     * collect all responses, and return them ranked by confidence descending.
     */
    async broadcast(message) {
        const candidates = [...this.agents.values()].filter((a) => a.report.supportedTaskTypes.includes(message.taskType));
        const results = await Promise.allSettled(candidates.map(({ report }) => this.invoke(report.id, { ...message, toAgent: report.id })));
        return results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value)
            .sort((a, b) => b.confidence - a.confidence);
    }
    /** Invoke a specific agent by id. Throws if agent is not registered. */
    async invoke(agentId, message) {
        const agent = this.agents.get(agentId);
        if (!agent)
            throw new Error(`Unknown agent: ${agentId}`);
        return agent.handler(message);
    }
    // ─── Private helpers ──────────────────────────────────────────────────────
    findByTier(tier) {
        return [...this.agents.values()].find((a) => a.report.tier === tier);
    }
    pickSpecialist(taskType) {
        const candidates = [...this.agents.values()].filter((a) => a.report.tier === 'specialist' &&
            a.report.supportedTaskTypes.includes(taskType));
        if (candidates.length === 0) {
            // Fall back to any agent that can handle this type
            return [...this.agents.values()].find((a) => a.report.supportedTaskTypes.includes(taskType));
        }
        // Prefer the specialist with the highest speed score for the task,
        // unless the task inherently requires depth (reason/create).
        const preferDepth = taskType === 'reason' || taskType === 'create';
        candidates.sort((a, b) => preferDepth
            ? b.report.costPerToken - a.report.costPerToken // most capable
            : b.report.speedScore - a.report.speedScore // fastest
        );
        return candidates[0];
    }
    parseTaskFromScoutResponse(content) {
        const lower = content.toLowerCase();
        if (lower.includes('code') || lower.includes('programming'))
            return 'code';
        if (lower.includes('reason') || lower.includes('logic') || lower.includes('math'))
            return 'reason';
        if (lower.includes('creat') || lower.includes('writ') || lower.includes('story'))
            return 'create';
        if (lower.includes('synthes') || lower.includes('summar') || lower.includes('merge'))
            return 'synthesize';
        return 'answer';
    }
    resolveHandoffTaskType(agentId) {
        const report = this.agents.get(agentId)?.report;
        if (!report)
            return 'answer';
        if (report.tier === 'master')
            return 'synthesize';
        return report.supportedTaskTypes[0] ?? 'answer';
    }
}
//# sourceMappingURL=protocol.js.map