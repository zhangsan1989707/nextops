import { Router } from "express";
import { getPackages, getPackage, getServer, createTaskRecord, createAuditLog } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getPackages() });
}));

router.post("/:id/deploy-plan", asyncHandler(async (req, res) => {
  const item = await getPackage(String(req.params.id));
  if (!item) {
    res.status(404).json({ message: "Package not found" });
    return;
  }

  const targetId = String(req.body?.targetId ?? "srv-stage-api-01");
  const target = await getServer(targetId);
  if (!target) {
    res.status(404).json({ message: "Target server not found" });
    return;
  }

  const requiresApproval = target.environment === "production" || item.type === "release";
  const steps = [
    `校验包 ${item.name}@${item.version} 的 checksum`,
    `确认目标服务器 ${target.hostname} 的磁盘空间和 Agent 状态`,
    "分发包到目标服务器临时目录",
    item.type === "agent" ? "执行 Agent 安装/升级脚本" : "执行部署或配置替换动作",
    "记录包使用记录和部署审计"
  ];

  const task = await createTaskRecord({
    id: `task-${Date.now().toString(36)}`,
    taskType: "package_deploy_plan",
    status: requiresApproval ? "waiting_approval" : "planned",
    riskLevel: requiresApproval ? "medium" : "low",
    requiresApproval,
    targetId: target.id,
    targetName: target.hostname,
    resourceId: item.id,
    resourceName: item.name,
    summary: `分发包 ${item.name}@${item.version}`,
    plan: steps,
    output: null
  });

  await createAuditLog({
    action: "package.deploy_plan",
    actor: getActor(res),
    resourceType: "package",
    resourceId: item.id,
    summary: `生成 ${item.name}@${item.version} 分发计划`,
    details: { taskId: task.id, targetId: target.id, requiresApproval }
  });

  res.json({
    taskId: task.id,
    packageId: item.id,
    packageName: item.name,
    version: item.version,
    target: { id: target.id, hostname: target.hostname, environment: target.environment },
    requiresApproval,
    riskLevel: requiresApproval ? "medium" : "low",
    steps,
    executionMode: "planned_only",
    warnings: ["当前只生成包分发计划，尚未上传、校验或部署真实制品。"]
  });
}));

export default router;
