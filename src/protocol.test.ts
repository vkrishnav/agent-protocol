import { describe, it, expect, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { AgentMesh } from './protocol.js';
import { Router } from './router.js';
import {
  scoutCapability,
  specialistCodeCapability,
  specialistReasonCapability,
  masterCapability,
  specialistGeneralCapability,
  specialistCreativeCapability,
} from './index.js';
import type { AgentMessage, AgentResponse } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(
  fromAgent: string,
  content: string,
  opts: Partial<AgentResponse> = {}
): AgentResponse {
  return {
    responseId: uuidv4(),
    fromAgent,
    confidence: opts.confidence ?? 0.9,
    content,
    ...opts,
  };
}

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  const id = uuidv4();
  return {
    messageId: id,
    conversationId: uuidv4(),
    fromAgent: 'test',
    toAgent: 'router',
    taskType: 'answer',
    payload: 'Hello, world!',
    metadata: { createdAt: new Date().toISOString(), turnIndex: 0, rootMessageId: id },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AgentMesh — registration', () => {
  it('registers agents and lists them', () => {
    const mesh = new AgentMesh();
    mesh.register(scoutCapability, vi.fn());
    mesh.register(specialistCodeCapability, vi.fn());

    const reports = mesh.listAgents();
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.id)).toContain('scout');
    expect(reports.map((r) => r.id)).toContain('specialist-code');
  });

  it('throws on duplicate registration', () => {
    const mesh = new AgentMesh();
    mesh.register(scoutCapability, vi.fn());
    expect(() => mesh.register(scoutCapability, vi.fn())).toThrow(/already registered/);
  });
});

describe('AgentMesh — direct invoke', () => {
  it('calls the handler for a named agent', async () => {
    const mesh = new AgentMesh();
    const handler = vi.fn().mockResolvedValue(
      makeResponse('specialist-code', 'Here is the code…')
    );
    mesh.register(specialistCodeCapability, handler);

    const msg = makeMessage({ toAgent: 'specialist-code', taskType: 'code' });
    const response = await mesh.invoke('specialist-code', msg);

    expect(handler).toHaveBeenCalledOnce();
    expect(response.content).toBe('Here is the code…');
  });

  it('throws for unknown agent id', async () => {
    const mesh = new AgentMesh();
    await expect(mesh.invoke('ghost', makeMessage())).rejects.toThrow(/Unknown agent/);
  });
});

describe('AgentMesh — full routing flow', () => {
  it('routes via scout → specialist', async () => {
    const mesh = new AgentMesh();

    const scoutHandler = vi.fn().mockResolvedValue(
      makeResponse('scout', 'task: code generation detected')
    );
    const codeHandler = vi.fn().mockResolvedValue(
      makeResponse('specialist-code', 'function hello() { return 42; }')
    );

    mesh.register(scoutCapability, scoutHandler);
    mesh.register(specialistCodeCapability, codeHandler);

    const msg = makeMessage({ toAgent: 'router', taskType: 'classify' });
    const response = await mesh.route(msg);

    expect(scoutHandler).toHaveBeenCalledOnce();
    expect(codeHandler).toHaveBeenCalledOnce();
    expect(response.content).toContain('42');
  });

  it('executes a handoff chain: specialist → master', async () => {
    const mesh = new AgentMesh();

    const scoutHandler = vi.fn().mockResolvedValue(
      makeResponse('scout', 'reason task')
    );
    const reasonHandler = vi.fn().mockResolvedValue(
      makeResponse('specialist-reason', 'Here is my reasoning…', { handoffTo: 'master' })
    );
    const masterHandler = vi.fn().mockResolvedValue(
      makeResponse('master', 'Final synthesized answer.')
    );

    mesh.register(scoutCapability, scoutHandler);
    mesh.register(specialistReasonCapability, reasonHandler);
    mesh.register(masterCapability, masterHandler);

    const msg = makeMessage({
      toAgent: 'router',
      payload: 'Analyze the tradeoffs of distributed consensus algorithms',
    });
    const response = await mesh.route(msg);

    expect(reasonHandler).toHaveBeenCalledOnce();
    expect(masterHandler).toHaveBeenCalledOnce();
    expect(response.fromAgent).toBe('master');
    expect(response.content).toBe('Final synthesized answer.');
  });

  it('prevents infinite handoff cycles', async () => {
    const mesh = new AgentMesh();

    // A and B keep handing off to each other
    const handlerA = vi.fn().mockResolvedValue(
      makeResponse('specialist-reason', 'Pass to general', { handoffTo: 'specialist-general' })
    );
    const handlerB = vi.fn().mockResolvedValue(
      makeResponse('specialist-general', 'Pass back to reason', { handoffTo: 'specialist-reason' })
    );
    const scoutHandler = vi.fn().mockResolvedValue(
      makeResponse('scout', 'reason task')
    );

    mesh.register(scoutCapability, scoutHandler);
    mesh.register(specialistReasonCapability, handlerA);
    mesh.register(specialistGeneralCapability, handlerB);

    const msg = makeMessage({ toAgent: 'router' });
    // Should resolve without infinite loop
    const response = await mesh.route(msg);
    expect(response).toBeDefined();
  });
});

describe('AgentMesh — broadcast', () => {
  it('collects responses from all capable agents, sorted by confidence', async () => {
    const mesh = new AgentMesh();

    mesh.register(
      specialistCodeCapability,
      vi.fn().mockResolvedValue(makeResponse('specialist-code', 'A', { confidence: 0.6 }))
    );
    mesh.register(
      specialistGeneralCapability,
      vi.fn().mockResolvedValue(makeResponse('specialist-general', 'B', { confidence: 0.85 }))
    );
    mesh.register(
      specialistReasonCapability,
      vi.fn().mockResolvedValue(makeResponse('specialist-reason', 'C', { confidence: 0.75 }))
    );

    const msg = makeMessage({ taskType: 'answer', toAgent: 'router' });
    const responses = await mesh.broadcast(msg);

    expect(responses.length).toBeGreaterThanOrEqual(2);
    // Should be sorted descending by confidence
    for (let i = 0; i < responses.length - 1; i++) {
      expect(responses[i]!.confidence).toBeGreaterThanOrEqual(responses[i + 1]!.confidence);
    }
  });
});

describe('Router — routing decisions', () => {
  const capabilities = [
    scoutCapability,
    specialistCodeCapability,
    specialistReasonCapability,
    specialistCreativeCapability,
    specialistGeneralCapability,
    masterCapability,
  ];
  const router = new Router(capabilities);

  it('routes a code question to the code specialist', () => {
    const { decision } = router.decide(
      'Write a TypeScript function that debounces a callback',
      uuidv4()
    );
    expect(decision.taskType).toBe('code');
    expect(decision.chosenAgent).toBe('specialist-code');
  });

  it('routes a reasoning question to the reason specialist', () => {
    const { decision } = router.decide(
      'Analyze the pros and cons of CAP theorem tradeoffs for a fintech system',
      uuidv4()
    );
    expect(decision.taskType).toBe('reason');
    expect(decision.chosenAgent).toBe('specialist-reason');
  });

  it('routes a creative request to the creative specialist', () => {
    const { decision } = router.decide(
      'Write a brand story and narrative for a startup',
      uuidv4()
    );
    expect(decision.taskType).toBe('create');
    expect(decision.chosenAgent).toBe('specialist-creative');
  });

  it('produces a well-formed AgentMessage envelope', () => {
    const conversationId = uuidv4();
    const { envelope } = router.decide('What is 2 + 2?', conversationId);
    expect(envelope.conversationId).toBe(conversationId);
    expect(envelope.fromAgent).toBe('router');
    expect(envelope.metadata.createdAt).toBeTruthy();
  });

  it('includes fallback agents in the decision', () => {
    const { decision } = router.decide('Explain quantum entanglement', uuidv4());
    expect(Array.isArray(decision.fallbackAgents)).toBe(true);
  });
});
