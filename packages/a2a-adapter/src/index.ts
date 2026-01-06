/**
 * A2A (Agent2Agent) Protocol Adapter
 * 
 * Enables external agents and partners (e.g., Amazon Alexa+) to integrate
 * with Storytailor's agent system using the A2A protocol.
 * 
 * Protocol boundaries:
 * - A2A is for external agent/partner integration
 * - Do NOT use A2A for internal calls (use gRPC)
 * - Do NOT use A2A for AI assistant tools (use MCP)
 */

export * from './types';
export * from './AgentCard';
export * from './JsonRpcHandler';
export * from './TaskManager';
export * from './MessageHandler';
export * from './SSEStreamer';
export * from './WebhookHandler';
export * from './Authentication';
export * from './RouterIntegration';
export { A2AAdapter } from './A2AAdapter';
export type { A2AAdapterDependencies, A2AConfig } from './types';
