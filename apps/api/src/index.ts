import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { generateDiagnosis, testModelConnectivity, type DiagnosisFallback } from "./ai.js";
import { buildChatOpsPlan } from "./chatops.js";
import {
  createAuditLog,
  createAiModel,
  createServer,
  createTaskRecord,
  getRecentMetricTrends,
  getAiModelForRuntime,
  getAiModel,
  getAiModels,
  getApprovalTickets,
  getAlert,
  getAlerts,
  getAuditLogs,
  getManagedFile,
  getManagedFiles,
  getMembers,
  getDefaultAiModelForRuntime,
  getPackage,
  getPackages,
  getPermissions,
  getRoles,
  getScript,
  getScripts,
  getServer,
  getServerInventory,
  getServerMetrics,
  getLatestExtendedMetrics,
  getServers,
  getSlashCommands,
  getTaskRecords,
  getTeams,
  getTenants,
  initializeDatabase,
  recordAgentMetrics,
  registerAgent,
  reviewApprovalTicket,
  setDefaultAiModel,
  toggleAiModel,
  toggleMember,
  toggleRole,
  toggleRolePermission,
  toggleTeam,
  updateMemberRole,
  type AgentMetricInput,
  type AgentRegistrationInput,
  type AiModelInput,
  type ServerRecord
} from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "nextops-api", time: new Date().toISOString() });
});

app.get("/api/dashboard/summary", async (_req, res, next) => {
  try {
    const [servers, alerts, scripts, slashCommands, tasks, trends] = await Promise.all([
      getServers(),
      getAlerts(),
      getScripts(),
      getSlashCommands(),
      getTaskRecords(200),
      getRecentMetricTrends()
    ]);
    const onlineServers = servers.filter((server) => server.agentStatus === "online").length;
    const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
    const today = new Date().toISOString().slice(0, 10);
    const aiDiagnosesToday = tasks.filter((task) => task.taskType.includes("diagnose") && task.createdAt.startsWith(today)).length;

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
        aiDiagnosesToday
      },
      trends
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/chatops/message", async (req, res, next) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      res.status(400).json({ message: "message is required" });
      return;
    }

    const useModel = req.body?.useModel !== false;
    res.json(await createChatOpsResponse(message, useModel));
  } catch (error) {
    next(error);
  }
});

app.post("/api/chatops/stream", async (req, res, next) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      res.status(400).json({ message: "message is required" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    writeStreamEvent(res, "status", { message: "正在理解请求并关联资产上下文..." });

    const response = await createChatOpsResponse(message, req.body?.useModel !== false);
    writeStreamEvent(res, "meta", {
      intent: response.intent,
      riskLevel: response.riskLevel,
      mode: response.mode,
      executionMode: response.executionMode,
      taskId: response.taskId,
      status: response.status,
      warnings: response.warnings
    });

    const content = [
      response.reply,
      "",
      "执行计划：",
      ...response.plan.map((item: string, index: number) => `${index + 1}. ${item}`),
      ...(response.warnings.length > 0 ? ["", "注意：", ...response.warnings.map((item: string) => `- ${item}`)] : [])
    ].join("\n");

    for (const chunk of chunkText(content, 18)) {
      writeStreamEvent(res, "chunk", { text: chunk });
      await wait(12);
    }
    writeStreamEvent(res, "done", response);
    res.end();
  } catch (error) {
    next(error);
  }
});

async function createChatOpsResponse(message: string, useModel: boolean) {
  const [servers, alerts, scripts, model] = await Promise.all([
    getServers(),
    getAlerts(),
    getScripts(),
    useModel ? getDefaultAiModelForRuntime() : Promise.resolve(null)
  ]);
  const plan = await buildChatOpsPlan({
    message,
    context: { servers, alerts, scripts },
    model
  });
  const task = await createTaskRecord({
    id: `task-${Date.now().toString(36)}`,
    taskType: `chatops_${plan.intent}`,
    status: plan.requiresApproval ? "waiting_approval" : "planned",
    riskLevel: plan.riskLevel,
    requiresApproval: plan.requiresApproval,
    targetId: plan.targetId,
    targetName: plan.targetName,
    resourceId: plan.resourceId,
    resourceName: plan.resourceName,
    summary: plan.reply,
    plan: plan.plan,
    output: null
  });
  await createAuditLog({
    action: "chatops.plan",
    actor: "ops-admin",
    resourceType: "task",
    resourceId: task.id,
    summary: `ChatOps 生成 ${plan.intent} 计划`,
    details: { message, intent: plan.intent, mode: plan.mode, warnings: plan.warnings }
  });

  return {
    input: message,
    commandMode: message.startsWith("/"),
    taskId: task.id,
    status: task.status,
    executionMode: "planned_only",
    ...plan,
    warnings: [
      ...plan.warnings,
      "当前 ChatOps 已接入意图编排和任务创建，但执行器尚未接入，不会直接操作真实主机。"
    ]
  };
}

function writeStreamEvent(res: express.Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function chunkText(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  } catch (error) {
    next(error);
  }
});

app.get("/api/servers/:id", async (req, res, next) => {
  try {
    const [server, inventory, metrics, latest] = await Promise.all([
      getServer(req.params.id),
      getServerInventory(req.params.id),
      getServerMetrics(req.params.id, Math.min(Number(req.query.limit) || 60, 360)),
      getLatestExtendedMetrics(req.params.id)
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
      warnings: hasRealMetrics
        ? []
        : ["暂无 Agent 真实指标。请启动本机 Agent 后刷新页面。"]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/servers/:id/processes", async (req, res, next) => {
  try {
    const latest = await getLatestExtendedMetrics(req.params.id);
    res.json({ items: latest?.topProcesses ?? [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/servers/:id/services", async (req, res, next) => {
  try {
    const latest = await getLatestExtendedMetrics(req.params.id);
    res.json({ items: latest?.services ?? [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/servers/:id/logs", async (req, res, next) => {
  try {
    const latest = await getLatestExtendedMetrics(req.params.id);
    res.type("text/plain").send(latest?.recentLogs ?? "");
  } catch (error) {
    next(error);
  }
});

app.post("/api/agents/register", async (req, res, next) => {
  try {
    const body = req.body as Partial<AgentRegistrationInput>;
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
  } catch (error) {
    next(error);
  }
});

app.post("/api/agents/:id/metrics", async (req, res, next) => {
  try {
    const input = req.body as Partial<AgentMetricInput>;
    const metric = await recordAgentMetrics(req.params.id, {
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
    const fallback: DiagnosisFallback = {
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
    };
    const diagnosis = await generateDiagnosis({
      subject: "server",
      context: {
        server,
        pressure,
        telemetry: {
          cpuUsage: server.cpuUsage,
          memoryUsage: server.memoryUsage,
          diskUsage: server.diskUsage,
          loadAvg: server.loadAvg,
          agentStatus: server.agentStatus
        }
      },
      fallback,
      model: await getDefaultAiModelForRuntime()
    });

    res.json({
      serverId: server.id,
      ...diagnosis
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
    const fallback: DiagnosisFallback = {
      summary: `${alert.title}。AI 已关联 ${server.hostname} 的指标、日志来源和资产配置，建议按影响范围优先处理。`,
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
    };
    const diagnosis = await generateDiagnosis({
      subject: "alert",
      context: {
        alert,
        server,
        severity: alert.severity,
        impact: isCritical ? "可能影响生产服务稳定性，需要尽快确认。" : "当前影响可控，建议在观察窗口内处理。"
      },
      fallback,
      model: await getDefaultAiModelForRuntime()
    });

    res.json({
      alertId: alert.id,
      serverId: server.id,
      ...diagnosis,
      impact: isCritical ? "可能影响生产服务稳定性，需要尽快确认。" : "当前影响可控，建议在观察窗口内处理。",
      timeline: [
        { time: alert.triggeredAt, event: "告警触发" },
        { time: new Date().toISOString(), event: "AI 诊断生成" }
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
    const plan = [
      `校验脚本 ${script.name} 的版本和风险等级`,
      `确认目标服务器 ${target.hostname} 的 Agent/SSH 状态`,
      "注入参数并生成执行命令",
      requiresApproval ? "生产或中高风险操作进入审批" : "执行脚本并采集输出",
      "写入任务记录和审计日志"
    ];
    const output = "任务已生成。当前脚本执行器尚未接入，不会真实连接目标服务器。";
    const task = await createTaskRecord({
      id: `task-${Date.now().toString(36)}`,
      taskType: "script_run",
      status: requiresApproval ? "waiting_approval" : "planned",
      riskLevel: script.riskLevel,
      requiresApproval,
      targetId: target.id,
      targetName: target.hostname,
      resourceId: script.id,
      resourceName: script.name,
      summary: `运行脚本 ${script.name}`,
      plan,
      output
    });
    await createAuditLog({
      action: "script.run",
      actor: "ops-admin",
      resourceType: "script",
      resourceId: script.id,
      summary: `向 ${target.hostname} 发起脚本 ${script.name}`,
      details: { taskId: task.id, targetId: target.id, requiresApproval }
    });

    res.json({
      taskId: task.id,
      scriptId: script.id,
      scriptName: script.name,
      target: {
        id: target.id,
        hostname: target.hostname,
        ip: target.ip,
        environment: target.environment
      },
      status: requiresApproval ? "waiting_approval" : "planned",
      riskLevel: script.riskLevel,
      requiresApproval,
      plan,
      output,
      executionMode: "planned_only",
      warnings: ["当前只创建脚本执行任务和审计记录，尚未真实执行脚本。"]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/slash-commands", async (_req, res, next) => {
  try {
    res.json({ items: await getSlashCommands() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/packages", async (_req, res, next) => {
  try {
    res.json({ items: await getPackages() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/packages/:id/deploy-plan", async (req, res, next) => {
  try {
    const item = await getPackage(req.params.id);
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
    const steps = [
      `校验包 ${item.name}@${item.version} 的 checksum`,
      `确认目标服务器 ${target.hostname} 的磁盘空间和 Agent 状态`,
      "分发包到目标服务器临时目录",
      item.type === "agent" ? "执行 Agent 安装/升级脚本" : "执行部署或配置替换动作",
      "记录包使用记录和部署审计"
    ];
    const task = await createTaskRecord({
      id: `task-${Date.now().toString(36)}`,
      taskType: "package_deploy_plan",
      status: requiresApproval ? "waiting_approval" : "planned",
      riskLevel: requiresApproval ? "medium" : "low",
      requiresApproval,
      targetId: target.id,
      targetName: target.hostname,
      resourceId: item.id,
      resourceName: item.name,
      summary: `分发包 ${item.name}@${item.version}`,
      plan: steps,
      output: null
    });
    await createAuditLog({
      action: "package.deploy_plan",
      actor: "ops-admin",
      resourceType: "package",
      resourceId: item.id,
      summary: `生成 ${item.name}@${item.version} 分发计划`,
      details: { taskId: task.id, targetId: target.id, requiresApproval }
    });

    res.json({
      taskId: task.id,
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
      steps,
      executionMode: "planned_only",
      warnings: ["当前只生成包分发计划，尚未上传、校验或部署真实制品。"]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/files", async (_req, res, next) => {
  try {
    res.json({ items: await getManagedFiles() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/files/:id/transfer-plan", async (req, res, next) => {
  try {
    const file = await getManagedFile(req.params.id);
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

    const riskLevel = file.type === "script" || target.environment === "production" ? "medium" : "low";
    const requiresApproval = target.environment === "production";
    const steps =
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
          ];
    const task = await createTaskRecord({
      id: `task-${Date.now().toString(36)}`,
      taskType: "file_transfer_plan",
      status: requiresApproval ? "waiting_approval" : "planned",
      riskLevel,
      requiresApproval,
      targetId: target.id,
      targetName: target.hostname,
      resourceId: file.id,
      resourceName: file.name,
      summary: `${mode === "pull" ? "拉取" : "分发"}文件 ${file.name}`,
      plan: steps,
      output: null
    });
    await createAuditLog({
      action: "file.transfer_plan",
      actor: "ops-admin",
      resourceType: "file",
      resourceId: file.id,
      summary: `生成 ${file.name} 文件${mode === "pull" ? "拉取" : "分发"}计划`,
      details: { taskId: task.id, targetId: target.id, mode, requiresApproval }
    });

    res.json({
      taskId: task.id,
      fileId: file.id,
      fileName: file.name,
      mode,
      target: {
        id: target.id,
        hostname: target.hostname,
        environment: target.environment
      },
      riskLevel,
      requiresApproval,
      steps,
      executionMode: "planned_only",
      warnings: ["当前只生成文件传输计划，尚未真实读写目标主机文件。"]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/tenants/summary", async (_req, res, next) => {
  try {
    const tenants = await getTenants();
    res.json({
      items: tenants,
      totals: {
        tenants: tenants.length,
        servers: tenants.reduce((total, tenant) => total + tenant.servers, 0),
        alerts: tenants.reduce((total, tenant) => total + tenant.alerts, 0),
        aiDiagnosesToday: tenants.reduce((total, tenant) => total + tenant.aiDiagnosesToday, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/approvals", async (_req, res, next) => {
  try {
    const approvalTickets = await getApprovalTickets();
    res.json({
      items: approvalTickets,
      totals: {
        pending: approvalTickets.filter((ticket) => ticket.status === "pending").length,
        approved: approvalTickets.filter((ticket) => ticket.status === "approved").length,
        rejected: approvalTickets.filter((ticket) => ticket.status === "rejected").length,
        highRisk: approvalTickets.filter((ticket) => ticket.riskLevel === "high").length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/approvals/:id/action", async (req, res, next) => {
  try {
    const { action, comment } = req.body as { action?: string; comment?: string };
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ message: "action must be approve or reject" });
      return;
    }

    const reviewedTicket = await reviewApprovalTicket(
      req.params.id,
      action,
      String(comment ?? "").trim() || (action === "approve" ? "审批通过。" : "审批驳回。")
    );
    if (!reviewedTicket) {
      res.status(404).json({ message: "Approval ticket not found" });
      return;
    }

    await createAuditLog({
      action: `approval.${action}`,
      actor: "ops-admin",
      resourceType: "approval_ticket",
      resourceId: reviewedTicket.id,
      summary: `${action === "approve" ? "通过" : "驳回"}审批工单 ${reviewedTicket.title}`,
      details: { status: reviewedTicket.status, comment: reviewedTicket.comment }
    });

    res.json(reviewedTicket);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tasks", async (_req, res, next) => {
  try {
    res.json({ items: await getTaskRecords() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/audit-logs", async (_req, res, next) => {
  try {
    res.json({ items: await getAuditLogs() });
  } catch (error) {
    next(error);
  }
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
  const model = await getAiModelForRuntime(req.params.id);
    if (!model) {
      res.status(404).json({ message: "Model not found" });
      return;
    }

  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  const connectivity = await testModelConnectivity({ model });

  res.json({
    modelId: model.id,
    ok: connectivity.ok,
    status: connectivity.status,
    latencyMs: Date.now() - startedAt,
    checkedAt,
    checks: connectivity.checks,
    warnings: connectivity.warnings
  });
  } catch (error) {
    next(error);
  }
});

app.get("/api/members", async (_req, res, next) => {
  try {
    const nextMembers = await getMembers();
    res.json({
      items: nextMembers,
      totals: {
        members: nextMembers.length,
        active: nextMembers.filter((member) => member.status === "active").length,
        pending: nextMembers.filter((member) => member.status === "pending").length,
        admins: nextMembers.filter((member) => member.role === "Owner").length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/members/:id/toggle", async (req, res, next) => {
  try {
    const member = await toggleMember(req.params.id);
    if (!member) {
      res.status(404).json({ message: "Member not found" });
      return;
    }
    res.json(member);
  } catch (error) {
    next(error);
  }
});

app.post("/api/members/:id/role", async (req, res, next) => {
  try {
  const { role } = req.body as { role?: string };
  if (!role || !["Owner", "SRE", "Reviewer", "Developer"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

    const member = await updateMemberRole(req.params.id, role);
    if (!member) {
      res.status(404).json({ message: "Member not found" });
      return;
    }
    res.json(member);
  } catch (error) {
    next(error);
  }
});

app.get("/api/teams/summary", async (_req, res, next) => {
  try {
    const nextTeams = await getTeams();
    res.json({
      items: nextTeams,
      totals: {
        teams: nextTeams.length,
        active: nextTeams.filter((team) => team.status === "active").length,
        members: nextTeams.reduce((total, team) => total + team.memberCount, 0),
        servers: nextTeams.reduce((total, team) => total + team.serverCount, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/teams/:id/toggle", async (req, res, next) => {
  try {
    const team = await toggleTeam(req.params.id);
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }
    res.json(team);
  } catch (error) {
    next(error);
  }
});

app.get("/api/roles/summary", async (_req, res, next) => {
  try {
    const [nextRoles, permissions] = await Promise.all([getRoles(), getPermissions()]);
    res.json({
      items: nextRoles,
      permissions,
      totals: {
        roles: nextRoles.length,
        enabled: nextRoles.filter((role) => role.status === "enabled").length,
        permissions: permissions.length,
        assignments: nextRoles.reduce((total, role) => total + role.memberCount, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/roles/:id/toggle", async (req, res, next) => {
  try {
    const role = await toggleRole(req.params.id);
    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }
    res.json(role);
  } catch (error) {
    next(error);
  }
});

app.post("/api/roles/:id/permission", async (req, res, next) => {
  try {
  const { permission } = req.body as { permission?: string };
  const permissionKey = String(permission ?? "");
    const permissions = await getPermissions();
  if (!permissions.some((item) => item.key === permissionKey)) {
    res.status(400).json({ message: "Invalid permission" });
    return;
  }

    const role = await toggleRolePermission(req.params.id, permissionKey);
    if (!role) {
      res.status(404).json({ message: "Role not found" });
      return;
    }
    res.json(role);
  } catch (error) {
    next(error);
  }
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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildAlertRules(cpu: number, memory: number, disk: number) {
  const rules = [
    { id: "rule-cpu-80", name: "CPU 使用率高于 80%", metric: "cpu_usage", threshold: 80, enabled: true },
    { id: "rule-cpu-90", name: "CPU 使用率高于 90%", metric: "cpu_usage", threshold: 90, enabled: true },
    { id: "rule-mem-80", name: "内存使用率高于 80%", metric: "memory_usage", threshold: 80, enabled: true },
    { id: "rule-mem-90", name: "内存使用率高于 90%", metric: "memory_usage", threshold: 90, enabled: true },
    { id: "rule-disk-85", name: "磁盘使用率高于 85%", metric: "disk_usage", threshold: 85, enabled: true },
    { id: "rule-disk-95", name: "磁盘使用率高于 95%", metric: "disk_usage", threshold: 95, enabled: true }
  ];
  return rules.map((rule) => {
    let current = 0;
    if (rule.metric === "cpu_usage") current = cpu;
    else if (rule.metric === "memory_usage") current = memory;
    else if (rule.metric === "disk_usage") current = disk;
    return { ...rule, current, triggered: current >= rule.threshold };
  });
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
