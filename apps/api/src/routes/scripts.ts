import { Router } from "express";
import { getScripts, getScript, getServers, createAuditLog, createTaskRecord } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

interface DangerDetection {
  isSafe: boolean;
  warnings: string[];
}

function detectDangerousCommands(scriptContent: string, scriptType: string): DangerDetection {
  const warnings: string[] = [];

  if (scriptType === "shell") {
    if (/rm\s+-rf\s+\//.test(scriptContent)) {
      warnings.push("检测到危险命令: rm -rf / (递归删除根目录)");
    }
    if (/\bmkfs\./.test(scriptContent)) {
      warnings.push("检测到危险命令: mkfs (格式化文件系统)");
    }
    if (/\b(shutdown|reboot|halt|poweroff)\b/.test(scriptContent)) {
      warnings.push("检测到危险命令: shutdown/reboot/halt/poweroff (系统关机/重启)");
    }
    if (/dd\s+if=/.test(scriptContent)) {
      warnings.push("检测到危险命令: dd if= (磁盘直接写入操作)");
    }
    if (/>\s*\/dev\/sd[a-z]/.test(scriptContent)) {
      warnings.push("检测到危险命令: > /dev/sdX (直接覆写磁盘设备)");
    }
    if (/chmod\s+777\s+\//.test(scriptContent)) {
      warnings.push("检测到危险命令: chmod 777 / (根目录权限开放)");
    }
    if (/\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/.test(scriptContent) || /:\{\s*:\s*\|\s*:\s*&\s*\}/.test(scriptContent)) {
      warnings.push("检测到危险命令: Fork Bomb (fork 炸弹)");
    }
    if (/\bkill\s+-9\b/.test(scriptContent) && /\bpgrep\b|\bpidof\b|\bps\b/.test(scriptContent)) {
      warnings.push("检测到危险命令: 批量 kill -9 (批量强制终止进程)");
    }
  }

  return {
    isSafe: warnings.length === 0,
    warnings
  };
}

router.get("/", asyncHandler(async (_req, res) => {
  const scripts = await getScripts();
  const items = scripts.map((script) => ({
    ...script
  }));
  res.json({ items });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const script = await getScript(String(req.params.id));
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return;
  }
  res.json(script);
}));

router.post("/:id/validate", asyncHandler(async (req, res) => {
  const script = await getScript(String(req.params.id));
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return;
  }
  const { isSafe, warnings } = detectDangerousCommands(script.content, script.type);
  const rollbackRequired = script.type === "shell" && !isSafe;
  res.json({ isSafe, warnings, rollbackRequired });
}));

router.post("/:id/run", asyncHandler(async (req, res) => {
  const script = await getScript(String(req.params.id));
  if (!script) {
    res.status(404).json({ message: "Script not found" });
    return;
  }

  const { isSafe, warnings } = detectDangerousCommands(script.content, script.type);

  if (!isSafe) {
    res.status(400).json({
      message: "脚本包含高危命令，执行已被阻断",
      isSafe: false,
      warnings
    });
    return;
  }

  const servers = await getServers();
  const targetId = String(req.body?.targetId ?? servers[0]?.id ?? "srv-prod-web-01");
  const target = servers.find((s) => s.id === targetId) ?? null;

  const requiresApproval = script.riskLevel !== "low";

  const plan = [
    `脚本安全验证: ${isSafe ? "通过" : "未通过"}`,
    `校验脚本 ${script.name} 的版本和风险等级`,
    target ? `确认目标服务器 ${target.hostname} (${target.ip}) 的 Agent 状态` : "目标服务器未指定或未找到",
    "注入参数并生成执行命令",
    requiresApproval ? "非低风险操作进入审批流程" : "执行脚本并采集输出",
    "写入任务记录和审计日志"
  ];

  const status = requiresApproval ? "waiting_approval" : "running";

  const task = await createTaskRecord({
    id: `task-${Date.now().toString(36)}`,
    taskType: "script_run",
    status,
    riskLevel: script.riskLevel,
    requiresApproval,
    targetId: target?.id ?? null,
    targetName: target?.hostname ?? null,
    resourceId: script.id,
    resourceName: script.name,
    summary: `运行脚本 ${script.name}`,
    plan,
    output: requiresApproval
      ? "任务已创建，等待审批。审批通过后将自动执行脚本。"
      : "任务已生成，执行中。当前脚本执行器尚未接入，不会真实连接目标服务器。"
  });

  await createAuditLog({
    action: "script.run",
    actor: getActor(res),
    resourceType: "script",
    resourceId: script.id,
    summary: `${target ? `向 ${target.hostname} 发起` : "发起"}脚本 ${script.name}`,
    details: {
      taskId: task.id,
      targetId: target?.id ?? null,
      requiresApproval,
      isSafe,
      warnings
    }
  });

  res.json({
    taskId: task.id,
    scriptId: script.id,
    scriptName: script.name,
    target: target ? { id: target.id, hostname: target.hostname, ip: target.ip, environment: target.environment } : null,
    status: task.status,
    riskLevel: script.riskLevel,
    requiresApproval,
    isSafe,
    warnings,
    plan,
    output: task.output
  });
}));

export default router;