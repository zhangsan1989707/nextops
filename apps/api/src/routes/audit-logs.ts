import { Router } from "express";
import { getAuditLogs } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ items: await getAuditLogs(limit) });
}));

export default router;
