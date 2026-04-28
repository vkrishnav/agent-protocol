import type { AgentCapabilityReport } from '../types.js';

export const masterCapability: AgentCapabilityReport = {
  id: 'master',
  name: 'Master Synthesizer',
  tier: 'master',
  costPerToken: 0.015,
  speedScore: 0.35,
  maxResponseTokens: 16384,
  modelExamples: ['claude-opus-4-7', 'gpt-4o', 'gemini-1.5-pro'],
  strengths: [
    'merging outputs from multiple specialist agents',
    'resolving contradictions between agent responses',
    'coherent long-form synthesis',
    'executive summarization with source attribution',
    'final quality gate before delivery to user',
    'tone and style harmonization across mixed content',
  ],
  weaknesses: [
    'real-time data',
    'highly domain-specific technical depth without specialist input',
  ],
  supportedTaskTypes: ['synthesize', 'create', 'answer'],
};
