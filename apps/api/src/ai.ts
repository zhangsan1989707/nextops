import type { AiModelRuntimeRecord } from "./db.js";

export type DiagnosisReport = {
  summary: string;
  evidence: string[];
  possibleCauses: string[];
  repairPlan: string[];
  model: {
    id: string | null;
    name: string;
    provider: string;
  };
  mode: "model" | "local_fallback";
  warnings: string[];
};

export type DiagnosisFallback = Pick<DiagnosisReport, "summary" | "evidence" | "possibleCauses" | "repairPlan">;

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

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 8000);

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
              "你是 NextOps AIOps 诊断助手。只返回 JSON，不要 Markdown。字段必须包含 summary, evidence, possibleCauses, repairPlan，后三个字段必须是字符串数组。"
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
  const parsed = JSON.parse(jsonText) as Partial<DiagnosisFallback>;
  return parsed;
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
    evidence: arrayOrFallback(input.evidence, fallback.evidence),
    possibleCauses: arrayOrFallback(input.possibleCauses, fallback.possibleCauses),
    repairPlan: arrayOrFallback(input.repairPlan, fallback.repairPlan)
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

function arrayOrFallback(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const nextValue = value.map(String).map((item) => item.trim()).filter(Boolean);
  return nextValue.length > 0 ? nextValue : fallback;
}

function isLocalEndpoint(endpoint: string): boolean {
  return /(^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)|(^http:\/\/.*\.local))/.test(endpoint);
}
