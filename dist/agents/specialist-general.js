export const specialistGeneralCapability = {
    id: 'specialist-general',
    name: 'General Mid-Tier Specialist',
    tier: 'specialist',
    costPerToken: 0.003,
    speedScore: 0.75,
    maxResponseTokens: 8192,
    modelExamples: ['claude-sonnet-4-6', 'gemini-1.5-pro', 'nvidia/nemotron-22b-instruct'],
    strengths: [
        'broad question answering',
        'summarization',
        'document analysis',
        'moderate reasoning',
        'instruction following',
        'multi-turn conversation',
        'translation',
    ],
    weaknesses: [
        'cutting-edge math proofs',
        'deep domain specialization at Opus level',
        'production-grade code for complex systems',
    ],
    supportedTaskTypes: ['answer', 'reason', 'create', 'classify'],
};
//# sourceMappingURL=specialist-general.js.map