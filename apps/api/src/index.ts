import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  createAiModel,
  createServer,
  getAiModel,
  getAiModels,
  getAlert,
  getAlerts,
  getScript,
  getScripts,
  getServer,
  getServers,
  initializeDatabase,
  setDefaultAiModel,
  toggleAiModel,
  type AiModelInput,
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

let members = [
  {
    id: "mem-001",
    name: "Leo Hang",
    email: "leo@example.com",
    role: "Owner",
    team: "平台工程",
    status: "active",
    lastSeenAt: "2026-05-12T07:58:00.000Z",
    permissions: ["全局配置", "模型管理", "审批处理", "服务器纳管"]
  },
  {
    id: "mem-002",
    name: "SRE Oncall",
    email: "sre@example.com",
    role: "SRE",
    team: "稳定性团队",
    status: "active",
    lastSeenAt: "2026-05-12T06:40:00.000Z",
    permissions: ["告警处理", "脚本执行", "AI 诊断"]
  },
  {
    id: "mem-003",
    name: "DevOps Reviewer",
    email: "devops@example.com",
    role: "Reviewer",
    team: "DevOps Lab",
    status: "pending",
    lastSeenAt: null,
    permissions: ["工单审核", "部署确认"]
  }
];

let teams = [
  {
    id: "team-platform",
    name: "平台工程",
    parentId: null,
    type: "root",
    status: "active",
    lead: "Leo Hang",
    memberCount: 6,
    serverCount: 12,
    approvalSla: "30m",
    description: "负责 NextOps 平台、模型网关、自动化编排和核心配置。",
    responsibilities: ["平台配置", "模型管理", "权限治理", "自动化编排"]
  },
  {
    id: "team-sre",
    name: "稳定性团队",
    parentId: "team-platform",
    type: "sre",
    status: "active",
    lead: "SRE Oncall",
    memberCount: 8,
    serverCount: 27,
    approvalSla: "15m",
    description: "负责生产环境巡检、告警处理、排障与容量趋势分析。",
    responsibilities: ["告警处理", "巡检", "故障诊断", "容量治理"]
  },
  {
    id: "team-devops",
    name: "DevOps Lab",
    parentId: "team-platform",
    type: "devops",
    status: "active",
    lead: "DevOps Reviewer",
    memberCount: 5,
    serverCount: 8,
    approvalSla: "45m",
    description: "负责 CI/CD 集成、脚本模板、包分发和发布审批。",
    responsibilities: ["发布审批", "脚本模板", "包管理", "流水线集成"]
  },
  {
    id: "team-cloud",
    name: "私有云运维",
    parentId: "team-platform",
    type: "cloud",
    status: "review",
    lead: "Cloud Admin",
    memberCount: 3,
    serverCount: 15,
    approvalSla: "60m",
    description: "负责私有云接入、云原生资源和多协议插件驱动。",
    responsibilities: ["私有云接入", "Kubernetes", "插件驱动", "云资源同步"]
  }
];

let roles = [
  {
    id: "role-owner",
    name: "Owner",
    scope: "global",
    status: "enabled",
    memberCount: 1,
    description: "拥有平台全部管理能力，适合平台负责人和超级管理员。",
    permissions: ["dashboard:read", "server:manage", "script:execute", "approval:review", "model:manage", "member:manage", "role:manage"]
  },
  {
    id: "role-sre",
    name: "SRE",
    scope: "tenant",
    status: "enabled",
    memberCount: 1,
    description: "负责巡检、告警、诊断和常规自动化执行。",
    permissions: ["dashboard:read", "server:manage", "script:execute", "approval:request"]
  },
  {
    id: "role-reviewer",
    name: "Reviewer",
    scope: "tenant",
    status: "enabled",
    memberCount: 1,
    description: "负责高风险脚本、包分发、生产变更的审批。",
    permissions: ["dashboard:read", "approval:review", "script:read"]
  },
  {
    id: "role-developer",
    name: "Developer",
    scope: "team",
    status: "disabled",
    memberCount: 0,
    description: "允许查看资产、触发低风险脚本和发起部署申请。",
    permissions: ["dashboard:read", "server:read", "script:read", "approval:request"]
  }
];

const permissionCatalog = [
  { key: "dashboard:read", label: "查看仪表盘", group: "核心业务" },
  { key: "server:read", label: "查看服务器", group: "资产" },
  { key: "server:manage", label: "管理服务器", group: "资产" },
  { key: "script:read", label: "查看脚本", group: "自动化" },
  { key: "script:execute", label: "执行脚本", group: "自动化" },
  { key: "approval:request", label: "发起审批", group: "审批" },
  { key: "approval:review", label: "审核工单", group: "审批" },
  { key: "model:manage", label: "管理模型", group: "设置" },
  { key: "member:manage", label: "管理成员", group: "设置" },
  { key: "role:manage", label: "管理角色", group: "设置" }
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

app.get("/api/models", async (_req, res, next) => {
  try {
    const models = await getAiModels();
    res.json({
      items: models,
      totals: {
        models: models.length,
        enabled: models.filter((model) => model.status === "enabled").length,
        chat: models.filter((model) => model.type === "chat").length,
        embedding: models.filter((model) => model.type === "embedding").length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/models", async (req, res, next) => {
  try {
  const body = req.body as {
    id?: string;
    name?: string;
    provider?: string;
    type?: string;
    endpoint?: string;
    apiKey?: string;
    contextWindow?: string;
    costLevel?: string;
    capabilities?: string[];
    setDefault?: boolean;
  };
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const endpoint = String(body.endpoint ?? "").trim();
  const provider = String(body.provider ?? "OpenAI Compatible").trim();
  const type = String(body.type ?? "chat").trim();

  if (!id || !name || !endpoint) {
    res.status(400).json({ message: "id, name and endpoint are required" });
    return;
  }
  if (await getAiModel(id)) {
    res.status(409).json({ message: "Model id already exists" });
    return;
  }

  const nextModel: AiModelInput = {
    id,
    name,
    provider,
    type,
    status: "enabled",
    isDefault: Boolean(body.setDefault),
    contextWindow: String(body.contextWindow ?? "32k").trim() || "32k",
    latencyMs: provider.toLowerCase().includes("local") ? 180 : 650,
    costLevel: String(body.costLevel ?? "medium").trim() || "medium",
    capabilities: Array.isArray(body.capabilities) && body.capabilities.length > 0
      ? body.capabilities.map(String).map((item) => item.trim()).filter(Boolean)
      : ["ChatOps", "日志诊断", "修复方案生成"],
    endpoint
  };

  const apiKey = String(body.apiKey ?? "").trim();
  if (apiKey) {
    nextModel.apiKeySecret = apiKey;
  }

  res.status(201).json(await createAiModel(nextModel));
  } catch (error) {
    next(error);
  }
});

app.post("/api/models/:id/default", async (req, res, next) => {
  try {
    const model = await setDefaultAiModel(req.params.id);
    if (!model) {
      res.status(404).json({ message: "Model not found" });
      return;
    }
    res.json(model);
  } catch (error) {
    if (error instanceof Error && error.message === "Only enabled models can be default") {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post("/api/models/:id/toggle", async (req, res, next) => {
  try {
    const model = await toggleAiModel(req.params.id);
    if (!model) {
      res.status(404).json({ message: "Model not found" });
      return;
    }
    res.json(model);
  } catch (error) {
    next(error);
  }
});

app.post("/api/models/:id/test", async (req, res, next) => {
  try {
  const model = await getAiModel(req.params.id);
    if (!model) {
      res.status(404).json({ message: "Model not found" });
      return;
    }

  const keyConfigured = model.apiKeyConfigured;
  const isLocal = model.provider.toLowerCase().includes("local") || model.endpoint.includes("localhost");
  const warnings = [
    !keyConfigured && !isLocal ? "未配置 API Key，远程模型调用会失败。" : "",
    model.status !== "enabled" ? "模型当前未启用。" : ""
  ].filter(Boolean);

  res.json({
    modelId: model.id,
    ok: warnings.length === 0,
    status: warnings.length === 0 ? "reachable" : "attention",
    latencyMs: model.latencyMs,
    checkedAt: new Date().toISOString(),
    checks: [
      `Endpoint: ${model.endpoint}`,
      `Provider: ${model.provider}`,
      keyConfigured ? "API Key: configured" : isLocal ? "API Key: not required for local model" : "API Key: missing",
      `Model status: ${model.status}`
    ],
    warnings
  });
  } catch (error) {
    next(error);
  }
});

app.get("/api/members", (_req, res) => {
  res.json({
    items: members,
    totals: {
      members: members.length,
      active: members.filter((member) => member.status === "active").length,
      pending: members.filter((member) => member.status === "pending").length,
      admins: members.filter((member) => member.role === "Owner").length
    }
  });
});

app.post("/api/members/:id/toggle", (req, res) => {
  const member = members.find((item) => item.id === req.params.id);
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }

  const nextStatus = member.status === "active" ? "disabled" : "active";
  members = members.map((item) => (item.id === member.id ? { ...item, status: nextStatus } : item));
  res.json(members.find((item) => item.id === member.id));
});

app.post("/api/members/:id/role", (req, res) => {
  const { role } = req.body as { role?: string };
  const member = members.find((item) => item.id === req.params.id);
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }
  if (!role || !["Owner", "SRE", "Reviewer", "Developer"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  members = members.map((item) => (item.id === member.id ? { ...item, role } : item));
  res.json(members.find((item) => item.id === member.id));
});

app.get("/api/teams/summary", (_req, res) => {
  res.json({
    items: teams.map((team) => ({
      ...team,
      members: members.filter((member) => member.team === team.name)
    })),
    totals: {
      teams: teams.length,
      active: teams.filter((team) => team.status === "active").length,
      members: teams.reduce((total, team) => total + team.memberCount, 0),
      servers: teams.reduce((total, team) => total + team.serverCount, 0)
    }
  });
});

app.post("/api/teams/:id/toggle", (req, res) => {
  const team = teams.find((item) => item.id === req.params.id);
  if (!team) {
    res.status(404).json({ message: "Team not found" });
    return;
  }

  const nextStatus = team.status === "active" ? "review" : "active";
  teams = teams.map((item) => (item.id === team.id ? { ...item, status: nextStatus } : item));
  const nextTeam = teams.find((item) => item.id === team.id);
  res.json({
    ...nextTeam,
    members: members.filter((member) => member.team === nextTeam?.name)
  });
});

app.get("/api/roles/summary", (_req, res) => {
  res.json({
    items: roles,
    permissions: permissionCatalog,
    totals: {
      roles: roles.length,
      enabled: roles.filter((role) => role.status === "enabled").length,
      permissions: permissionCatalog.length,
      assignments: roles.reduce((total, role) => total + role.memberCount, 0)
    }
  });
});

app.post("/api/roles/:id/toggle", (req, res) => {
  const role = roles.find((item) => item.id === req.params.id);
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }

  const nextStatus = role.status === "enabled" ? "disabled" : "enabled";
  roles = roles.map((item) => (item.id === role.id ? { ...item, status: nextStatus } : item));
  res.json(roles.find((item) => item.id === role.id));
});

app.post("/api/roles/:id/permission", (req, res) => {
  const { permission } = req.body as { permission?: string };
  const role = roles.find((item) => item.id === req.params.id);
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }
  const permissionKey = String(permission ?? "");
  if (!permissionCatalog.some((item) => item.key === permissionKey)) {
    res.status(400).json({ message: "Invalid permission" });
    return;
  }

  const hasPermission = role.permissions.includes(permissionKey);
  roles = roles.map((item) =>
    item.id === role.id
      ? {
          ...item,
          permissions: hasPermission
            ? item.permissions.filter((key) => key !== permissionKey)
            : [...item.permissions, permissionKey]
        }
      : item
  );
  res.json(roles.find((item) => item.id === role.id));
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
