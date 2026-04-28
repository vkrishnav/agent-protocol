import express from 'express';
import type { AgentMesh } from '../protocol.js';
/**
 * Mount the AgentMesh as an Express router.
 *
 *   POST /route               — route a message through the full mesh
 *   GET  /agents              — list all registered agents
 *   POST /agents/:id/invoke   — directly invoke a specific agent
 */
export declare function createMeshRouter(mesh: AgentMesh): express.Router;
/**
 * Convenience: spin up a standalone Express app exposing the mesh.
 * Returns the server so callers can `.close()` it in tests.
 */
export declare function startMeshServer(mesh: AgentMesh, port?: number): ReturnType<typeof express.application.listen>;
//# sourceMappingURL=http.d.ts.map