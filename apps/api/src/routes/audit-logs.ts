import { Router } from "express";
import { getAuditLogs } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getAuditLogs() });
}));

export default router;
