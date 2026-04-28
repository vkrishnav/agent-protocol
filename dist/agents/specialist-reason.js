export const specialistReasonCapability = {
    id: 'specialist-reason',
    name: 'Reasoning Specialist',
    tier: 'specialist',
    costPerToken: 0.015,
    speedScore: 0.4,
    maxResponseTokens: 16384,
    modelExamples: ['claude-opus-4-7', 'gpt-4o', 'nvidia/nemotron-70b-instruct'],
    strengths: [
        'multi-step logical reasoning',
        'math and quantitative analysis',
        'legal and policy analysis',
        'financial modeling',
        'scientific hypothesis evaluation',
        'strategic planning',
        'adversarial stress-testing of arguments',
    ],
    weaknesses: [
        'real-time data retrieval',
        'highly creative or stylistic tasks',
        'speed-sensitive use-cases',
    ],
    supportedTaskTypes: ['reason', 'answer', 'classify'],
};
//# sourceMappingURL=specialist-reason.js.map