import { Router } from "express";
import { getAlerts, getScripts, getServers, getSlashCommands, getTaskRecords, getRecentMetricTrends } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [servers, alerts, scripts, slashCommands, tasks, trends] = await Promise.all([
      getServers(),
      getAlerts(),
      getScripts(),
      getSlashCommands(),
      getTaskRecords(200),
      getRecentMetricTrends(24)
    ]);

    const onlineServers = servers.filter((server) => server.agentStatus === "online").length;
    const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
    const today = new Date().toISOString().slice(0, 10);
    const aiDiagnosesToday = tasks.filter((task) => task.taskType.includes("diagnose") && task.createdAt.startsWith(today)).length;

    const openAlerts = alerts.filter((a) => a.status === "open").length;
    const resolvedToday = alerts.filter((a) => a.status === "resolved" && new Date(a.triggeredAt).toISOString().startsWith(today)).length;
    const totalAlerts = alerts.length;
    const alertConvergenceRate = totalAlerts > 0 ? Math.round((resolvedToday / totalAlerts) * 100) : 100;

    const highRiskServers = servers.filter((s) => s.cpuUsage >= 80 || s.memoryUsage >= 80 || s.diskUsage >= 80 || s.status === "warning");
    const avgCpu = servers.length > 0 ? Math.round(servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length) : 0;
    const avgMemory = servers.length > 0 ? Math.round(servers.reduce((sum, s) => sum + s.memoryUsage, 0) / servers.length) : 0;
    const avgDisk = servers.length > 0 ? Math.round(servers.reduce((sum, s) => sum + s.diskUsage, 0) / servers.length) : 0;

    const aiTasksToday = tasks.filter((t) => t.createdAt.startsWith(today));
    const aiAdoptionRate = tasks.length > 0 ? Math.round((aiTasksToday.length / tasks.length) * 100) : 0;

    const pendingApprovals = tasks.filter((t) => t.status === "waiting_approval").length;
    const scriptsExecuted = tasks.filter((t) => t.taskType === "script_run").length;

    const alertTimeline = alerts
      .filter((a) => a.triggeredAt.startsWith(today))
      .map((a) => ({ time: a.triggeredAt, severity: a.severity, title: a.title }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    const opsSla = {
      alertsTotal: totalAlerts,
      alertsOpen: openAlerts,
      alertsResolvedToday: resolvedToday,
      alertConvergenceRate,
      pendingApprovals,
      avgResponseTimeMinutes: 15
    };

    res.json({
      servers: {
        total: servers.length,
        online: onlineServers,
        warning: servers.filter((server) => server.status === "warning").length,
        offline: servers.filter((server) => server.status === "offline").length,
        highRisk: highRiskServers.length,
        highRiskList: highRiskServers.map((s) => ({
          id: s.id,
          hostname: s.hostname,
          cpuUsage: s.cpuUsage,
          memoryUsage: s.memoryUsage,
          diskUsage: s.diskUsage,
          status: s.status
        }))
      },
      alerts: {
        total: totalAlerts,
        critical: criticalAlerts,
        open: openAlerts,
        resolvedToday,
        alertConvergenceRate,
        alertTimeline
      },
      resources: {
        avgCpu,
        avgMemory,
        avgDisk,
        loadAvg: servers.length > 0 ? Math.round(servers.reduce((sum, s) => sum + s.loadAvg, 0) / servers.length * 10) / 10 : 0
      },
      automation: {
        slashCommands: slashCommands.length,
        scripts: scripts.length,
        aiDiagnosesToday,
        scriptsExecuted
      },
      ai: {
        aiDiagnosesToday,
        aiAdoptionRate,
        estimatedTimeSaved: aiDiagnosesToday * 5
      },
      opsSla,
      metrics: {
        avgResponseTimeMinutes: opsSla.avgResponseTimeMinutes,
        mttrEstimateMinutes: resolvedToday > 0 ? Math.round(60 / resolvedToday) : 0,
        healthScore: servers.length > 0
          ? Math.round((onlineServers / servers.length) * 100 - (highRiskServers.length * 10)) : 100
      },
      trends
    });
  })
);

export default router;