import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const servers = [
  {
    id: "srv-prod-web-01",
    ip: "10.0.1.21",
    port: 22,
    hostname: "prod-web-01",
    environment: "production",
    tenant: "default",
    status: "healthy",
    agentStatus: "online",
    os: "Ubuntu 22.04 LTS",
    cpuUsage: 42,
    memoryUsage: 67,
    diskUsage: 58,
    loadAvg: 1.72,
    tags: ["web", "nginx", "prod"]
  },
  {
    id: "srv-prod-db-01",
    ip: "10.0.2.18",
    port: 22,
    hostname: "prod-db-01",
    environment: "production",
    tenant: "default",
    status: "warning",
    agentStatus: "online",
    os: "Rocky Linux 9",
    cpuUsage: 71,
    memoryUsage: 82,
    diskUsage: 76,
    loadAvg: 3.41,
    tags: ["database", "postgres", "prod"]
  },
  {
    id: "srv-stage-api-01",
    ip: "10.0.8.33",
    port: 22,
    hostname: "stage-api-01",
    environment: "staging",
    tenant: "default",
    status: "offline",
    agentStatus: "not_installed",
    os: "Debian 12",
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 49,
    loadAvg: 0,
    tags: ["api", "staging"]
  }
];

const alerts = [
  {
    id: "alt-001",
    title: "prod-db-01 内存使用率持续高于 80%",
    severity: "critical",
    status: "open",
    source: "server_metrics",
    serverId: "srv-prod-db-01",
    triggeredAt: "2026-05-11T02:10:00.000Z"
  },
  {
    id: "alt-002",
    title: "prod-web-01 nginx 5xx 错误率升高",
    severity: "warning",
    status: "acknowledged",
    source: "logs",
    serverId: "srv-prod-web-01",
    triggeredAt: "2026-05-11T02:25:00.000Z"
  }
];

const scripts = [
  {
    id: "scr-001",
    name: "Linux 基础巡检",
    type: "shell",
    riskLevel: "low",
    version: "1.0.0",
    successRate: 98
  },
  {
    id: "scr-002",
    name: "Nginx 热重载",
    type: "shell",
    riskLevel: "medium",
    version: "1.1.0",
    successRate: 94
  },
  {
    id: "scr-003",
    name: "PostgreSQL 连接数诊断",
    type: "sql",
    riskLevel: "low",
    version: "0.3.0",
    successRate: 100
  }
];

const slashCommands = [
  { command: "/ssh", description: "打开服务器 Web SSH", example: "/ssh 10.0.1.21 --port 22" },
  { command: "/check", description: "发起服务器巡检", example: "/check prod-web --items cpu,memory,disk" },
  { command: "/diagnose", description: "发起 AI 诊断", example: "/diagnose alert alt-001" },
  { command: "/deploy", description: "触发部署计划", example: "/deploy order-service --env prod --version 1.8.2" }
];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "nextops-api", time: new Date().toISOString() });
});

app.get("/api/dashboard/summary", (_req, res) => {
  const onlineServers = servers.filter((server) => server.agentStatus === "online").length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;

  res.json({
    servers: {
      total: servers.length,
      online: onlineServers,
      warning: servers.filter((server) => server.status === "warning").length,
      offline: servers.filter((server) => server.status === "offline").length
    },
    alerts: {
      total: alerts.length,
      critical: criticalAlerts,
      open: alerts.filter((alert) => alert.status === "open").length
    },
    automation: {
      slashCommands: slashCommands.length,
      scripts: scripts.length,
      aiDiagnosesToday: 12
    },
    trends: [
      { label: "00:00", cpu: 39, memory: 61, alerts: 1 },
      { label: "04:00", cpu: 45, memory: 66, alerts: 1 },
      { label: "08:00", cpu: 57, memory: 72, alerts: 2 },
      { label: "12:00", cpu: 51, memory: 69, alerts: 1 }
    ]
  });
});

app.post("/api/chatops/message", (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  const lowered = message.toLowerCase();
  const isSlash = message.startsWith("/");
  const intent = lowered.includes("ssh")
    ? "open_web_ssh"
    : lowered.includes("diagnose") || message.includes("诊断")
      ? "ai_diagnose"
      : lowered.includes("deploy") || message.includes("部署")
        ? "deployment_plan"
        : "health_check";

  res.json({
    input: message,
    intent,
    riskLevel: intent === "deployment_plan" || intent === "open_web_ssh" ? "medium" : "low",
    commandMode: isSlash,
    plan: [
      "识别目标资产和操作意图",
      "校验当前用户权限与风险等级",
      "关联最近指标、日志、告警和脚本",
      "生成执行计划，等待人工确认"
    ],
    reply: isSlash
      ? "已识别 Slash 指令。Demo 阶段先生成执行计划，后续会接入真实任务执行。"
      : "已将自然语言转换为运维计划。请确认目标资产、风险和执行步骤。"
  });
});

app.get("/api/servers", (_req, res) => {
  res.json({ items: servers });
});

app.get("/api/servers/:id", (req, res) => {
  const server = servers.find((item) => item.id === req.params.id);
  if (!server) {
    res.status(404).json({ message: "Server not found" });
    return;
  }

  res.json({
    ...server,
    system: {
      kernel: "6.5.0",
      cpuModel: "Apple demo compatible x86_64",
      cpuCores: 8,
      memoryTotalMb: 16384,
      diskTotalGb: 512,
      uptimeDays: 24
    },
    alertRules: [
      { id: "rule-cpu-80", name: "CPU 使用率高于 80%", enabled: true },
      { id: "rule-disk-85", name: "磁盘使用率高于 85%", enabled: true }
    ]
  });
});

app.get("/api/alerts", (_req, res) => {
  res.json({ items: alerts });
});

app.get("/api/scripts", (_req, res) => {
  res.json({ items: scripts });
});

app.get("/api/slash-commands", (_req, res) => {
  res.json({ items: slashCommands });
});

app.listen(port, () => {
  console.log(`NextOps API listening on ${port}`);
});

