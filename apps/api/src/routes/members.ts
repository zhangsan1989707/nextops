import { Router } from "express";
import { getMembers, toggleMember, updateMemberRole, createAuditLog, getMember } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const members = await getMembers();
  res.json({
    items: members,
    totals: {
      members: members.length,
      active: members.filter((m) => m.status === "active").length,
      pending: members.filter((m) => m.status === "pending").length,
      admins: members.filter((m) => m.role === "Owner").length
    }
  });
}));

router.post("/:id/toggle", asyncHandler(async (req, res) => {
  const memberId = String(req.params.id);
  const actor = res.locals.actor ?? "unknown";
  
  // 获取变更前的成员信息用于审计
  const originalMember = await getMember(memberId);
  const member = await toggleMember(memberId);
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }
  
  // 记录审计日志
  const action = member.status === "active" ? "member.enable" : "member.disable";
  await createAuditLog({
    action,
    actor,
    resourceType: "member",
    resourceId: memberId,
    summary: `${actor} ${member.status === "active" ? "启用" : "禁用"}了成员 ${member.name}`,
    details: {
      oldStatus: originalMember?.status ?? "unknown",
      newStatus: member.status,
      memberName: member.name,
      memberEmail: member.email
    }
  });
  
  res.json(member);
}));

router.post("/:id/role", asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !["Owner", "SRE", "Reviewer", "Developer"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  const memberId = String(req.params.id);
  const actor = res.locals.actor ?? "unknown";
  
  // 获取变更前的成员信息用于审计
  const originalMember = await getMember(memberId);
  const member = await updateMemberRole(memberId, role);
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }
  
  // 记录审计日志
  await createAuditLog({
    action: "member.role_update",
    actor,
    resourceType: "member",
    resourceId: memberId,
    summary: `${actor} 将成员 ${member.name} 的角色从 ${originalMember?.role ?? "unknown"} 变更为 ${role}`,
    details: {
      oldRole: originalMember?.role ?? "unknown",
      newRole: role,
      memberName: member.name,
      memberEmail: member.email
    }
  });
  
  res.json(member);
}));

export default router;
