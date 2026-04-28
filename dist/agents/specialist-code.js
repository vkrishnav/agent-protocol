export const specialistCodeCapability = {
    id: 'specialist-code',
    name: 'Code Specialist',
    tier: 'specialist',
    costPerToken: 0.003,
    speedScore: 0.7,
    maxResponseTokens: 8192,
    modelExamples: ['qwen2.5-coder-32b-instruct', 'claude-sonnet-4-6', 'gpt-4o'],
    strengths: [
        'code generation across many languages',
        'debugging and root-cause analysis',
        'refactoring and code review',
        'API design',
        'test writing',
        'shell scripting',
        'SQL and data pipeline construction',
    ],
    weaknesses: [
        'open-ended creative writing',
        'emotional nuance',
        'long business-prose documents',
    ],
    supportedTaskTypes: ['code', 'answer', 'reason'],
};
//# sourceMappingURL=specialist-code.js.map