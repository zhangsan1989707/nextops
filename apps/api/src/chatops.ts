import { openAiCompatibleChatUrl, resolveModelApiKey } from "./ai.js";
import type { AiModelRuntimeRecord, AlertRecord, ScriptRecord, ServerRecord } from "./db.js";

export type ChatOpsIntent = "open_web_ssh" | "ai_diagnose" | "deployment_plan" | "health_check" | "script_run";
export type ChatOpsMode = "model" | "rule_fallback";

export type ChatOpsPlan = {
  intent: ChatOpsIntent;
  riskLevel: "low" | "medium" | "high";
  reply: string;
  plan: string[];
  targetId: string | null;
  targetName: string | null;
  resourceId: string;
  resourceName: string;
  requiresApproval: boolean;
  warnings: string[];
  mode: ChatOpsMode;
};

export type ChatOpsContext = {
  servers: ServerRecord[];
  alerts: AlertRecord[];
  scripts: ScriptRecord[];
};

type FetchLike = typeof fetch;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type ModelPlan = Partial<Omit<ChatOpsPlan, "mode" | "warnings">> & {
  warnings?: string[];
};

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);

export async function buildChatOpsPlan(options: {
  message: string;
  context: ChatOpsContext;
  model: AiModelRuntimeRecord | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<ChatOpsPlan> {
  const fallback = buildRulePlan(options.message, options.context);
  const model = options.model;
  if (!model) {
    return withWarning(fallback, "未配置可用默认模型。");
  }
  if (model.status !== "enabled") {
    return withWarning(fallback, `默认模型 ${model.id} 未启用。`);
  }

  const apiKey = resolveModelApiKey(model);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(model.endpoint);
  if (!apiKey && !isLocal) {
    return withWarning(fallback, `默认模型 ${model.id} 缺少 API Key。`);
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(openAiCompatibleChatUrl(model.endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: model.id,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是 NextOps ChatOps 编排器。只返回 JSON，字段为 intent,riskLevel,reply,plan,targetId,targetName,resourceId,resourceName,requiresApproval。不要编造不存在的资产，不能执行真实命令，只能生成可审批计划。"
          },
          {
            role: "user",
            content: JSON.stringify({
              message: options.message,
              availableIntents: ["open_web_ssh", "ai_diagnose", "deployment_plan", "health_check", "script_run"],
              context: summarizeContext(options.context)
            })
          }
        ]
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    });

    if (!response.ok) {
      return withWarning(fallback, `模型编排失败：HTTP ${response.status}。`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const parsed = parseModelPlan(extractAssistantContent(payload));
    return normalizeModelPlan(parsed, fallback);
  } catch (error) {
    return withWarning(fallback, modelFailureWarning(error));
  }
}

export function buildRulePlan(message: string, context: ChatOpsContext): ChatOpsPlan {
  const trimmed = message.trim();
  const lowered = trimmed.toLowerCase();
  const commandMode = trimmed.startsWith("/");
  const targetServer = findServer(trimmed, context.servers);
  const targetAlert = findAlert(trimmed, context.alerts);
  const targetScript = findScript(trimmed, context.scripts);

  // SSH 连接
  if (lowered.includes("ssh") || lowered.startsWith("/ssh")) {
    return {
      intent: "open_web_ssh",
      riskLevel: "medium",
      reply: targetServer
        ? `已生成 ${targetServer.hostname}（${targetServer.ip}）的 Web SSH 连接计划。当前执行器未接入，任务会进入 planned 状态等待后续网关执行。`
        : "已生成 Web SSH 连接计划，但未指定目标服务器。请在消息中包含服务器主机名或 IP。",
      plan: [
        `目标: ${targetServer ? `${targetServer.hostname} (${targetServer.ip}:${targetServer.port})` : "未指定"}`,
        "校验用户是否具备 server:ssh 权限",
        "创建 Web SSH 会话任务",
        "等待 Web SSH Gateway 接入后执行并记录会话审计"
      ],
      targetId: targetServer?.id ?? null,
      targetName: targetServer?.hostname ?? null,
      resourceId: "web-ssh",
      resourceName: "Web SSH",
      requiresApproval: targetServer?.environment === "production",
      warnings: commandMode ? [] : ["自然语言 SSH 请求已按中风险计划处理。"],
      mode: "rule_fallback"
    };
  }

  // 诊断
  if (lowered.includes("diagnose") || lowered.includes("诊断") || lowered.startsWith("/diagnose")) {
    const target = targetAlert ?? context.alerts[0] ?? null;
    const relatedServer = target?.serverId
      ? context.servers.find((s) => s.id === target.serverId)
      : targetServer;
    return {
      intent: "ai_diagnose",
      riskLevel: target?.severity === "critical" ? "high" : "medium",
      reply: target
        ? `已定位告警「${target.title}」（${target.severity}，${target.status}），关联资源: ${relatedServer?.hostname ?? target.serverId ?? "未知"}。`
        : targetServer
          ? `当前 ${targetServer.hostname} 无活跃告警。资源状态: ${targetServer.status}，CPU ${targetServer.cpuUsage}%，内存 ${targetServer.memoryUsage}%，磁盘 ${targetServer.diskUsage}%。`
          : "未匹配到具体告警或资源，请指定诊断目标。",
      plan: [
        target ? `告警: ${target.title}（${target.severity}）` : "无活跃告警，执行常规健康诊断",
        relatedServer ? `关联资源: ${relatedServer.hostname} (${relatedServer.ip})` : "需要人工指定关联资源",
        "读取相关资源指标与告警上下文",
        "生成诊断报告和修复建议"
      ],
      targetId: target?.serverId ?? targetServer?.id ?? null,
      targetName: target?.title ?? targetServer?.hostname ?? null,
      resourceId: target?.id ?? "ai-diagnosis",
      resourceName: target?.title ?? "AI 诊断",
      requiresApproval: false,
      warnings: target ? [] : ["未匹配到明确告警，计划需要人工补充目标。"],
      mode: "rule_fallback"
    };
  }

  // 部署
  if (lowered.includes("deploy") || lowered.includes("部署") || lowered.startsWith("/deploy")) {
    return {
      intent: "deployment_plan",
      riskLevel: "medium",
      reply: targetServer
        ? `已生成 ${targetServer.hostname}（${targetServer.environment}）的部署计划。当前包分发执行器未接入，因此只创建 planned 任务。`
        : "已生成部署计划，但未指定目标资源。生产环境变更需要审批。",
      plan: [
        `目标环境: ${targetServer ? `${targetServer.hostname} (${targetServer.environment})` : "未指定"}`,
        "识别服务、版本和制品包",
        "校验回滚策略和依赖关系",
        "生产环境变更进入审批流程"
      ],
      targetId: targetServer?.id ?? null,
      targetName: targetServer?.hostname ?? null,
      resourceId: "deployment",
      resourceName: "部署计划",
      requiresApproval: true,
      warnings: ["部署执行器尚未接入，本次不会真实发布。"],
      mode: "rule_fallback"
    };
  }

  // 脚本执行
  if (lowered.includes("script") || lowered.includes("脚本") || lowered.includes("执行") || targetScript) {
    return {
      intent: "script_run",
      riskLevel: targetScript?.riskLevel === "high" ? "high" : targetScript?.riskLevel === "medium" ? "medium" : "low",
      reply: targetScript
        ? `已匹配脚本「${targetScript.name}」（风险: ${targetScript.riskLevel}），生成执行计划。`
        : `已生成脚本执行计划。${targetServer ? `目标: ${targetServer.hostname}。` : ""}未匹配到具体脚本。`,
      plan: [
        targetScript ? `脚本: ${targetScript.name} (${targetScript.type}, 风险: ${targetScript.riskLevel})` : "需要人工选择目标脚本",
        targetServer ? `目标资源: ${targetServer.hostname} (${targetServer.ip})` : "需要人工指定目标资源",
        "校验脚本参数、版本和风险等级",
        "创建执行任务，等待 Agent 执行器接入"
      ],
      targetId: targetServer?.id ?? null,
      targetName: targetServer?.hostname ?? null,
      resourceId: targetScript?.id ?? "script",
      resourceName: targetScript?.name ?? "脚本执行",
      requiresApproval: targetScript?.riskLevel !== "low" || targetServer?.environment === "production",
      warnings: targetScript ? [] : ["未匹配到具体脚本，计划需要人工选择脚本。"],
      mode: "rule_fallback"
    };
  }

  // 巡检 / 健康检查（默认意图，但根据输入生成具体内容）
  const isInspection = lowered.includes("巡检") || lowered.includes("检查") || lowered.includes("健康")
    || lowered.includes("inspect") || lowered.includes("check") || lowered.includes("status")
    || lowered.includes("状态") || lowered.includes("风险") || lowered.includes("摘要")
    || lowered.includes("risk") || lowered.includes("summary");

  if (targetServer || isInspection) {
    const server = targetServer;
    const serverAlerts = server
      ? context.alerts.filter((a) => a.serverId === server.id && a.status !== "resolved")
      : [];

    if (server) {
      const risks: string[] = [];
      if (server.cpuUsage >= 80) risks.push(`CPU ${server.cpuUsage}% 偏高`);
      if (server.memoryUsage >= 80) risks.push(`内存 ${server.memoryUsage}% 偏高`);
      if (server.diskUsage >= 80) risks.push(`磁盘 ${server.diskUsage}% 偏高`);
      if (server.loadAvg > 4) risks.push(`负载 ${server.loadAvg.toFixed(2)} 偏高`);
      if (server.agentStatus !== "online") risks.push(`Agent 状态: ${server.agentStatus}`);
      if (serverAlerts.length > 0) risks.push(`${serverAlerts.length} 条活跃告警`);

      const healthScore = Math.max(0, 100 - risks.length * 15);
      const riskLevel = risks.length >= 3 ? "high" : risks.length >= 1 ? "medium" : "low";

      return {
        intent: "health_check",
        riskLevel,
        reply: [
          `「${server.hostname}」巡检完成。`,
          ``,
          `**基本信息**`,
          `- IP: ${server.ip}:${server.port} | 环境: ${server.environment}`,
          `- 系统: ${server.os} | Agent: ${server.agentStatus}`,
          ``,
          `**资源使用**`,
          `- CPU: ${server.cpuUsage}% | 内存: ${server.memoryUsage}% | 磁盘: ${server.diskUsage}%`,
          `- 负载均值: ${server.loadAvg.toFixed(2)}`,
          ``,
          risks.length > 0 ? `**风险摘要 (${risks.length} 项)**\n${risks.map((r) => `- ${r}`).join("\n")}` : `**风险摘要**: 未发现异常`,
          ``,
          `健康评分: ${healthScore}/100`,
          serverAlerts.length > 0 ? `\n**关联告警**\n${serverAlerts.map((a) => `- [${a.severity}] ${a.title}`).join("\n")}` : ""
        ].filter(Boolean).join("\n"),
        plan: [
          `目标: ${server.hostname} (${server.ip})`,
          `状态: ${server.status}，Agent: ${server.agentStatus}`,
          `CPU ${server.cpuUsage}% / 内存 ${server.memoryUsage}% / 磁盘 ${server.diskUsage}% / 负载 ${server.loadAvg.toFixed(2)}`,
          serverAlerts.length > 0 ? `活跃告警 ${serverAlerts.length} 条` : "无活跃告警",
          risks.length > 0 ? `风险项 ${risks.length} 个，建议关注` : "各项指标正常"
        ],
        targetId: server.id,
        targetName: server.hostname,
        resourceId: server.id,
        resourceName: server.hostname,
        requiresApproval: false,
        warnings: risks.length > 0 ? risks : [],
        mode: "rule_fallback"
      };
    }

    // 没有指定服务器但要求巡检 - 返回全局摘要
    const allRisks: string[] = [];
    for (const s of context.servers) {
      if (s.cpuUsage >= 80) allRisks.push(`${s.hostname}: CPU ${s.cpuUsage}%`);
      if (s.memoryUsage >= 80) allRisks.push(`${s.hostname}: 内存 ${s.memoryUsage}%`);
      if (s.diskUsage >= 80) allRisks.push(`${s.hostname}: 磁盘 ${s.diskUsage}%`);
      if (s.agentStatus !== "online") allRisks.push(`${s.hostname}: Agent ${s.agentStatus}`);
    }
    const unresolvedAlerts = context.alerts.filter((a) => a.status !== "resolved");

    return {
      intent: "health_check",
      riskLevel: allRisks.length >= 3 ? "high" : allRisks.length >= 1 ? "medium" : "low",
      reply: [
        `全局巡检完成。`,
        ``,
        `**资源概况** (共 ${context.servers.length} 台)`,
        context.servers.map((s) => `- ${s.hostname}: CPU ${s.cpuUsage}% / 内存 ${s.memoryUsage}% / 磁盘 ${s.diskUsage}% [${s.status}]`).join("\n"),
        ``,
        unresolvedAlerts.length > 0
          ? `**未解决告警** (${unresolvedAlerts.length} 条)\n${unresolvedAlerts.map((a) => `- [${a.severity}] ${a.title}`).join("\n")}`
          : `**告警**: 无`,
        ``,
        allRisks.length > 0
          ? `**风险摘要** (${allRisks.length} 项)\n${allRisks.map((r) => `- ${r}`).join("\n")}`
          : `**风险摘要**: 未发现异常`
      ].join("\n"),
      plan: [
        `扫描 ${context.servers.length} 台资源`,
        ...context.servers.map((s) => `${s.hostname}: CPU ${s.cpuUsage}% / 内存 ${s.memoryUsage}% / 磁盘 ${s.diskUsage}%`),
        unresolvedAlerts.length > 0 ? `未解决告警 ${unresolvedAlerts.length} 条` : "无告警",
        allRisks.length > 0 ? `发现 ${allRisks.length} 个风险项` : "各项指标正常"
      ],
      targetId: null,
      targetName: null,
      resourceId: "health-check",
      resourceName: "全局巡检",
      requiresApproval: false,
      warnings: allRisks.length > 0 ? allRisks : [],
      mode: "rule_fallback"
    };
  }

  // 完全未匹配 - 尝试提取有用信息
  const unresolvedAlerts = context.alerts.filter((a) => a.status !== "resolved");
  return {
    intent: "health_check",
    riskLevel: "low",
    reply: [
      `收到请求: "${trimmed}"`,
      ``,
      `当前未识别到具体操作意图。支持的操作:`,
      `- 包含 "巡检/检查/状态" → 资源健康巡检`,
      `- 包含 "诊断" → AI 诊断`,
      `- 包含 "部署" → 部署计划`,
      `- 包含 "SSH" → Web SSH 连接`,
      `- 包含 "脚本" → 脚本执行`,
      ``,
      `当前有 ${context.servers.length} 台资源、${unresolvedAlerts.length} 条未解决告警。`,
      `请尝试: "帮我巡检 <主机名>"`
    ].join("\n"),
    plan: [
      "未能识别操作意图",
      `已知资源: ${context.servers.map((s) => s.hostname).join(", ") || "无"}`,
      "请提供更明确的指令"
    ],
    targetId: null,
    targetName: null,
    resourceId: "help",
    resourceName: "帮助",
    requiresApproval: false,
    warnings: [`未识别到意图: "${trimmed}"`],
    mode: "rule_fallback"
  };
}

function normalizeModelPlan(parsed: ModelPlan, fallback: ChatOpsPlan): ChatOpsPlan {
  const intent = validIntent(parsed.intent) ? parsed.intent : fallback.intent;
  const riskLevel = parsed.riskLevel === "high" || parsed.riskLevel === "medium" || parsed.riskLevel === "low"
    ? parsed.riskLevel
    : fallback.riskLevel;
  const plan = Array.isArray(parsed.plan) ? parsed.plan.map(String).map((item) => item.trim()).filter(Boolean) : [];
  return {
    intent,
    riskLevel,
    reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : fallback.reply,
    plan: plan.length > 0 ? plan : fallback.plan,
    targetId: typeof parsed.targetId === "string" && parsed.targetId.trim() ? parsed.targetId.trim() : fallback.targetId,
    targetName: typeof parsed.targetName === "string" && parsed.targetName.trim() ? parsed.targetName.trim() : fallback.targetName,
    resourceId: typeof parsed.resourceId === "string" && parsed.resourceId.trim() ? parsed.resourceId.trim() : fallback.resourceId,
    resourceName: typeof parsed.resourceName === "string" && parsed.resourceName.trim() ? parsed.resourceName.trim() : fallback.resourceName,
    requiresApproval: typeof parsed.requiresApproval === "boolean" ? parsed.requiresApproval : fallback.requiresApproval,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).filter(Boolean) : [],
    mode: "model"
  };
}

function parseModelPlan(content: string): ModelPlan {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(json) as ModelPlan;
}

function extractAssistantContent(payload: ChatCompletionResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  throw new Error("模型响应缺少文本内容");
}

function summarizeContext(context: ChatOpsContext) {
  return {
    servers: context.servers.map((server) => ({
      id: server.id,
      hostname: server.hostname,
      ip: server.ip,
      environment: server.environment,
      status: server.status,
      agentStatus: server.agentStatus,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      diskUsage: server.diskUsage,
      tags: server.tags
    })),
    alerts: context.alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      serverId: alert.serverId
    })),
    scripts: context.scripts.map((script) => ({
      id: script.id,
      name: script.name,
      type: script.type,
      riskLevel: script.riskLevel
    }))
  };
}

function findServer(message: string, servers: ServerRecord[]): ServerRecord | null {
  const lowered = message.toLowerCase();
  const explicit = servers.find((server) => message.includes(server.id) || message.includes(server.hostname) || message.includes(server.ip));
  if (explicit) {
    return explicit;
  }

  const wantsProduction = lowered.includes("prod") || message.includes("生产");
  const wantsStaging = lowered.includes("stage") || lowered.includes("staging") || message.includes("测试") || message.includes("预发");
  const wantedTags = [
    lowered.includes("web") ? "web" : "",
    lowered.includes("api") ? "api" : "",
    lowered.includes("db") || lowered.includes("database") || message.includes("数据库") ? "database" : "",
    lowered.includes("nginx") ? "nginx" : "",
    lowered.includes("postgres") ? "postgres" : ""
  ].filter(Boolean);

  const ranked = servers
    .map((server) => {
      let score = 0;
      if (wantsProduction && server.environment === "production") score += 3;
      if (wantsStaging && server.environment === "staging") score += 3;
      for (const tag of wantedTags) {
        if (server.tags.some((serverTag) => serverTag.toLowerCase() === tag)) score += 2;
        if (server.hostname.toLowerCase().includes(tag)) score += 1;
      }
      return { server, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.server ?? null;
}

function findAlert(message: string, alerts: AlertRecord[]): AlertRecord | null {
  return alerts.find((alert) => message.includes(alert.id) || message.includes(alert.title)) ?? null;
}

function findScript(message: string, scripts: ScriptRecord[]): ScriptRecord | null {
  return scripts.find((script) => message.includes(script.id) || message.includes(script.name)) ?? null;
}

function validIntent(value: unknown): value is ChatOpsIntent {
  return value === "open_web_ssh" || value === "ai_diagnose" || value === "deployment_plan" || value === "health_check" || value === "script_run";
}

function withWarning(plan: ChatOpsPlan, warning: string): ChatOpsPlan {
  return {
    ...plan,
    warnings: [...plan.warnings, warning],
    mode: "rule_fallback"
  };
}

function modelFailureWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("abort") || message.includes("timeout") || message.includes("超时")) {
    return "模型响应超时，已使用本地规则生成计划。";
  }
  return "模型编排暂不可用，已使用本地规则生成计划。";
}
