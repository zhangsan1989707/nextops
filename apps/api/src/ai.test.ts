import assert from "node:assert/strict";
import test from "node:test";
import {
  generateDiagnosis,
  openAiCompatibleChatUrl,
  parseDiagnosisContent,
  testModelConnectivity,
  type DiagnosisFallback
} from "./ai.js";
import type { AiModelRuntimeRecord } from "./db.js";

const fallback: DiagnosisFallback = {
  summary: "prod-db-01 存在资源压力。",
  impact: "影响 prod-db-01 数据库服务",
  timeline: [{ time: new Date().toISOString(), event: "发现资源压力" }],
  evidence: [
    { source: "server_metrics", content: "CPU 使用率 81%", weight: "high" },
    { source: "server_metrics", content: "内存使用率 86%", weight: "high" }
  ],
  possibleCauses: [{ cause: "后台任务占用资源", confidence: 0.8, evidenceRefs: [0] }],
  repairPlan: [
    { step: 1, action: "检查 top 进程", risk: "low", rollback: "无需回滚", estimatedTime: "5分钟" },
    { step: 2, action: "观察 15 分钟", risk: "low", rollback: "无需回滚", estimatedTime: "15分钟" }
  ],
  riskWarnings: [],
  nextObservations: [],
  relatedEvents: []
};

const model: AiModelRuntimeRecord = {
  id: "ops-model",
  name: "Ops Model",
  provider: "OpenAI Compatible",
  type: "chat",
  status: "enabled",
  isDefault: true,
  contextWindow: "32k",
  latencyMs: 100,
  costLevel: "low",
  capabilities: ["日志诊断"],
  endpoint: "https://llm.example.com/v1",
  apiKeyEnvName: null,
  apiKeyConfigured: true,
  apiKeySecret: "test-key"
};

test("openAiCompatibleChatUrl appends chat completions path once", () => {
  assert.equal(openAiCompatibleChatUrl("https://llm.example.com/v1/"), "https://llm.example.com/v1/chat/completions");
  assert.equal(
    openAiCompatibleChatUrl("https://llm.example.com/v1/chat/completions"),
    "https://llm.example.com/v1/chat/completions"
  );
});

test("parseDiagnosisContent extracts strict JSON from model text", () => {
  const parsed = parseDiagnosisContent(`
    {"summary":"诊断完成","evidence":[{"source":"test","content":"e1","weight":"high"}],"possibleCauses":[{"cause":"c1","confidence":0.9,"evidenceRefs":[0]}],"repairPlan":[{"step":1,"action":"r1","risk":"low","rollback":"none","estimatedTime":"5min"}]}
  `);
  assert.equal(parsed.summary, "诊断完成");
  assert.equal(parsed.evidence?.[0]?.content, "e1");
});

test("generateDiagnosis uses model response when the call succeeds", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "模型诊断：数据库压力升高。",
                evidence: [
                  { source: "metrics", content: "CPU 81%", weight: "high" },
                  { source: "metrics", content: "内存 86%", weight: "high" }
                ],
                possibleCauses: [{ cause: "后台任务", confidence: 0.85, evidenceRefs: [0] }],
                repairPlan: [{ step: 1, action: "查询 pg_stat_activity", risk: "low", rollback: "无需回滚", estimatedTime: "5分钟" }],
                impact: "数据库压力升高",
                timeline: [],
                riskWarnings: [],
                nextObservations: [],
                relatedEvents: []
              })
            }
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const report = await generateDiagnosis({
    subject: "server",
    context: { hostname: "prod-db-01" },
    fallback,
    model,
    fetchImpl
  });

  assert.equal(report.mode, "model");
  assert.equal(report.summary, "模型诊断：数据库压力升高。");
  assert.equal(report.repairPlan[0]?.action, "查询 pg_stat_activity");
  assert.equal(calls[0]?.url, "https://llm.example.com/v1/chat/completions");
  assert.equal((calls[0]?.init.headers as Record<string, string>).Authorization, "Bearer test-key");
});

test("generateDiagnosis falls back when a remote model has no key", async () => {
  const report = await generateDiagnosis({
    subject: "server",
    context: { hostname: "prod-db-01" },
    fallback,
    model: { ...model, apiKeySecret: null, apiKeyConfigured: false },
    fetchImpl: async () => {
      throw new Error("should not call remote model without key");
    }
  });

  assert.equal(report.mode, "local_fallback");
  assert.equal(report.summary, fallback.summary);
  assert.match(report.warnings[0] ?? "", /缺少 API Key/);
});

test("testModelConnectivity reports reachable model after a successful probe", async () => {
  const result = await testModelConnectivity({
    model,
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "reachable");
  assert.deepEqual(result.warnings, []);
});

test("testModelConnectivity reports attention for failed probe", async () => {
  const result = await testModelConnectivity({
    model,
    fetchImpl: async () => new Response(JSON.stringify({ error: "bad key" }), { status: 401 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "attention");
  assert.match(result.warnings[0] ?? "", /HTTP 401/);
});
