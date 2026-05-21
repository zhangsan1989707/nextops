import { Router } from "express";
import { getServers, getAlerts, getScripts, getDefaultAiModelForRuntime, createTaskRecord, createAuditLog } from "../db.js";
import { buildChatOpsPlan } from "../chatops.js";
import { asyncHandler, chunkText, getActor, wait, writeStreamEvent } from "../utils/helpers.js";

const router = Router();

router.post("/message", asyncHandler(async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ message: "message is required" });
    return;
  }

  const useModel = req.body?.useModel !== false;
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
    actor: getActor(res),
    resourceType: "task",
    resourceId: task.id,
    summary: `ChatOps 生成 ${plan.intent} 计划`,
    details: { message, intent: plan.intent, mode: plan.mode, warnings: plan.warnings }
  });

  res.json({
    input: message,
    commandMode: message.startsWith("/"),
    taskId: task.id,
    status: task.status,
    executionMode: "planned_only",
    ...plan,
    warnings: [...plan.warnings, "当前 ChatOps 已接入意图编排和任务创建，但执行器尚未接入，不会直接操作真实主机。"]
  });
}));

router.post("/stream", asyncHandler(async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ message: "message is required" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  });

  writeStreamEvent(res, "status", { message: "正在理解请求并关联资产上下文..." });

  try {
    const useModel = req.body?.useModel !== false;
    const [servers, alerts, scripts, model] = await Promise.all([
      getServers(),
      getAlerts(),
      getScripts(),
      useModel ? getDefaultAiModelForRuntime() : Promise.resolve(null)
    ]);

    const plan = await buildChatOpsPlan({ message, context: { servers, alerts, scripts }, model });
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

    writeStreamEvent(res, "meta", {
      intent: plan.intent,
      riskLevel: plan.riskLevel,
      mode: plan.mode,
      executionMode: "planned_only",
      taskId: task.id,
      status: task.status,
      warnings: plan.warnings
    });

    const content = [
      plan.reply,
      "",
      "执行计划：",
      ...plan.plan.map((item: string, index: number) => `${index + 1}. ${item}`),
      ...(plan.warnings.length > 0 ? ["", "注意：", ...plan.warnings.map((item: string) => `- ${item}`)] : [])
    ].join("\n");

    for (const chunk of chunkText(content, 18)) {
      writeStreamEvent(res, "chunk", { text: chunk });
      await wait(12);
    }

    writeStreamEvent(res, "done", { taskId: task.id, status: task.status });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "内部错误";
    writeStreamEvent(res, "error", { message: `请求处理失败：${errMsg}` });
    writeStreamEvent(res, "done", { status: "error" });
  } finally {
    res.end();
  }
}));

export default router;
