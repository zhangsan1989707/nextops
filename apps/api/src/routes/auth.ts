import { Router } from "express";
import bcrypt from "bcryptjs";
import { getMemberByEmail } from "../db.js";
import { signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  const member = await getMemberByEmail(email);
  if (!member || !member.passwordHash) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken({
    userId: member.id,
    email: member.email,
    role: member.role,
    tenantId: "default"
  });

  res.json({
    token,
    user: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      team: member.team
    }
  });
}));

router.get("/me", asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authorization header required" });
    return;
  }

  const { verifyToken } = await import("../middleware/auth.js");
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const member = await getMemberByEmail(payload.email);
  if (!member) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    team: member.team
  });
}));

export default router;
