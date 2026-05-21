import type { AiModelRuntimeRecord } from "./db.js";

export type DiagnosisReport = {
  summary: string;
  impact: string;
  timeline: Array<{ time: string; event: string }>;
  evidence: Array<{ source: string; content: string; weight: "high" | "medium" | "low" }>;
  possibleCauses: Array<{
    cause: string;
    confidence: number;
    evidenceRefs: number[];
  }>;
  repairPlan: Array<{
    step: number;
    action: string;
    risk: "low" | "medium" | "high";
    rollback: string;
    estimatedTime: string;
  }>;
  riskWarnings: string[];
  nextObservations: string[];
  relatedEvents: Array<{ id: string; title: string; similarity: number }>;
  model: {
    id: string | null;
    name: string;
    provider: string;
  };
  mode: "model" | "local_fallback";
  warnings: string[];
};

export type DiagnosisFallback = {
  summary: string;
  impact: string;
  timeline: Array<{ time: string; event: string }>;
  evidence: Array<{ source: string; content: string; weight: "high" | "medium" | "low" }>;
  possibleCauses: Array<{ cause: string; confidence: number; evidenceRefs: number[] }>;
  repairPlan: Array<{ step: number; action: string; risk: "low" | "medium" | "high"; rollback: string; estimatedTime: string }>;
  riskWarnings: string[];
  nextObservations: string[];
  relatedEvents: Array<{ id: string; title: string; similarity: number }>;
};

type FetchLike = typeof fetch;

type ChatCompletionMessage = {
  role?: string;
  content?: unknown;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: ChatCompletionMessage;
  }>;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);

export function resolveModelApiKey(model: AiModelRuntimeRecord): string | null {
  if (model.apiKeySecret) {
    return model.apiKeySecret;
  }
  if (model.apiKeyEnvName) {
    return process.env[model.apiKeyEnvName] ?? null;
  }
  return null;
}

export function openAiCompatibleChatUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

export async function generateDiagnosis(options: {
  subject: string;
  context: Record<string, unknown>;
  fallback: DiagnosisFallback;
  model: AiModelRuntimeRecord | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<DiagnosisReport> {
  const { subject, context, fallback, model } = options;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!model) {
    return fallbackDiagnosis(fallback, "未配置可用默认模型。");
  }

  if (model.status !== "enabled") {
    return fallbackDiagnosis(fallback, `默认模型 ${model.id} 未启用。`, model);
  }

  const apiKey = resolveModelApiKey(model);
  const isLocalModel = isLocalEndpoint(model.endpoint);
  if (!apiKey && !isLocalModel) {
    return fallbackDiagnosis(fallback, `默认模型 ${model.id} 缺少 API Key。`, model);
  }

  try {
    const response = await fetchImpl(openAiCompatibleChatUrl(model.endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: model.id,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是 NextOps AIOps 诊断助手。只返回 JSON，不要 Markdown。字段必须包含: summary, impact, timeline(数组,每项含time和event), evidence(数组,每项含source/content/weight), possibleCauses(数组,每项含cause/confidence/evidenceRefs), repairPlan(数组,每项含step/action/risk/rollback/estimatedTime), riskWarnings(字符串数组), nextObservations(字符串数组)。推断必须来自输入上下文，不允许编造真实执行结果。confidence 取值范围 0-1。"
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "基于运维上下文生成中文诊断报告，证据必须来自输入上下文，不允许编造真实执行结果。",
              subject,
              context
            })
          }
        ]
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    });

    if (!response.ok) {
      return fallbackDiagnosis(fallback, `模型调用失败：HTTP ${response.status}。`, model);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = extractAssistantContent(payload);
    const parsed = parseDiagnosisContent(content);
    return {
      ...normalizeDiagnosis(parsed, fallback),
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider
      },
      mode: "model",
      warnings: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return fallbackDiagnosis(fallback, `模型调用异常：${message}。`, model);
  }
}

export async function testModelConnectivity(options: {
  model: AiModelRuntimeRecord;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  status: "reachable" | "attention";
  checks: string[];
  warnings: string[];
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model;
  const apiKey = resolveModelApiKey(model);
  const isLocalModel = isLocalEndpoint(model.endpoint);
  const warnings: string[] = [];

  if (model.status !== "enabled") {
    warnings.push("模型当前未启用。");
  }
  if (!apiKey && !isLocalModel) {
    warnings.push("未配置 API Key，远程模型调用会失败。");
  }

  if (warnings.length === 0) {
    try {
      const response = await fetchImpl(openAiCompatibleChatUrl(model.endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: model.id,
          temperature: 0,
          max_tokens: 16,
          messages: [
            { role: "system", content: "Return ok." },
            { role: "user", content: "health check" }
          ]
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      });
      if (!response.ok) {
        warnings.push(`模型连通性检查失败：HTTP ${response.status}。`);
      }
    } catch (error) {
      warnings.push(`模型连通性检查异常：${error instanceof Error ? error.message : "未知错误"}。`);
    }
  }

  return {
    ok: warnings.length === 0,
    status: warnings.length === 0 ? "reachable" : "attention",
    checks: [
      `Endpoint: ${model.endpoint}`,
      `Provider: ${model.provider}`,
      apiKey ? "API Key: configured" : isLocalModel ? "API Key: not required for local model" : "API Key: missing",
      `Model status: ${model.status}`
    ],
    warnings
  };
}

export function parseDiagnosisContent(content: string): Partial<DiagnosisFallback> {
  const jsonText = extractJsonObject(content);
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
    impact: typeof parsed.impact === "string" ? parsed.impact : undefined,
    timeline: Array.isArray(parsed.timeline) ? parsed.timeline.map((item: Record<string, unknown>) => ({
      time: typeof item.time === "string" ? item.time : "",
      event: typeof item.event === "string" ? item.event : ""
    })) : undefined,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map((item: Record<string, unknown>) => ({
      source: typeof item.source === "string" ? item.source : "unknown",
      content: typeof item.content === "string" ? item.content : String(item.content ?? ""),
      weight: item.weight === "high" || item.weight === "medium" || item.weight === "low" ? item.weight : "medium"
    })) : undefined,
    possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses.map((item: Record<string, unknown>) => ({
      cause: typeof item.cause === "string" ? item.cause : "",
      confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      evidenceRefs: Array.isArray(item.evidenceRefs) ? item.evidenceRefs.map(Number).filter((n) => !isNaN(n)) : []
    })) : undefined,
    repairPlan: Array.isArray(parsed.repairPlan) ? parsed.repairPlan.map((item: Record<string, unknown>, index: number) => ({
      step: typeof item.step === "number" ? item.step : index + 1,
      action: typeof item.action === "string" ? item.action : String(item.action ?? ""),
      risk: item.risk === "high" || item.risk === "medium" || item.risk === "low" ? item.risk : "low",
      rollback: typeof item.rollback === "string" ? item.rollback : "无需回滚",
      estimatedTime: typeof item.estimatedTime === "string" ? item.estimatedTime : "未知"
    })) : undefined,
    riskWarnings: Array.isArray(parsed.riskWarnings) ? parsed.riskWarnings.map(String).filter(Boolean) : undefined,
    nextObservations: Array.isArray(parsed.nextObservations) ? parsed.nextObservations.map(String).filter(Boolean) : undefined,
    relatedEvents: Array.isArray(parsed.relatedEvents) ? parsed.relatedEvents.map((item: Record<string, unknown>) => ({
      id: typeof item.id === "string" ? item.id : "",
      title: typeof item.title === "string" ? item.title : "",
      similarity: typeof item.similarity === "number" ? item.similarity : 0
    })) : undefined
  };
}

function extractAssistantContent(payload: ChatCompletionResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  throw new Error("模型响应缺少文本内容");
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("模型响应不是 JSON");
}

function normalizeDiagnosis(input: Partial<DiagnosisFallback>, fallback: DiagnosisFallback): DiagnosisFallback {
  return {
    summary: stringOrFallback(input.summary, fallback.summary),
    impact: stringOrFallback(input.impact, fallback.impact),
    timeline: Array.isArray(input.timeline) && input.timeline.length > 0 ? input.timeline : fallback.timeline,
    evidence: Array.isArray(input.evidence) && input.evidence.length > 0 ? input.evidence : fallback.evidence,
    possibleCauses: Array.isArray(input.possibleCauses) && input.possibleCauses.length > 0 ? input.possibleCauses : fallback.possibleCauses,
    repairPlan: Array.isArray(input.repairPlan) && input.repairPlan.length > 0 ? input.repairPlan : fallback.repairPlan,
    riskWarnings: Array.isArray(input.riskWarnings) && input.riskWarnings.length > 0
      ? input.riskWarnings.filter((w: string) => w.trim())
      : fallback.riskWarnings,
    nextObservations: Array.isArray(input.nextObservations) && input.nextObservations.length > 0
      ? input.nextObservations.filter((o: string) => o.trim())
      : fallback.nextObservations,
    relatedEvents: Array.isArray(input.relatedEvents) ? input.relatedEvents : fallback.relatedEvents
  };
}

function fallbackDiagnosis(fallback: DiagnosisFallback, warning: string, model?: AiModelRuntimeRecord): DiagnosisReport {
  return {
    ...fallback,
    model: {
      id: model?.id ?? null,
      name: model?.name ?? "local-rule-engine",
      provider: model?.provider ?? "NextOps"
    },
    mode: "local_fallback",
    warnings: [warning]
  };
}

function stringOrFallback(value: unknown, fallback: string): string {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue || fallback;
}

function isLocalEndpoint(endpoint: string): boolean {
  return /(^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)|(^http:\/\/.*\.local))/.test(endpoint);
}
