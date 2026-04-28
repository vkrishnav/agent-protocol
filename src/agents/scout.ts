import type { AgentCapabilityReport } from '../types.js';

export const scoutCapability: AgentCapabilityReport = {
  id: 'scout',
  name: 'Scout Classifier',
  tier: 'scout',
  costPerToken: 0.00025,
  speedScore: 1.0,
  maxResponseTokens: 256,
  modelExamples: ['claude-haiku-4-5', 'gemini-1.5-flash', 'nvidia/nemotron-nano-8b-instruct'],
  strengths: [
    'ultra-fast classification',
    'low latency routing decisions',
    'short factual lookups',
    'language detection',
    'intent parsing',
  ],
  weaknesses: [
    'complex multi-step reasoning',
    'long-form code generation',
    'nuanced creative tasks',
    'deep domain expertise',
  ],
  supportedTaskTypes: ['classify', 'answer'],
};
