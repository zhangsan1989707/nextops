import assert from "node:assert/strict";
import test from "node:test";
import { buildChatOpsPlan, buildRulePlan, type ChatOpsContext } from "./chatops.js";
import type { AiModelRuntimeRecord } from "./db.js";

const context: ChatOpsContext = {
  servers: [
    {
      id: "srv-prod-web-01",
      ip: "10.0.1.21",
      port: 22,
      hostname: "prod-web-01",
      environment: "production",
      tenant: "default",
      status: "healthy",
      agentStatus: "online",
      os: "Ubuntu",
      cpuUsage: 41,
      memoryUsage: 62,
      diskUsage: 55,
      loadAvg: 1.2,
      tags: ["web"],
      type: "server"
    }
  ],
  alerts: [
    {
      id: "alt-001",
      title: "CPU 使用率过高",
      severity: "critical",
      status: "open",
      source: "prometheus",
      serverId: "srv-prod-web-01",
      triggeredAt: "2026-05-13T01:00:00.000Z"
    }
  ],
  scripts: [
    {
      id: "scr-001",
      name: "Linux 基础巡检",
      type: "inspection",
      riskLevel: "low",
      version: "1.0.0",
      successRate: 98
    }
  ]
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
  capabilities: ["ChatOps"],
  endpoint: "https://llm.example.com/v1",
  apiKeyEnvName: null,
  apiKeyConfigured: true,
  apiKeySecret: "test-key"
};

test("buildRulePlan matches slash diagnose to a real alert", () => {
  const plan = buildRulePlan("/diagnose alert alt-001", context);
  assert.equal(plan.intent, "ai_diagnose");
  assert.equal(plan.riskLevel, "high");
  assert.equal(plan.resourceId, "alt-001");
  assert.equal(plan.targetId, "srv-prod-web-01");
});

test("buildRulePlan marks production ssh as requiring approval", () => {
  const plan = buildRulePlan("/ssh 10.0.1.21 --port 22", context);
  assert.equal(plan.intent, "open_web_ssh");
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.targetName, "prod-web-01");
});

test("buildRulePlan resolves production web server from natural language scope", () => {
  const plan = buildRulePlan("帮我巡检生产环境所有 Web 服务器，并生成风险摘要", context);
  assert.equal(plan.intent, "health_check");
  assert.equal(plan.targetId, "srv-prod-web-01");
  assert.equal(plan.targetName, "prod-web-01");
  assert.deepEqual(plan.warnings, []);
});

test("buildChatOpsPlan uses model JSON when available", async () => {
  const plan = await buildChatOpsPlan({
    message: "帮我巡检 prod-web-01",
    context,
    model,
    fetchImpl: async () => new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "health_check",
                riskLevel: "low",
                reply: "模型已生成巡检计划。",
                plan: ["读取服务器", "生成巡检"],
                targetId: "srv-prod-web-01",
                targetName: "prod-web-01",
                resourceId: "health-check",
                resourceName: "服务器巡检",
                requiresApproval: false
              })
            }
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  });

  assert.equal(plan.mode, "model");
  assert.equal(plan.reply, "模型已生成巡检计划。");
  assert.deepEqual(plan.plan, ["读取服务器", "生成巡检"]);
});

test("buildChatOpsPlan falls back when model key is missing", async () => {
  const plan = await buildChatOpsPlan({
    message: "帮我巡检 prod-web-01",
    context,
    model: { ...model, apiKeySecret: null, apiKeyConfigured: false },
    fetchImpl: async () => {
      throw new Error("should not call model");
    }
  });

  assert.equal(plan.mode, "rule_fallback");
  assert.equal(plan.intent, "health_check");
  assert.match(plan.warnings.join(" "), /缺少 API Key/);
});

test("buildChatOpsPlan uses readable warning on model timeout", async () => {
  const plan = await buildChatOpsPlan({
    message: "帮我巡检生产环境所有 Web 服务器",
    context,
    model,
    fetchImpl: async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }
  });

  assert.equal(plan.mode, "rule_fallback");
  assert.equal(plan.targetId, "srv-prod-web-01");
  assert.match(plan.warnings.join(" "), /模型响应超时/);
  assert.doesNotMatch(plan.warnings.join(" "), /aborted/);
});
