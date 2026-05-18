import { Router } from "express";
import { getSlashCommands } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getSlashCommands() });
}));

export default router;
