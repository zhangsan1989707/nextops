import { Router } from "express";
import { getSlashCommands } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getSlashCommands() });
}));

router.get("/enabled", asyncHandler(async (_req, res) => {
  const commands = await getSlashCommands();
  res.json({ items: commands.filter((c: { enabled?: boolean }) => c.enabled !== false) });
}));

export default router;
