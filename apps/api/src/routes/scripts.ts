import { Router } from "express";
import { getScripts, getScript, getServer, createTaskRecord, createAuditLog } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getScripts() });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const script = await getScript(String(req.params.id));
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return;
  }
  res.json(script);
}));

router.post("/:id/run", asyncHandler(async (req, res) => {
  const script = await getScript(String(req.params.id));
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
    output: "任务已生成。当前脚本执行器尚未接入，不会真实连接目标服务器。"
  });

  await createAuditLog({
    action: "script.run",
    actor: getActor(res),
    resourceType: "script",
    resourceId: script.id,
    summary: `向 ${target.hostname} 发起脚本 ${script.name}`,
    details: { taskId: task.id, targetId: target.id, requiresApproval }
  });

  res.json({
    taskId: task.id,
    scriptId: script.id,
    scriptName: script.name,
    target: { id: target.id, hostname: target.hostname, ip: target.ip, environment: target.environment },
    status: task.status,
    riskLevel: script.riskLevel,
    requiresApproval,
    plan,
    output: task.output,
    executionMode: "planned_only",
    warnings: ["当前只创建脚本执行任务和审计记录，尚未真实执行脚本。"]
  });
}));

export default router;
