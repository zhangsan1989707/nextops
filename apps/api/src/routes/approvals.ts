import { Router } from "express";
import { getApprovalTickets, reviewApprovalTicket, createAuditLog } from "../db.js";
import { asyncHandler, getActor } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const tickets = await getApprovalTickets();
  res.json({
    items: tickets,
    totals: {
      pending: tickets.filter((t) => t.status === "pending").length,
      approved: tickets.filter((t) => t.status === "approved").length,
      rejected: tickets.filter((t) => t.status === "rejected").length,
      highRisk: tickets.filter((t) => t.riskLevel === "high").length
    }
  });
}));

router.post("/:id/action", asyncHandler(async (req, res) => {
  const { action, comment } = req.body;
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ message: "action must be approve or reject" });
    return;
  }

  const ticket = await reviewApprovalTicket(
    String(req.params.id),
    action,
    String(comment ?? "").trim() || (action === "approve" ? "审批通过。" : "审批驳回。"),
    getActor(res)
  );

  if (!ticket) {
    res.status(404).json({ message: "Approval ticket not found" });
    return;
  }

  await createAuditLog({
    action: `approval.${action}`,
    actor: getActor(res),
    resourceType: "approval_ticket",
    resourceId: ticket.id,
    summary: `${action === "approve" ? "通过" : "驳回"}审批工单 ${ticket.title}`,
    details: { status: ticket.status, comment: ticket.comment }
  });

  res.json(ticket);
}));

export default router;
