import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  createServer,
  getAlert,
  getAlerts,
  getScript,
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

const packages = [
  {
    id: "pkg-agent-010",
    name: "nextops-agent",
    type: "agent",
    version: "0.1.0",
    size: "18.4 MB",
    checksum: "sha256:7d9e-agent-demo",
    status: "ready"
  },
  {
    id: "pkg-nginx-conf-184",
    name: "nginx-conf-bundle",
    type: "config",
    version: "1.8.4",
    size: "240 KB",
    checksum: "sha256:aa31-nginx-demo",
    status: "ready"
  },
  {
    id: "pkg-order-service-182",
    name: "order-service",
    type: "release",
    version: "1.8.2",
    size: "84.1 MB",
    checksum: "sha256:f91c-order-demo",
    status: "verified"
  }
];

const managedFiles = [
  {
    id: "file-nginx-access",
    name: "nginx-access-sample.log",
    path: "/var/log/nginx/access.log",
    type: "log",
    size: "12.8 MB",
    source: "prod-web-01",
    updatedAt: "2026-05-12T06:42:00.000Z"
  },
  {
    id: "file-agent-install",
    name: "install-agent.sh",
    path: "/opt/nextops/install-agent.sh",
    type: "script",
    size: "8 KB",
    source: "nextops",
    updatedAt: "2026-05-12T05:10:00.000Z"
  },
  {
    id: "file-db-report",
    name: "postgres-diagnosis.txt",
    path: "/tmp/postgres-diagnosis.txt",
    type: "report",
    size: "32 KB",
    source: "prod-db-01",
    updatedAt: "2026-05-12T04:35:00.000Z"
  }
];

const tenants = [
  {
    id: "tenant-default",
    name: "Default Ops",
    status: "active",
    servers: 4,
    alerts: 2,
    aiDiagnosesToday: 12,
    quota: "standard"
  },
  {
    id: "tenant-devops",
    name: "DevOps Lab",
    status: "active",
    servers: 8,
    alerts: 1,
    aiDiagnosesToday: 7,
    quota: "standard"
  },
  {
    id: "tenant-private-cloud",
    name: "Private Cloud",
    status: "review",
    servers: 15,
    alerts: 4,
    aiDiagnosesToday: 18,
    quota: "enterprise"
  }
];

let approvalTickets = [
  {
    id: "apv-001",
    title: "生产环境 Nginx reload",
    type: "script",
    status: "pending",
    riskLevel: "medium",
    requester: "SRE 值班",
    target: "prod-web-01",
    environment: "production",
    createdAt: "2026-05-12T07:15:00.000Z",
    summary: "执行 Nginx 配置检查并 reload 服务，命中生产环境变更审批策略。",
    steps: ["校验 nginx.conf 语法", "对比当前配置 checksum", "执行 systemctl reload nginx", "采集 reload 后 5 分钟 5xx 指标"],
    relatedResource: "scr-002"
  },
  {
    id: "apv-002",
    title: "分发 Agent 安装包",
    type: "package",
    status: "pending",
    riskLevel: "low",
    requester: "平台管理员",
    target: "prod-cache-01",
    environment: "production",
    createdAt: "2026-05-12T06:48:00.000Z",
    summary: "向新纳管服务器分发 nextops-agent 安装包并生成安装计划。",
    steps: ["校验安装包 checksum", "上传到 /opt/nextops", "生成 systemd unit", "等待人工确认安装"],
    relatedResource: "pkg-agent-010"
  },
  {
    id: "apv-003",
    title: "数据库连接数诊断",
    type: "diagnosis",
    status: "approved",
    riskLevel: "high",
    requester: "DBA",
    target: "prod-db-01",
    environment: "production",
    createdAt: "2026-05-12T05:20:00.000Z",
    reviewedAt: "2026-05-12T05:28:00.000Z",
    reviewer: "ops-admin",
    comment: "允许执行只读诊断。",
    summary: "对 PostgreSQL 活跃会话、等待事件和慢查询进行只读诊断。",
    steps: ["查询 pg_stat_activity", "采集等待事件", "关联慢查询日志", "生成修复建议"],
    relatedResource: "scr-003"
  }
];

let aiModels = [
  {
    id: "model-ops-gpt-4.1",
    name: "OpsGPT-4.1",
    provider: "OpenAI Compatible",
    type: "chat",
    status: "enabled",
    isDefault: true,
    contextWindow: "128k",
    latencyMs: 820,
    costLevel: "medium",
    capabilities: ["ChatOps", "日志诊断", "修复方案生成", "Slash 指令解析"],
    endpoint: "https://api.openai.example/v1"
  },
  {
    id: "model-local-qwen",
    name: "Qwen2.5-Ops-Local",
    provider: "Private LLM Gateway",
    type: "chat",
    status: "enabled",
    isDefault: false,
    contextWindow: "32k",
    latencyMs: 460,
    costLevel: "low",
    capabilities: ["内网知识问答", "脚本生成", "告警归因"],
    endpoint: "http://llm-gateway.local/v1"
  },
  {
    id: "model-embedding-bge",
    name: "BGE-M3 Embedding",
    provider: "Vector Service",
    type: "embedding",
    status: "disabled",
    isDefault: false,
    contextWindow: "8k",
    latencyMs: 120,
    costLevel: "low",
    capabilities: ["日志向量化", "知识库检索", "相似事件召回"],
    endpoint: "http://vector.local/embedding"
  }
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
        uptimeDays: 24,
        networkCards: ["eth0", "docker0"],
        bootTime: "2026-04-17T08:12:00.000Z"
      },
      realtime: [
        { label: "10:00", cpu: Math.max(8, server.cpuUsage - 10), memory: Math.max(12, server.memoryUsage - 9) },
        { label: "10:05", cpu: Math.max(8, server.cpuUsage - 4), memory: Math.max(12, server.memoryUsage - 5) },
        { label: "10:10", cpu: server.cpuUsage, memory: server.memoryUsage },
        { label: "10:15", cpu: Math.min(96, server.cpuUsage + 7), memory: Math.min(96, server.memoryUsage + 4) }
      ],
      alertRules: [
        { id: "rule-cpu-80", name: "CPU 使用率高于 80%", metric: "cpu_usage", threshold: 80, enabled: true },
        { id: "rule-disk-85", name: "磁盘使用率高于 85%", metric: "disk_usage", threshold: 85, enabled: true }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/servers/:id/agent/install-plan", async (req, res, next) => {
  try {
    const server = await getServer(req.params.id);
    if (!server) {
      res.status(404).json({ message: "Server not found" });
      return;
    }

    res.json({
      serverId: server.id,
      title: `为 ${server.hostname} 部署 NextOps Agent`,
      riskLevel: "medium",
      steps: [
        `通过 Web SSH 连接 ${server.ip}:${server.port}`,
        "检测系统架构、发行版和已有 Agent 状态",
        "下载 nextops-agent 安装包并写入租户绑定 Token",
        "启动 Agent 服务并等待首次心跳",
        "回写服务器配置、实时指标和日志采集状态"
      ],
      command: `curl -fsSL http://nextops.local/install-agent.sh | sudo NEXTOPS_SERVER=${server.id} bash`,
      requiresApproval: server.environment === "production"
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/servers/:id/diagnose", async (req, res, next) => {
  try {
    const server = await getServer(req.params.id);
    if (!server) {
      res.status(404).json({ message: "Server not found" });
      return;
    }

    const pressure = Math.max(server.cpuUsage, server.memoryUsage, server.diskUsage);
    res.json({
      serverId: server.id,
      summary:
        pressure >= 80
          ? `${server.hostname} 存在资源压力，建议优先检查内存、磁盘和最近部署。`
          : `${server.hostname} 当前指标处于可控范围，建议继续观察趋势。`,
      evidence: [
        `CPU 使用率 ${server.cpuUsage}%`,
        `内存使用率 ${server.memoryUsage}%`,
        `磁盘使用率 ${server.diskUsage}%`,
        `Agent 状态 ${server.agentStatus}`
      ],
      possibleCauses:
        pressure >= 80
          ? ["业务流量突增", "后台任务占用资源", "日志或临时文件堆积", "最近发布导致资源使用升高"]
          : ["暂无明显异常", "可建立基线后继续进行趋势判断"],
      repairPlan: [
        "查看最近 30 分钟性能曲线和告警事件",
        "检查 top 进程、磁盘大文件和关键服务日志",
        "必要时执行低风险清理或服务扩容",
        "修复后持续观察 15 分钟"
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

app.get("/api/alerts/:id", async (req, res, next) => {
  try {
    const alert = await getAlert(req.params.id);
    if (!alert) {
      res.status(404).json({ message: "Alert not found" });
      return;
    }
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

app.post("/api/alerts/:id/diagnose", async (req, res, next) => {
  try {
    const alert = await getAlert(req.params.id);
    if (!alert) {
      res.status(404).json({ message: "Alert not found" });
      return;
    }

    const server = await getServer(alert.serverId);
    if (!server) {
      res.status(404).json({ message: "Related server not found" });
      return;
    }

    const isCritical = alert.severity === "critical";
    res.json({
      alertId: alert.id,
      serverId: server.id,
      summary: `${alert.title}。AI 已关联 ${server.hostname} 的指标、日志来源和资产配置，建议按影响范围优先处理。`,
      impact: isCritical ? "可能影响生产服务稳定性，需要尽快确认。" : "当前影响可控，建议在观察窗口内处理。",
      timeline: [
        { time: alert.triggeredAt, event: "告警触发" },
        { time: new Date().toISOString(), event: "AI 诊断生成" }
      ],
      evidence: [
        `告警级别：${alert.severity}`,
        `告警来源：${alert.source}`,
        `关联服务器：${server.hostname} (${server.ip})`,
        `CPU ${server.cpuUsage}% / 内存 ${server.memoryUsage}% / 磁盘 ${server.diskUsage}%`
      ],
      possibleCauses: isCritical
        ? ["资源使用持续升高", "服务进程异常占用", "最近发布或定时任务引发压力", "日志或缓存文件堆积"]
        : ["短时流量波动", "局部日志错误率升高", "阈值策略需要校准"],
      repairPlan: [
        "进入服务器详情查看 15 分钟性能趋势",
        "检查关键日志和 top 进程，确认是否有异常任务",
        "必要时执行巡检脚本或生成 Agent 部署计划",
        "处理后持续观察并关闭或备注告警"
      ]
    });
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

app.get("/api/scripts/:id", async (req, res, next) => {
  try {
    const script = await getScript(req.params.id);
    if (!script) {
      res.status(404).json({ message: "Script not found" });
      return;
    }

    res.json({
      ...script,
      description: scriptDescription(script.id),
      parameters: scriptParameters(script.id),
      content: scriptContent(script.id),
      lastRuns: [
        { id: "run-1042", target: "prod-web-01", status: "success", durationSeconds: 18, createdAt: "2026-05-12T06:20:00.000Z" },
        { id: "run-1041", target: "prod-db-01", status: "success", durationSeconds: 27, createdAt: "2026-05-12T05:40:00.000Z" }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/scripts/:id/run", async (req, res, next) => {
  try {
    const script = await getScript(req.params.id);
    if (!script) {
      res.status(404).json({ message: "Script not found" });
      return;
    }

    const targetId = String(req.body?.targetId ?? "srv-prod-web-01");
    const target = await getServer(targetId);
    if (!target) {
      res.status(404).json({ message: "Target server not found" });
      return;
    }

    const requiresApproval = script.riskLevel !== "low" || target.environment === "production";
    res.json({
      taskId: `task-${Date.now().toString(36)}`,
      scriptId: script.id,
      scriptName: script.name,
      target: {
        id: target.id,
        hostname: target.hostname,
        ip: target.ip,
        environment: target.environment
      },
      status: requiresApproval ? "waiting_approval" : "success",
      riskLevel: script.riskLevel,
      requiresApproval,
      plan: [
        `校验脚本 ${script.name} 的版本和风险等级`,
        `确认目标服务器 ${target.hostname} 的 Agent/SSH 状态`,
        "注入参数并生成执行命令",
        requiresApproval ? "生产或中高风险操作进入审批" : "执行脚本并采集输出",
        "写入任务记录和审计日志"
      ],
      output: requiresApproval
        ? "任务已生成，等待审批后执行。"
        : `[${target.hostname}] script completed successfully\\ncpu=${target.cpuUsage}% memory=${target.memoryUsage}% disk=${target.diskUsage}%`
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/slash-commands", (_req, res) => {
  res.json({ items: slashCommands });
});

app.get("/api/packages", (_req, res) => {
  res.json({ items: packages });
});

app.post("/api/packages/:id/deploy-plan", async (req, res, next) => {
  try {
    const item = packages.find((candidate) => candidate.id === req.params.id);
    if (!item) {
      res.status(404).json({ message: "Package not found" });
      return;
    }

    const targetId = String(req.body?.targetId ?? "srv-stage-api-01");
    const target = await getServer(targetId);
    if (!target) {
      res.status(404).json({ message: "Target server not found" });
      return;
    }

    const requiresApproval = target.environment === "production" || item.type === "release";
    res.json({
      packageId: item.id,
      packageName: item.name,
      version: item.version,
      target: {
        id: target.id,
        hostname: target.hostname,
        environment: target.environment
      },
      requiresApproval,
      riskLevel: requiresApproval ? "medium" : "low",
      steps: [
        `校验包 ${item.name}@${item.version} 的 checksum`,
        `确认目标服务器 ${target.hostname} 的磁盘空间和 Agent 状态`,
        "分发包到目标服务器临时目录",
        item.type === "agent" ? "执行 Agent 安装/升级脚本" : "执行部署或配置替换动作",
        "记录包使用记录和部署审计"
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/files", (_req, res) => {
  res.json({ items: managedFiles });
});

app.post("/api/files/:id/transfer-plan", async (req, res, next) => {
  try {
    const file = managedFiles.find((candidate) => candidate.id === req.params.id);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const targetId = String(req.body?.targetId ?? "srv-stage-api-01");
    const mode = String(req.body?.mode ?? "push");
    const target = await getServer(targetId);
    if (!target) {
      res.status(404).json({ message: "Target server not found" });
      return;
    }

    res.json({
      fileId: file.id,
      fileName: file.name,
      mode,
      target: {
        id: target.id,
        hostname: target.hostname,
        environment: target.environment
      },
      riskLevel: file.type === "script" || target.environment === "production" ? "medium" : "low",
      requiresApproval: target.environment === "production",
      steps:
        mode === "pull"
          ? [
              `通过 Agent/SSH 从 ${target.hostname} 读取 ${file.path}`,
              "计算文件大小和 checksum",
              "上传到 NextOps 文件区",
              "写入文件操作审计"
            ]
          : [
              `校验文件 ${file.name} 的 checksum 和权限`,
              `分发到 ${target.hostname}:${file.path}`,
              "设置文件 owner/mode",
              "写入文件操作审计"
            ]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/tenants/summary", (_req, res) => {
  res.json({
    items: tenants,
    totals: {
      tenants: tenants.length,
      servers: tenants.reduce((total, tenant) => total + tenant.servers, 0),
      alerts: tenants.reduce((total, tenant) => total + tenant.alerts, 0),
      aiDiagnosesToday: tenants.reduce((total, tenant) => total + tenant.aiDiagnosesToday, 0)
    }
  });
});

app.get("/api/approvals", (_req, res) => {
  res.json({
    items: approvalTickets,
    totals: {
      pending: approvalTickets.filter((ticket) => ticket.status === "pending").length,
      approved: approvalTickets.filter((ticket) => ticket.status === "approved").length,
      rejected: approvalTickets.filter((ticket) => ticket.status === "rejected").length,
      highRisk: approvalTickets.filter((ticket) => ticket.riskLevel === "high").length
    }
  });
});

app.post("/api/approvals/:id/action", (req, res) => {
  const { action, comment } = req.body as { action?: string; comment?: string };
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ message: "action must be approve or reject" });
    return;
  }

  const ticket = approvalTickets.find((item) => item.id === req.params.id);
  if (!ticket) {
    res.status(404).json({ message: "Approval ticket not found" });
    return;
  }

  const nextTicket = {
    ...ticket,
    status: action === "approve" ? "approved" : "rejected",
    reviewer: "ops-admin",
    reviewedAt: new Date().toISOString(),
    comment: String(comment ?? "").trim() || (action === "approve" ? "审批通过。" : "审批驳回。")
  };

  approvalTickets = approvalTickets.map((item) => (item.id === nextTicket.id ? nextTicket : item));
  res.json(nextTicket);
});

app.get("/api/models", (_req, res) => {
  res.json({
    items: aiModels,
    totals: {
      models: aiModels.length,
      enabled: aiModels.filter((model) => model.status === "enabled").length,
      chat: aiModels.filter((model) => model.type === "chat").length,
      embedding: aiModels.filter((model) => model.type === "embedding").length
    }
  });
});

app.post("/api/models/:id/default", (req, res) => {
  const model = aiModels.find((item) => item.id === req.params.id);
  if (!model) {
    res.status(404).json({ message: "Model not found" });
    return;
  }

  if (model.status !== "enabled") {
    res.status(400).json({ message: "Only enabled models can be default" });
    return;
  }

  aiModels = aiModels.map((item) => ({ ...item, isDefault: item.id === model.id }));
  res.json(aiModels.find((item) => item.id === model.id));
});

app.post("/api/models/:id/toggle", (req, res) => {
  const model = aiModels.find((item) => item.id === req.params.id);
  if (!model) {
    res.status(404).json({ message: "Model not found" });
    return;
  }

  const nextStatus = model.status === "enabled" ? "disabled" : "enabled";
  aiModels = aiModels.map((item) => {
    if (item.id !== model.id) {
      return item;
    }
    return {
      ...item,
      status: nextStatus,
      isDefault: nextStatus === "disabled" ? false : item.isDefault
    };
  });

  if (!aiModels.some((item) => item.isDefault) && aiModels.some((item) => item.status === "enabled")) {
    const firstEnabled = aiModels.find((item) => item.status === "enabled");
    aiModels = aiModels.map((item) => ({ ...item, isDefault: item.id === firstEnabled?.id }));
  }

  res.json(aiModels.find((item) => item.id === model.id));
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

function scriptDescription(id: string): string {
  const descriptions: Record<string, string> = {
    "scr-001": "采集 Linux 主机 CPU、内存、磁盘、负载、端口和基础服务状态，适合低风险巡检。",
    "scr-002": "对 Nginx 配置执行语法检查，通过后 reload 服务。生产环境需要审批。",
    "scr-003": "查询 PostgreSQL 当前连接数、活跃会话和等待事件，用于数据库连接数异常诊断。"
  };
  return descriptions[id] ?? "团队可复用自动化脚本。";
}

function scriptParameters(id: string): Array<{ name: string; required: boolean; defaultValue: string }> {
  const parameters: Record<string, Array<{ name: string; required: boolean; defaultValue: string }>> = {
    "scr-001": [
      { name: "items", required: false, defaultValue: "cpu,memory,disk,load" },
      { name: "timeout", required: false, defaultValue: "30s" }
    ],
    "scr-002": [
      { name: "service", required: true, defaultValue: "nginx" },
      { name: "validate_config", required: false, defaultValue: "true" }
    ],
    "scr-003": [
      { name: "database", required: true, defaultValue: "postgres" },
      { name: "min_duration", required: false, defaultValue: "30s" }
    ]
  };
  return parameters[id] ?? [];
}

function scriptContent(id: string): string {
  const contents: Record<string, string> = {
    "scr-001": "#!/usr/bin/env bash\\nset -euo pipefail\\nuptime\\ndf -h\\nfree -m\\nps aux --sort=-%cpu | head -10",
    "scr-002": "#!/usr/bin/env bash\\nset -euo pipefail\\nnginx -t\\nsystemctl reload nginx\\nsystemctl status nginx --no-pager",
    "scr-003": "select state, count(*) from pg_stat_activity group by state;\\nselect pid, wait_event, query from pg_stat_activity where state = 'active' limit 10;"
  };
  return contents[id] ?? "";
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
