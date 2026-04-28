export const specialistCreativeCapability = {
    id: 'specialist-creative',
    name: 'Creative Specialist',
    tier: 'specialist',
    costPerToken: 0.015,
    speedScore: 0.45,
    maxResponseTokens: 8192,
    modelExamples: ['claude-opus-4-7', 'gemini-1.5-pro', 'gpt-4o'],
    strengths: [
        'long-form creative writing',
        'brand voice and copywriting',
        'narrative design and storytelling',
        'ideation and brainstorming',
        'marketing and persuasive content',
        'tone transformation',
        'poetry and dialogue',
    ],
    weaknesses: [
        'precise technical specifications',
        'strict factual accuracy requirements',
        'structured data output',
    ],
    supportedTaskTypes: ['create', 'answer', 'synthesize'],
};
//# sourceMappingURL=specialist-creative.js.map