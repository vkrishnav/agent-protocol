// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'classify'
  | 'answer'
  | 'code'
  | 'reason'
  | 'create'
  | 'synthesize';

export type AgentTier = 'scout' | 'specialist' | 'master';

// ─── Capability report ────────────────────────────────────────────────────────

/**
 * Static descriptor every agent registers itself with.
 * The router reads these to make routing decisions without calling agents.
 */
export interface AgentCapabilityReport {
  id: string;
  name: string;
  tier: AgentTier;
  /** Approximate cost in USD per 1 000 tokens (blended input+output estimate) */
  costPerToken: number;
  strengths: string[];
  weaknesses: string[];
  supportedTaskTypes: TaskType[];
  /** 0–1 relative speed score; 1 = fastest */
  speedScore: number;
  /** Suggested max tokens for a single response */
  maxResponseTokens: number;
  /** Example model IDs this profile is backed by */
  modelExamples: string[];
}

// ─── Message envelope ─────────────────────────────────────────────────────────

export interface MessageMetadata {
  /** ISO-8601 timestamp */
  createdAt: string;
  /** Monotonically increasing within a conversation */
  turnIndex: number;
  /** Original user message that started this chain */
  rootMessageId: string;
  /** Free-form key/value bag for app-specific context */
  tags?: Record<string, string>;
}

export interface AgentMessage {
  messageId: string;
  conversationId: string;
  fromAgent: string;
  /** Explicit target agent id, or 'router' to let the mesh decide */
  toAgent: string;
  taskType: TaskType;
  payload: string;
  /** Accumulated prior turns for context-aware routing */
  history?: ConversationTurn[];
  metadata: MessageMetadata;
}

// ─── Response envelope ────────────────────────────────────────────────────────

export interface AgentResponse {
  responseId: string;
  fromAgent: string;
  /** 0–1 confidence in this response */
  confidence: number;
  content: string;
  /** If set, the mesh should forward result to this agent next */
  handoffTo?: string;
  /** Agent's self-reported reasoning (optional, may be redacted in prod) */
  reasoning?: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export interface RoutingDecision {
  chosenAgent: string;
  tier: AgentTier;
  taskType: TaskType;
  reasoning: string;
  estimatedCost: number;
  /** Fallback chain if the primary agent fails */
  fallbackAgents: string[];
}

// ─── Conversation history ─────────────────────────────────────────────────────

export interface ConversationTurn {
  role: 'user' | 'agent';
  agentId?: string;
  content: string;
  timestamp: string;
}

// ─── Agent handler ────────────────────────────────────────────────────────────

/** Function signature every registered agent must implement */
export type AgentHandler = (message: AgentMessage) => Promise<AgentResponse>;
