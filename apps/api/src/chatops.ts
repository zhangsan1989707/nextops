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

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 8000);

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

  if (lowered.includes("ssh") || lowered.startsWith("/ssh")) {
    return {
      intent: "open_web_ssh",
      riskLevel: "medium",
      reply: "已生成 Web SSH 连接计划。当前执行器未接入，任务会进入 planned 状态等待后续网关执行。",
      plan: [
        "识别目标服务器和端口",
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

  if (lowered.includes("diagnose") || lowered.includes("诊断") || lowered.startsWith("/diagnose")) {
    const target = targetAlert ?? context.alerts[0] ?? null;
    return {
      intent: "ai_diagnose",
      riskLevel: target?.severity === "critical" ? "high" : "medium",
      reply: target
        ? `已定位告警 ${target.id}，可进入 AI 诊断流程生成证据链和修复建议。`
        : "已生成 AI 诊断计划，但当前没有匹配到具体告警。",
      plan: [
        "识别告警、服务器和影响范围",
        "读取相关服务器指标与告警上下文",
        "调用默认模型生成诊断报告",
        "生成修复计划，涉及高风险动作时进入审批"
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

  if (lowered.includes("deploy") || lowered.includes("部署") || lowered.startsWith("/deploy")) {
    return {
      intent: "deployment_plan",
      riskLevel: "medium",
      reply: "已生成部署计划。当前包分发执行器未接入，因此只创建 planned 任务。",
      plan: [
        "识别服务、环境和版本",
        "校验制品包、目标环境和回滚策略",
        "生产环境进入审批",
        "等待包分发执行器接入后执行"
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

  if (lowered.includes("script") || lowered.includes("脚本") || targetScript) {
    return {
      intent: "script_run",
      riskLevel: targetScript?.riskLevel === "high" ? "high" : targetScript?.riskLevel === "medium" ? "medium" : "low",
      reply: targetScript ? `已匹配脚本 ${targetScript.name}，生成执行计划。` : "已生成脚本执行计划，但未匹配到具体脚本。",
      plan: [
        "识别目标脚本和服务器",
        "校验脚本参数、版本和风险等级",
        "创建脚本执行任务",
        "等待 Agent/SSH 执行器接入后采集输出"
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

  return {
    intent: "health_check",
    riskLevel: "low",
    reply: targetServer ? `已生成 ${targetServer.hostname} 的巡检计划。` : "已生成巡检计划，当前需要人工确认目标资产。",
    plan: [
      "识别巡检目标资产",
      "读取服务器状态和近期告警",
      "生成 CPU、内存、磁盘和 Agent 状态检查计划",
      "等待 Agent 指标采集能力接入后执行"
    ],
    targetId: targetServer?.id ?? null,
    targetName: targetServer?.hostname ?? null,
    resourceId: "health-check",
    resourceName: "服务器巡检",
    requiresApproval: false,
    warnings: targetServer ? [] : ["未匹配到明确服务器，计划需要人工补充目标。"],
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
