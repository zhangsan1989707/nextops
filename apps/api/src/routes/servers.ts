import { Router } from "express";
import { getServers, getServer, createServer, getServerInventory, getServerMetrics, getLatestExtendedMetrics, createAuditLog, type ServerRecord } from "../db.js";
import { asyncHandler, buildAlertRules, parseTags } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getServers() });
}));

router.post("/", asyncHandler(async (req, res) => {
  const ip = String(req.body?.ip ?? "").trim();
  const hostname = String(req.body?.hostname ?? "").trim();
  const environment = String(req.body?.environment ?? "staging").trim();
  const port = Number(req.body?.port ?? 22);

  if (!ip || !hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
    res.status(400).json({ message: "ip, hostname and a valid port are required" });
    return;
  }

  const server: ServerRecord = {
    id: `srv-${hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    ip,
    port,
    hostname,
    environment,
    tenant: "default",
    status: "healthy",
    agentStatus: "not_installed",
    os: String(req.body?.os ?? "Linux"),
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    loadAvg: 0,
    tags: parseTags(req.body?.tags)
  };

  const createdServer = await createServer(server);
  await createAuditLog({
    action: "server.create",
    actor: "ops-admin",
    resourceType: "server",
    resourceId: createdServer.id,
    summary: `纳管服务器 ${createdServer.hostname}`,
    details: { ip: createdServer.ip, port: createdServer.port, environment: createdServer.environment }
  });
  res.status(201).json(createdServer);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [server, inventory, metrics, latest] = await Promise.all([
    getServer(id),
    getServerInventory(id),
    getServerMetrics(id, Math.min(Number(req.query.limit) || 60, 360)),
    getLatestExtendedMetrics(id)
  ]);
  if (!server) {
    res.status(404).json({ message: "Server not found" });
    return;
  }
  const hasRealMetrics = metrics.length > 0;

  res.json({
    ...server,
    system: inventory
      ? {
          kernel: inventory.kernel,
          cpuModel: inventory.cpuModel,
          cpuCores: inventory.cpuCores,
          memoryTotalMb: inventory.memoryTotalMb,
          diskTotalGb: inventory.diskTotalGb,
          uptimeDays: Math.floor(inventory.uptimeSeconds / 86400),
          networkCards: inventory.networkCards,
          bootTime: inventory.bootTime,
          collectedAt: inventory.collectedAt
        }
      : {
          kernel: "unknown",
          cpuModel: "unknown",
          cpuCores: 0,
          memoryTotalMb: 0,
          diskTotalGb: 0,
          uptimeDays: 0,
          networkCards: [],
          bootTime: "",
          collectedAt: ""
        },
    realtime: metrics.map((metric) => ({
      label: new Date(metric.collectedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      cpu: metric.cpuUsage,
      memory: metric.memoryUsage
    })),
    processes: latest?.topProcesses ?? [],
    services: latest?.services ?? [],
    logs: latest?.recentLogs ?? "",
    network: latest?.networkConnections ?? "",
    diskDetails: latest?.diskDetails ?? [],
    alertRules: buildAlertRules(server.cpuUsage, server.memoryUsage, server.diskUsage),
    dataMode: hasRealMetrics ? "agent_metrics" : "no_agent_metrics",
    warnings: hasRealMetrics ? [] : ["暂无 Agent 真实指标。请启动本机 Agent 后刷新页面。"]
  });
}));

router.get("/:id/processes", asyncHandler(async (req, res) => {
  const latest = await getLatestExtendedMetrics(String(req.params.id));
  res.json({ items: latest?.topProcesses ?? [] });
}));

router.get("/:id/services", asyncHandler(async (req, res) => {
  const latest = await getLatestExtendedMetrics(String(req.params.id));
  res.json({ items: latest?.services ?? [] });
}));

router.get("/:id/logs", asyncHandler(async (req, res) => {
  const latest = await getLatestExtendedMetrics(String(req.params.id));
  res.type("text/plain").send(latest?.recentLogs ?? "");
}));

export default router;
