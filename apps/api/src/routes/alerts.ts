import { Router } from "express";
import { getAlerts, getAlert } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json({ items: await getAlerts() });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const alert = await getAlert(String(req.params.id));
  if (!alert) {
    res.status(404).json({ message: "Alert not found" });
    return;
  }
  res.json(alert);
}));

export default router;
