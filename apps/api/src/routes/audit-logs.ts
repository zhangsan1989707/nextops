import { Router } from "express";
import { getAuditLogs } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  // 安全限制：确保limit是正整数，最大不超过1000
  const MAX_LIMIT = 1000;
  const DEFAULT_LIMIT = 50;
  let limit = parseInt(req.query.limit as string);
  
  // 验证limit参数
  if (isNaN(limit) || limit <= 0) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  
  res.json({ items: await getAuditLogs(limit) });
}));

export default router;
