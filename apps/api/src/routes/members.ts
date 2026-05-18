import { Router } from "express";
import { getMembers, toggleMember, updateMemberRole } from "../db.js";
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
  const member = await toggleMember(String(req.params.id));
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }
  res.json(member);
}));

router.post("/:id/role", asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !["Owner", "SRE", "Reviewer", "Developer"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  const member = await updateMemberRole(String(req.params.id), role);
  if (!member) {
    res.status(404).json({ message: "Member not found" });
    return;
  }
  res.json(member);
}));

export default router;
