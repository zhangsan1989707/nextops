import { Router } from "express";
import { getTaskRecords } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getTaskRecords() });
}));

export default router;
