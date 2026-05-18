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
  evidence: ["CPU 使用率 81%", "内存使用率 86%"],
  possibleCauses: ["后台任务占用资源"],
  repairPlan: ["检查 top 进程", "观察 15 分钟"]
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
    {"summary":"诊断完成","evidence":["e1"],"possibleCauses":["c1"],"repairPlan":["r1"]}
  `);
  assert.equal(parsed.summary, "诊断完成");
  assert.deepEqual(parsed.evidence, ["e1"]);
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
                evidence: ["CPU 81%", "内存 86%"],
                possibleCauses: ["慢查询增加"],
                repairPlan: ["查询 pg_stat_activity"]
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
  assert.deepEqual(report.repairPlan, ["查询 pg_stat_activity"]);
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
