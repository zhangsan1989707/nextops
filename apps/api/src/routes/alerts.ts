import { Router } from "express";
import { getAlerts, getAlert, createAuditLog } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const alerts = await getAlerts();
  const stats = {
    total: alerts.length,
    open: alerts.filter((a) => a.status === "open").length,
    acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
    silenced: alerts.filter((a) => a.status === "silenced").length,
    escalated: alerts.filter((a) => a.status === "escalated").length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length
  };

  const groups = buildAlertGroups(alerts);

  res.json({ items: alerts, stats, groups });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const alert = await getAlert(String(req.params.id));
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  res.json(alert);
}));

router.post("/:id/acknowledge", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const alert = await getAlert(id);
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  if (alert.status !== "open") {
    res.status(400).json({ message: `Cannot acknowledge alert in status: ${alert.status}` });
    return;
  }

  await createAuditLog({
    action: "alert.acknowledge",
    actor: getActor(res),
    resourceType: "alert",
    resourceId: id,
    summary: `认领告警: ${alert.title}`,
    details: { previousStatus: alert.status }
  });

  res.json({ ...alert, status: "acknowledged", acknowledgedBy: getActor(res), acknowledgedAt: new Date().toISOString() });
}));

router.post("/:id/escalate", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const alert = await getAlert(id);
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }

  await createAuditLog({
    action: "alert.escalate",
    actor: getActor(res),
    resourceType: "alert",
    resourceId: id,
    summary: `升级告警: ${alert.title}`,
    details: { previousStatus: alert.status }
  });

  res.json({ ...alert, status: "escalated", escalatedBy: getActor(res), escalatedAt: new Date().toISOString() });
}));

router.post("/:id/silence", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const duration = Number(req.body?.duration ?? 3600);
  const alert = await getAlert(id);
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }

  await createAuditLog({
    action: "alert.silence",
    actor: getActor(res),
    resourceType: "alert",
    resourceId: id,
    summary: `静默告警: ${alert.title} (${duration}s)`,
    details: { previousStatus: alert.status, duration }
  });

  const silenceUntil = new Date(Date.now() + duration * 1000).toISOString();
  res.json({ ...alert, status: "silenced", silencedBy: getActor(res), silenceUntil });
}));

router.post("/:id/resolve", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const alert = await getAlert(id);
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  if (alert.status === "resolved") {
    res.status(400).json({ message: "Alert already resolved" });
    return;
  }

  await createAuditLog({
    action: "alert.resolve",
    actor: getActor(res),
    resourceType: "alert",
    resourceId: id,
    summary: `解决告警: ${alert.title}`,
    details: { previousStatus: alert.status }
  });

  res.json({ ...alert, status: "resolved", resolvedBy: getActor(res), resolvedAt: new Date().toISOString() });
}));

function buildAlertGroups(alerts: Array<{ id: string; title: string; severity: string; status: string; serverId: string; source: string; triggeredAt: string }>) {
  const fingerprintMap = new Map<string, typeof alerts>();

  for (const alert of alerts) {
    const fingerprint = generateFingerprint(alert);
    const existing = fingerprintMap.get(fingerprint);
    if (existing) {
      existing.push(alert);
    } else {
      fingerprintMap.set(fingerprint, [alert]);
    }
  }

  const groups: Array<{
    fingerprint: string;
    title: string;
    count: number;
    severities: string[];
    alerts: typeof alerts;
    isStorm: boolean;
  }> = [];

  for (const [fingerprint, groupAlerts] of fingerprintMap) {
    const isStorm = groupAlerts.length >= 5;
    groups.push({
      fingerprint,
      title: groupAlerts[0].title,
      count: groupAlerts.length,
      severities: [...new Set(groupAlerts.map((a) => a.severity))],
      alerts: groupAlerts,
      isStorm
    });
  }

  groups.sort((a, b) => b.count - a.count);
  return groups;
}

function generateFingerprint(alert: { title: string; serverId: string; source: string }): string {
  const normalized = alert.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_");
  return `${normalized}_${alert.serverId}_${alert.source}`.slice(0, 120);
}

export default router;