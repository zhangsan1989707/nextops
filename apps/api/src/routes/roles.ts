import { Router } from "express";
import { getRoles, getPermissions, toggleRole, toggleRolePermission } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/summary", asyncHandler(async (_req, res) => {
  const [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);
  res.json({
    items: roles,
    permissions,
    totals: {
      roles: roles.length,
      enabled: roles.filter((r) => r.status === "enabled").length,
      permissions: permissions.length,
      assignments: roles.reduce((total, r) => total + r.memberCount, 0)
    }
  });
}));

router.post("/:id/toggle", asyncHandler(async (req, res) => {
  const role = await toggleRole(String(req.params.id));
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }
  res.json(role);
}));

router.post("/:id/permission", asyncHandler(async (req, res) => {
  const { permission } = req.body;
  const permissionKey = String(permission ?? "");
  const permissions = await getPermissions();

  if (!permissions.some((p) => p.key === permissionKey)) {
    res.status(400).json({ message: "Invalid permission" });
    return;
  }

  const role = await toggleRolePermission(String(req.params.id), permissionKey);
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }
  res.json(role);
}));

export default router;
