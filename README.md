# @vamsi/agent-protocol

Lightweight multi-agent federation protocol for TypeScript/Node. The backbone shared across openclaw, precon-platform, roi-tracker, money-agents, and AegisBox.

## Concepts

| Term | Description |
|------|-------------|
| **AgentCapabilityReport** | Static descriptor each agent registers: tier, strengths, cost, speed, supported tasks |
| **AgentMesh** | Registry + router. Accepts messages, runs the scout → specialist → master flow |
| **Router** | Stateless heuristic pre-router. Classifies raw text and builds an `AgentMessage` envelope |
| **AgentTier** | `scout` (fast/cheap classifier) · `specialist` (domain expert) · `master` (synthesizer) |
| **TaskType** | `classify` · `answer` · `code` · `reason` · `create` · `synthesize` |

## Default routing flow

```
user message
    │
    ▼
Router.decide()          ← lexical heuristics, no LLM call
    │  RoutingDecision + AgentMessage envelope
    ▼
AgentMesh.route()
    ├─ scout agent        ← classifies & refines task type
    ├─ specialist agent   ← handles the actual task
    │     └─ handoffTo?  ← specialist may chain to another agent
    └─ master agent       ← synthesizes if handoff chain length > 1
         └─ AgentResponse → caller
```

## Install in another project

```bash
# From the project that will consume this package
npm install file:../agent-protocol
```

Or with a relative path in `package.json`:

```json
{
  "dependencies": {
    "@vamsi/agent-protocol": "file:../agent-protocol"
  }
}
```

Build first so `dist/` is present:

```bash
cd agent-protocol && npm run build
```

## Quick start

```typescript
import {
  AgentMesh,
  Router,
  scoutCapability,
  specialistCodeCapability,
  specialistReasonCapability,
  masterCapability,
  type AgentMessage,
  type AgentResponse,
} from '@vamsi/agent-protocol';
import { v4 as uuidv4 } from 'uuid';

// 1. Build the mesh
const mesh = new AgentMesh();

// 2. Register agents — swap the stub handlers for real LLM calls
mesh.register(scoutCapability, async (msg) => ({
  responseId: uuidv4(),
  fromAgent: 'scout',
  confidence: 1,
  content: 'code task detected',   // real: call Haiku/Flash here
}));

mesh.register(specialistCodeCapability, async (msg) => ({
  responseId: uuidv4(),
  fromAgent: 'specialist-code',
  confidence: 0.92,
  content: 'function add(a, b) { return a + b; }', // real: call Sonnet/Qwen here
}));

mesh.register(masterCapability, async (msg) => ({
  responseId: uuidv4(),
  fromAgent: 'master',
  confidence: 0.95,
  content: `Synthesized: ${msg.payload}`,  // real: call Opus here
}));

// 3. Route a raw user message
const conversationId = uuidv4();
const { envelope } = new Router(mesh.listAgents()).decide(
  'Write a TypeScript debounce function',
  conversationId
);

const response = await mesh.route(envelope);
console.log(response.content);
```

## Direct invocation (skip routing)

```typescript
const response = await mesh.invoke('specialist-code', {
  messageId: uuidv4(),
  conversationId: uuidv4(),
  fromAgent: 'my-app',
  toAgent: 'specialist-code',
  taskType: 'code',
  payload: 'Write a SQL query that finds duplicate emails',
  metadata: { createdAt: new Date().toISOString(), turnIndex: 0, rootMessageId: '' },
});
```

## Broadcast (fan-out)

```typescript
// Ask all agents that support 'answer', rank by confidence
const responses = await mesh.broadcast({
  ...envelope,
  taskType: 'answer',
});
// responses[0] is highest-confidence answer
```

## HTTP adapter

```typescript
import express from 'express';
import { AgentMesh, createMeshRouter } from '@vamsi/agent-protocol';

const app = express();
const mesh = new AgentMesh();
// register agents...

app.use('/api', createMeshRouter(mesh));
app.listen(3099);
```

| Endpoint | Description |
|----------|-------------|
| `POST /api/route` | Route `{ message, conversationId?, taskType?, toAgent? }` through the mesh |
| `GET /api/agents` | List all registered capability reports |
| `POST /api/agents/:id/invoke` | Directly invoke a specific agent |

## Registering a custom agent

```typescript
import type { AgentCapabilityReport, AgentHandler } from '@vamsi/agent-protocol';

const myAgentCapability: AgentCapabilityReport = {
  id: 'my-agent',
  name: 'My Custom Agent',
  tier: 'specialist',
  costPerToken: 0.005,
  speedScore: 0.6,
  maxResponseTokens: 4096,
  modelExamples: ['my-model-v1'],
  strengths: ['domain knowledge', 'structured output'],
  weaknesses: ['creative tasks'],
  supportedTaskTypes: ['answer', 'reason'],
};

const myHandler: AgentHandler = async (message) => {
  // call your actual model here
  return {
    responseId: uuidv4(),
    fromAgent: 'my-agent',
    confidence: 0.88,
    content: 'response from my model',
  };
};

mesh.register(myAgentCapability, myHandler);
```

## Capability reports

Pre-built reports live in `src/agents/`. Import directly to build your own mesh:

```typescript
import {
  scoutCapability,          // Haiku / Gemini Flash / Nemotron-Nano
  specialistCodeCapability, // Qwen2.5-coder / Sonnet
  specialistReasonCapability, // Opus / GPT-4o / Nemotron-70B
  specialistCreativeCapability, // Opus / Gemini Pro
  specialistGeneralCapability,  // Sonnet / Gemini Pro / Nemotron-22B
  masterCapability,         // Opus / GPT-4o
} from '@vamsi/agent-protocol';
```

## Development

```bash
npm run build        # compile to dist/
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run test:watch   # vitest watch mode
```

## Transport agnosticism

The protocol is pure TypeScript with no transport coupling. The `AgentHandler` type is:

```typescript
type AgentHandler = (message: AgentMessage) => Promise<AgentResponse>;
```

Use the built-in HTTP adapter, wrap it in a WebSocket handler, or call `mesh.invoke()` directly in-process — the protocol doesn't care.
