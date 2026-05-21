import { Router } from "express";
import {
  getAlert, getServer, getAlerts, getServers,
  getServerMetrics, getServerInventory, getDefaultAiModelForRuntime,
  createTaskRecord, createAuditLog, getScripts
} from "../db.js";
import { generateDiagnosis } from "../ai.js";
import type { DiagnosisFallback, DiagnosisReport } from "../ai.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

router.post("/alert/:alertId", asyncHandler(async (req, res) => {
  const alertId = String(req.params.alertId);
  const alert = await getAlert(alertId);
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }

  const server = await getServer(alert.serverId);
  const [metrics, inventory, model, allAlerts, allServers, scripts] = await Promise.all([
    getServerMetrics(alert.serverId, 12),
    getServerInventory(alert.serverId),
    getDefaultAiModelForRuntime(),
    getAlerts(),
    getServers(),
    getScripts()
  ]);

  const similarAlerts = allAlerts
    .filter((a) => a.id !== alert.id && a.serverId === alert.serverId)
    .slice(0, 5);

  const context = {
    alert: {
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      source: alert.source,
      triggeredAt: alert.triggeredAt
    },
    server: server ? {
      id: server.id,
      hostname: server.hostname,
      ip: server.ip,
      environment: server.environment,
      status: server.status,
      agentStatus: server.agentStatus,
      os: server.os,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      diskUsage: server.diskUsage,
      loadAvg: server.loadAvg,
      tags: server.tags
    } : null,
    metrics: metrics.map((m) => ({
      cpuUsage: m.cpuUsage,
      memoryUsage: m.memoryUsage,
      diskUsage: m.diskUsage,
      loadAvg: m.loadAvg,
      collectedAt: m.collectedAt
    })),
    inventory: inventory ? {
      kernel: inventory.kernel,
      cpuModel: inventory.cpuModel,
      cpuCores: inventory.cpuCores,
      memoryTotalMb: inventory.memoryTotalMb,
      diskTotalGb: inventory.diskTotalGb,
      uptimeSeconds: inventory.uptimeSeconds
    } : null,
    similarAlerts: similarAlerts.map((a) => ({ id: a.id, title: a.title, severity: a.severity, status: a.status })),
    clusterInfo: {
      totalServers: allServers.length,
      serversWithIssues: allServers.filter((s) => s.status === "warning" || s.cpuUsage >= 80 || s.memoryUsage >= 80).length,
      sameEnvServers: allServers.filter((s) => s.environment === (server?.environment ?? "production")).map((s) => ({
        hostname: s.hostname,
        cpuUsage: s.cpuUsage,
        memoryUsage: s.memoryUsage,
        status: s.status
      }))
    }
  };

  const fallback: DiagnosisFallback = buildLocalFallback(alert, server, metrics, inventory, similarAlerts);

  const report = await generateDiagnosis({
    subject: `告警: ${alert.title} (${alert.severity})`,
    context: context as Record<string, unknown>,
    fallback,
    model
  });

  const task = await createTaskRecord({
    id: `diag-${Date.now().toString(36)}`,
    taskType: "ai_diagnosis",
    status: "done",
    riskLevel: alert.severity === "critical" ? "high" : "medium",
    requiresApproval: false,
    targetId: alert.serverId,
    targetName: server?.hostname ?? alert.serverId,
    resourceId: alert.id,
    resourceName: alert.title,
    summary: report.summary,
    plan: report.repairPlan.map((rp) => `步骤${rp.step}: ${rp.action} [风险:${rp.risk}] [回滚:${rp.rollback}]`),
    output: JSON.stringify(report)
  });

  await createAuditLog({
    action: "diagnosis.run",
    actor: getActor(res),
    resourceType: "alert",
    resourceId: alert.id,
    summary: `AI 诊断告警: ${alert.title}`,
    details: { modelId: report.model.id, mode: report.mode, taskId: task.id }
  });

  res.json(report);
}));

router.post("/server/:serverId", asyncHandler(async (req, res) => {
  const serverId = String(req.params.serverId);
  const server = await getServer(serverId);
  if (!server) {
    res.status(404).json({ message: "Server not found" });
    return;
  }

  const [metrics, inventory, model, alerts, allServers] = await Promise.all([
    getServerMetrics(serverId, 12),
    getServerInventory(serverId),
    getDefaultAiModelForRuntime(),
    getAlerts(),
    getServers()
  ]);

  const serverAlerts = alerts.filter((a) => a.serverId === serverId && a.status !== "resolved");

  const context = {
    server: {
      id: server.id,
      hostname: server.hostname,
      ip: server.ip,
      environment: server.environment,
      status: server.status,
      agentStatus: server.agentStatus,
      os: server.os,
      cpuUsage: server.cpuUsage,
      memoryUsage: server.memoryUsage,
      diskUsage: server.diskUsage,
      loadAvg: server.loadAvg
    },
    metrics: metrics.map((m) => ({
      cpuUsage: m.cpuUsage,
      memoryUsage: m.memoryUsage,
      diskUsage: m.diskUsage,
      loadAvg: m.loadAvg,
      collectedAt: m.collectedAt
    })),
    inventory: inventory ? {
      kernel: inventory.kernel,
      cpuModel: inventory.cpuModel,
      cpuCores: inventory.cpuCores,
      memoryTotalMb: inventory.memoryTotalMb,
      diskTotalGb: inventory.diskTotalGb,
      uptimeSeconds: inventory.uptimeSeconds
    } : null,
    activeAlerts: serverAlerts.map((a) => ({ id: a.id, title: a.title, severity: a.severity })),
    clusterInfo: {
      sameEnvServers: allServers.filter((s) => s.environment === server.environment).map((s) => ({
        hostname: s.hostname,
        cpuUsage: s.cpuUsage,
        memoryUsage: s.memoryUsage,
        status: s.status
      }))
    }
  };

  const hasIssues = server.cpuUsage >= 80 || server.memoryUsage >= 80 || server.diskUsage >= 80
    || serverAlerts.length > 0 || server.status !== "healthy";

  const fallback: DiagnosisFallback = {
    summary: hasIssues
      ? `${server.hostname} 存在 ${serverAlerts.length} 条活跃告警，资源使用率偏高，建议进一步排查。`
      : `${server.hostname} 运行状态正常，当前各项指标均在安全范围内。`,
    impact: hasIssues
      ? `影响 ${server.hostname} (${server.environment}) 的正常运行，可能关联 ${serverAlerts.length} 条告警。`
      : "当前无影响面",
    timeline: [
      { time: new Date().toISOString(), event: `对 ${server.hostname} 发起健康诊断` },
      { time: new Date().toISOString(), event: `CPU: ${server.cpuUsage}%, 内存: ${server.memoryUsage}%, 磁盘: ${server.diskUsage}%` }
    ],
    evidence: [
      { source: "server_metrics", content: `当前 CPU 使用率 ${server.cpuUsage}%，内存 ${server.memoryUsage}%，磁盘 ${server.diskUsage}%`, weight: "high" },
      { source: "agent_status", content: `Agent 状态: ${server.agentStatus}`, weight: "medium" }
    ],
    possibleCauses: server.cpuUsage >= 80
      ? [{ cause: "CPU 使用率偏高，可能存在异常进程或资源不足", confidence: 0.7, evidenceRefs: [0] }]
      : [{ cause: "各项指标正常，未发现明显异常", confidence: 0.9, evidenceRefs: [0] }],
    repairPlan: hasIssues
      ? [
        { step: 1, action: `登录 ${server.hostname} 检查 top 进程和资源占用`, risk: "low", rollback: "无需回滚", estimatedTime: "5分钟" },
        { step: 2, action: "查看系统日志 /var/log/syslog 和 /var/log/messages", risk: "low", rollback: "无需回滚", estimatedTime: "5分钟" },
        { step: 3, action: "根据诊断结果决定是否需要重启服务或扩容", risk: "medium", rollback: "先备份配置再操作", estimatedTime: "15分钟" }
      ]
      : [{ step: 1, action: "继续保持监控，无需干预", risk: "low", rollback: "无需回滚", estimatedTime: "0分钟" }],
    riskWarnings: server.cpuUsage >= 80 ? ["生产环境操作需审批，建议在变更窗口执行"] : [],
    nextObservations: ["持续监控 CPU/内存/磁盘趋势", "关注 Agent 心跳状态"],
    relatedEvents: serverAlerts.slice(0, 3).map((a) => ({ id: a.id, title: a.title, similarity: 0.8 }))
  };

  const report = await generateDiagnosis({
    subject: `服务器健康诊断: ${server.hostname}`,
    context: context as Record<string, unknown>,
    fallback,
    model
  });

  const task = await createTaskRecord({
    id: `diag-${Date.now().toString(36)}`,
    taskType: "server_diagnosis",
    status: "done",
    riskLevel: hasIssues ? "medium" : "low",
    requiresApproval: false,
    targetId: server.id,
    targetName: server.hostname,
    resourceId: server.id,
    resourceName: server.hostname,
    summary: report.summary,
    plan: report.repairPlan.map((rp) => `步骤${rp.step}: ${rp.action}`),
    output: JSON.stringify(report)
  });

  await createAuditLog({
    action: "diagnosis.server",
    actor: getActor(res),
    resourceType: "server",
    resourceId: server.id,
    summary: `AI 诊断服务器: ${server.hostname}`,
    details: { modelId: report.model.id, mode: report.mode, taskId: task.id }
  });

  res.json(report);
}));

function buildLocalFallback(
  alert: { id: string; title: string; severity: string; status: string; source: string; triggeredAt: string },
  server: { hostname: string; cpuUsage: number; memoryUsage: number; diskUsage: number; loadAvg: number; status: string; agentStatus: string; ip: string; environment: string } | null,
  metrics: Array<{ cpuUsage: number; memoryUsage: number; diskUsage: number; loadAvg: number; collectedAt: string }>,
  inventory: { kernel: string; cpuModel: string; memoryTotalMb: number; diskTotalGb: number; uptimeSeconds: number } | null,
  similarAlerts: Array<{ id: string; title: string; severity: string }>
): DiagnosisFallback {
  const serverInfo = server
    ? `${server.hostname} (${server.ip}) - CPU:${server.cpuUsage}% 内存:${server.memoryUsage}% 磁盘:${server.diskUsage}%`
    : "未知服务器";

  const evidence: DiagnosisFallback["evidence"] = [
    { source: "alert", content: `告警: ${alert.title} - 严重级别: ${alert.severity}`, weight: "high" },
    { source: "server_metrics", content: serverInfo, weight: "high" }
  ];

  if (server && server.cpuUsage >= 80) {
    evidence.push({ source: "server_metrics", content: `CPU 使用率 ${server.cpuUsage}% 超过 80% 阈值`, weight: "high" });
  }
  if (server && server.memoryUsage >= 80) {
    evidence.push({ source: "server_metrics", content: `内存使用率 ${server.memoryUsage}% 超过 80% 阈值`, weight: "high" });
  }
  if (inventory) {
    evidence.push({ source: "inventory", content: `${inventory.cpuModel}, ${inventory.memoryTotalMb}MB 内存, ${inventory.diskTotalGb}GB 磁盘`, weight: "medium" });
  }
  if (similarAlerts.length > 0) {
    evidence.push({
      source: "similar_alerts",
      content: `历史相似告警(${similarAlerts.length}条): ${similarAlerts.map((a) => a.title).join(", ")}`,
      weight: "medium"
    });
  }

  const possibleCauses: DiagnosisFallback["possibleCauses"] = [];
  if (server && server.cpuUsage >= 80) {
    possibleCauses.push({
      cause: `CPU 使用率偏高 (${server.cpuUsage}%)，可能原因：异常进程、资源泄漏、流量突增`,
      confidence: 0.75,
      evidenceRefs: [1]
    });
  }
  if (server && server.memoryUsage >= 80) {
    possibleCauses.push({
      cause: `内存使用率偏高 (${server.memoryUsage}%)，可能原因：内存泄漏、缓存膨胀、进程 OOM`,
      confidence: 0.7,
      evidenceRefs: [1]
    });
  }
  if (possibleCauses.length === 0) {
    possibleCauses.push({
      cause: `${alert.title} — 需要进一步分析日志和指标确认根因`,
      confidence: 0.5,
      evidenceRefs: [0]
    });
  }

  const repairPlan: DiagnosisFallback["repairPlan"] = [
    { step: 1, action: "查看服务器实时指标和进程列表", risk: "low", rollback: "无需回滚", estimatedTime: "3分钟" },
    { step: 2, action: "分析相关日志文件定位错误", risk: "low", rollback: "无需回滚", estimatedTime: "5分钟" },
    { step: 3, action: "根据诊断结果执行修复操作或启动 ChatOps 交互", risk: "medium", rollback: "操作前备份相关配置", estimatedTime: "10分钟" }
  ];

  return {
    summary: `告警「${alert.title}」(${alert.severity}) 诊断完成。关联服务器 ${serverInfo}。`,
    impact: server ? `影响 ${server.hostname} (${server.ip})` : "影响范围待确认",
    timeline: [
      { time: alert.triggeredAt, event: `告警触发: ${alert.title}` },
      { time: new Date().toISOString(), event: "发起 AI 诊断" }
    ],
    evidence,
    possibleCauses,
    repairPlan,
    riskWarnings: server?.environment === "production" ? ["生产环境操作需审批"] : [],
    nextObservations: [
      "持续观察服务器 CPU/内存/磁盘趋势",
      "检查告警是否自动恢复",
      "如告警持续，升级为工单处理"
    ],
    relatedEvents: similarAlerts.map((a) => ({ id: a.id, title: a.title, similarity: 0.7 }))
  };
}

export default router;