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

    res.json({
      servers: {
        total: servers.length,
        online: onlineServers,
        warning: servers.filter((server) => server.status === "warning").length,
        offline: servers.filter((server) => server.status === "offline").length
      },
      alerts: {
        total: alerts.length,
        critical: criticalAlerts,
        open: alerts.filter((alert) => alert.status === "open").length
      },
      automation: {
        slashCommands: slashCommands.length,
        scripts: scripts.length,
        aiDiagnosesToday
      },
      trends
    });
  })
);

export default router;
