import { Router } from "express";
import { registerAgent, recordAgentMetrics, createTaskRecord, getServer, createAuditLog } from "../db.js";
import { asyncHandler, clampPercent } from "../utils/helpers.js";

const router = Router();

router.post("/register", asyncHandler(async (req, res) => {
  const body = req.body;
  const agentId = String(body.agentId ?? "").trim();
  const hostname = String(body.hostname ?? "").trim();
  const ip = String(body.ip ?? "127.0.0.1").trim();
  const os = String(body.os ?? "unknown").trim();
  const environment = String(body.environment ?? "local").trim();
  const version = String(body.version ?? "0.1.0").trim();
  const inventory = body.inventory;

  if (!agentId || !hostname || !inventory) {
    res.status(400).json({ message: "agentId, hostname and inventory are required" });
    return;
  }

  const server = await registerAgent({
    agentId,
    hostname,
    ip,
    os,
    environment,
    version,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : ["local", "agent"],
    inventory
  });

  await createAuditLog({
    action: "agent.register",
    actor: "local-agent",
    resourceType: "server",
    resourceId: server.id,
    summary: `Agent 注册 ${server.hostname}`,
    details: { agentId, version }
  });

  res.status(201).json({ server, agentId });
}));

router.post("/:id/metrics", asyncHandler(async (req, res) => {
  const input = req.body;
  const id = String(req.params.id);
  const metric = await recordAgentMetrics(id, {
    cpuUsage: clampPercent(Number(input.cpuUsage ?? 0)),
    memoryUsage: clampPercent(Number(input.memoryUsage ?? 0)),
    diskUsage: clampPercent(Number(input.diskUsage ?? 0)),
    loadAvg: Number(input.loadAvg ?? 0),
    inventory: input.inventory,
    topProcesses: Array.isArray(input.topProcesses) ? input.topProcesses : undefined,
    services: Array.isArray(input.services) ? input.services : undefined,
    recentLogs: typeof input.recentLogs === "string" ? input.recentLogs : undefined,
    networkConnections: typeof input.networkConnections === "string" ? input.networkConnections : undefined,
    diskDetails: Array.isArray(input.diskDetails) ? input.diskDetails : undefined
  });

  if (!metric) {
    res.status(404).json({ message: "Agent not registered" });
    return;
  }
  res.status(201).json(metric);
}));

router.post("/:id/install-plan", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const server = await getServer(id);
  if (!server) {
    res.status(404).json({ message: "Server not found" });
    return;
  }

  const steps = [
    `通过 Web SSH 连接 ${server.ip}:${server.port}`,
    "检测系统架构、发行版和已有 Agent 状态",
    "下载 nextops-agent 安装包并写入租户绑定 Token",
    "启动 Agent 服务并等待首次心跳",
    "回写服务器配置、实时指标和日志采集状态"
  ];
  const requiresApproval = server.environment === "production";

  const task = await createTaskRecord({
    id: `task-${Date.now().toString(36)}`,
    taskType: "agent_install_plan",
    status: requiresApproval ? "waiting_approval" : "planned",
    riskLevel: "medium",
    requiresApproval,
    targetId: server.id,
    targetName: server.hostname,
    resourceId: "nextops-agent",
    resourceName: "NextOps Agent",
    summary: `为 ${server.hostname} 部署 NextOps Agent`,
    plan: steps,
    output: null
  });

  await createAuditLog({
    action: "agent.install_plan",
    actor: "ops-admin",
    resourceType: "server",
    resourceId: server.id,
    summary: `生成 ${server.hostname} Agent 安装计划`,
    details: { taskId: task.id, requiresApproval }
  });

  res.json({
    taskId: task.id,
    serverId: server.id,
    title: task.summary,
    riskLevel: task.riskLevel,
    steps,
    command: `curl -fsSL http://nextops.local/install-agent.sh | sudo NEXTOPS_SERVER=${server.id} bash`,
    requiresApproval,
    executionMode: "planned_only",
    warnings: ["当前只生成 Agent 安装计划，尚未真实连接 Web SSH 或执行安装命令。"]
  });
}));

export default router;
