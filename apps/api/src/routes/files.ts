import { Router } from "express";
import { getManagedFiles, getManagedFile, getServer, createTaskRecord, createAuditLog } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getManagedFiles() });
}));

router.post("/:id/transfer-plan", asyncHandler(async (req, res) => {
  const file = await getManagedFile(String(req.params.id));
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

  const steps = mode === "pull"
    ? [`通过 Agent/SSH 从 ${target.hostname} 读取 ${file.path}`, "计算文件大小和 checksum", "上传到 NextOps 文件区", "写入文件操作审计"]
    : [`校验文件 ${file.name} 的 checksum 和权限`, `分发到 ${target.hostname}:${file.path}`, "设置文件 owner/mode", "写入文件操作审计"];

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
    target: { id: target.id, hostname: target.hostname, environment: target.environment },
    riskLevel,
    requiresApproval,
    steps,
    executionMode: "planned_only",
    warnings: ["当前只生成文件传输计划，尚未真实读写目标主机文件。"]
  });
}));

export default router;
