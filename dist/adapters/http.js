import express from 'express';
import { v4 as uuidv4 } from 'uuid';
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
/**
 * Mount the AgentMesh as an Express router.
 *
 *   POST /route               — route a message through the full mesh
 *   GET  /agents              — list all registered agents
 *   POST /agents/:id/invoke   — directly invoke a specific agent
 */
export function createMeshRouter(mesh) {
    const router = express.Router();
    router.use(express.json());
    router.post('/route', asyncHandler(async (req, res) => {
        const body = req.body;
        if (!body.message) {
            res.status(400).json({ error: '`message` field is required' });
            return;
        }
        const now = new Date().toISOString();
        const messageId = uuidv4();
        const conversationId = body.conversationId ?? uuidv4();
        const envelope = {
            messageId,
            conversationId,
            fromAgent: 'http-client',
            toAgent: body.toAgent ?? 'router',
            taskType: body.taskType ?? 'answer',
            payload: body.message,
            metadata: {
                createdAt: now,
                turnIndex: 0,
                rootMessageId: messageId,
            },
        };
        const response = await mesh.route(envelope);
        res.json({ conversationId, ...response });
    }));
    router.get('/agents', (_req, res) => {
        res.json(mesh.listAgents());
    });
    router.post('/agents/:id/invoke', asyncHandler(async (req, res) => {
        const agentId = req.params['id'];
        if (!agentId) {
            res.status(400).json({ error: 'Agent id required' });
            return;
        }
        const body = req.body;
        if (!body.message) {
            res.status(400).json({ error: '`message` field is required' });
            return;
        }
        const capability = mesh.getCapability(agentId);
        if (!capability) {
            res.status(404).json({ error: `Agent not found: ${agentId}` });
            return;
        }
        const now = new Date().toISOString();
        const messageId = uuidv4();
        const conversationId = body.conversationId ?? uuidv4();
        const envelope = {
            messageId,
            conversationId,
            fromAgent: 'http-client',
            toAgent: agentId,
            taskType: body.taskType ?? capability.supportedTaskTypes[0] ?? 'answer',
            payload: body.message,
            metadata: {
                createdAt: now,
                turnIndex: 0,
                rootMessageId: messageId,
            },
        };
        const response = await mesh.invoke(agentId, envelope);
        res.json({ conversationId, ...response });
    }));
    // Generic error handler
    router.use((err, _req, res, _next) => {
        const message = err instanceof Error ? err.message : 'Internal error';
        res.status(500).json({ error: message });
    });
    return router;
}
/**
 * Convenience: spin up a standalone Express app exposing the mesh.
 * Returns the server so callers can `.close()` it in tests.
 */
export function startMeshServer(mesh, port = 3099) {
    const app = express();
    app.use('/api', createMeshRouter(mesh));
    return app.listen(port, () => {
        console.log(`[agent-protocol] mesh server listening on :${port}`);
    });
}
//# sourceMappingURL=http.js.map