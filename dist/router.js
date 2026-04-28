import { v4 as uuidv4 } from 'uuid';
/**
 * Stateless router — analyzes a raw user message and a set of capability
 * reports and returns a routing decision without calling any agent.
 * The AgentMesh can call this before dispatching.
 */
export class Router {
    capabilities;
    constructor(capabilities) {
        this.capabilities = capabilities;
    }
    /**
     * Produce a routing decision for a raw user utterance.
     * Uses lexical heuristics; swap with a real scout call in production.
     */
    decide(userMessage, conversationId, history = []) {
        const signals = this.extractSignals(userMessage);
        const taskType = this.inferTaskType(signals);
        const chosen = this.selectAgent(taskType, signals);
        const fallbacks = this.capabilities
            .filter((c) => c.id !== chosen.id &&
            c.supportedTaskTypes.includes(taskType) &&
            c.tier !== 'scout')
            .sort((a, b) => b.speedScore - a.speedScore)
            .slice(0, 2)
            .map((c) => c.id);
        const estimatedCost = (chosen.costPerToken * signals.wordCount * 1.5) / 1000;
        const reasoning = `Detected task="${taskType}" complexity="${signals.estimatedComplexity}" ` +
            `→ selected "${chosen.name}" (tier=${chosen.tier}, speed=${chosen.speedScore}).`;
        const messageId = uuidv4();
        const now = new Date().toISOString();
        const envelope = {
            messageId,
            conversationId,
            fromAgent: 'router',
            toAgent: chosen.id,
            taskType,
            payload: userMessage,
            history,
            metadata: {
                createdAt: now,
                turnIndex: history.length,
                rootMessageId: messageId,
            },
        };
        return {
            decision: {
                chosenAgent: chosen.id,
                tier: chosen.tier,
                taskType,
                reasoning,
                estimatedCost,
                fallbackAgents: fallbacks,
            },
            envelope,
        };
    }
    // ─── Private ──────────────────────────────────────────────────────────────
    extractSignals(text) {
        const lower = text.toLowerCase();
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const hasCode = /```|function |class |import |def |SELECT |CREATE TABLE/.test(text);
        const hasMath = /\d+[\+\-\*\/\^]\d+|equation|integral|derivative|matrix|proof/.test(lower);
        const hasCreativeKeywords = /\b(write|story|poem|creative|narrative|screenplay|blog|copy|brand)\b/.test(lower);
        const hasReasoningKeywords = /\b(why|analyze|reason|evaluate|compare|pros and cons|tradeoff|decision|strategy|plan)\b/.test(lower);
        const hasSynthesisKeywords = /\b(summarize|merge|combine|synthesize|consolidate|overview)\b/.test(lower);
        const complexSignals = [hasCode, hasMath, hasCreativeKeywords, hasReasoningKeywords].filter(Boolean).length;
        const estimatedComplexity = wordCount < 20 && complexSignals === 0
            ? 'low'
            : complexSignals >= 2 || wordCount > 100
                ? 'high'
                : 'medium';
        return {
            wordCount,
            hasCode,
            hasMath,
            hasCreativeKeywords,
            hasReasoningKeywords,
            hasSynthesisKeywords,
            estimatedComplexity,
        };
    }
    inferTaskType(signals) {
        if (signals.hasSynthesisKeywords)
            return 'synthesize';
        if (signals.hasCode)
            return 'code';
        if (signals.hasMath || signals.hasReasoningKeywords)
            return 'reason';
        if (signals.hasCreativeKeywords)
            return 'create';
        if (signals.estimatedComplexity === 'low')
            return 'classify';
        return 'answer';
    }
    selectAgent(taskType, signals) {
        const capable = this.capabilities.filter((c) => c.supportedTaskTypes.includes(taskType) && c.tier !== 'master');
        if (capable.length === 0) {
            const fallback = this.capabilities.find((c) => c.tier === 'specialist');
            if (!fallback)
                throw new Error('No agents registered');
            return fallback;
        }
        // Primary-specialty agents (task type is their first supportedTaskType) win
        // over generalists. Within that group, sort by complexity preference.
        capable.sort((a, b) => {
            const aPrimary = a.supportedTaskTypes[0] === taskType ? 1 : 0;
            const bPrimary = b.supportedTaskTypes[0] === taskType ? 1 : 0;
            if (bPrimary !== aPrimary)
                return bPrimary - aPrimary;
            // Same specialty rank → low complexity prefers speed, high prefers depth
            return signals.estimatedComplexity === 'high'
                ? b.costPerToken - a.costPerToken
                : b.speedScore - a.speedScore;
        });
        return capable[0];
    }
}
//# sourceMappingURL=router.js.map