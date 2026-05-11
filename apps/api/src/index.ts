import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  createServer,
  getAlerts,
  getScripts,
  getServer,
  getServers,
  initializeDatabase,
  type ServerRecord
} from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const slashCommands = [
  { command: "/ssh", description: "打开服务器 Web SSH", example: "/ssh 10.0.1.21 --port 22" },
  { command: "/check", description: "发起服务器巡检", example: "/check prod-web --items cpu,memory,disk" },
  { command: "/diagnose", description: "发起 AI 诊断", example: "/diagnose alert alt-001" },
  { command: "/deploy", description: "触发部署计划", example: "/deploy order-service --env prod --version 1.8.2" }
];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "nextops-api", time: new Date().toISOString() });
});

app.get("/api/dashboard/summary", async (_req, res, next) => {
  try {
  const [servers, alerts, scripts] = await Promise.all([getServers(), getAlerts(), getScripts()]);
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
  } catch (error) {
    next(error);
  }
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

app.get("/api/servers", async (_req, res, next) => {
  try {
    res.json({ items: await getServers() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/servers", async (req, res, next) => {
  try {
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

    res.status(201).json(await createServer(server));
  } catch (error) {
    next(error);
  }
});

app.get("/api/servers/:id", async (req, res, next) => {
  try {
  const server = await getServer(req.params.id);
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
  } catch (error) {
    next(error);
  }
});

app.get("/api/alerts", async (_req, res, next) => {
  try {
    res.json({ items: await getAlerts() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scripts", async (_req, res, next) => {
  try {
    res.json({ items: await getScripts() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/slash-commands", (_req, res) => {
  res.json({ items: slashCommands });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`NextOps API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
