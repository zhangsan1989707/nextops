import type { ServerRecord, ServerMetricRecord, ServerInventoryRecord, AgentRegistrationInput, AgentMetricInput } from "../db.js";
import * as db from "../db.js";

export { getServers, getServer, createServer, updateServer, getServerInventory, getServerMetrics, getLatestExtendedMetrics, getRecentMetricTrends } from "../db.js";

export async function registerAgent(input: AgentRegistrationInput): Promise<ServerRecord> {
  return db.registerAgent(input);
}

export async function recordAgentMetrics(agentId: string, input: AgentMetricInput): Promise<ServerMetricRecord | null> {
  return db.recordAgentMetrics(agentId, input);
}

export async function getServerHealth(serverId: string): Promise<{
  server: ServerRecord | null;
  inventory: ServerInventoryRecord | null;
  latestMetrics: ServerMetricRecord | null;
  metricsHistory: ServerMetricRecord[];
}> {
  const [server, inventory, latestMetrics, metricsHistory] = await Promise.all([
    db.getServer(serverId),
    db.getServerInventory(serverId),
    db.getLatestExtendedMetrics(serverId),
    db.getServerMetrics(serverId, 12)
  ]);

  return { server, inventory, latestMetrics, metricsHistory };
}