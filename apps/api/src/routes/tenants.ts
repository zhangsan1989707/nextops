import { Router } from "express";
import { getTenants } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/summary", asyncHandler(async (_req, res) => {
  const tenants = await getTenants();
  res.json({
    items: tenants,
    totals: {
      tenants: tenants.length,
      servers: tenants.reduce((total, t) => total + t.servers, 0),
      alerts: tenants.reduce((total, t) => total + t.alerts, 0),
      aiDiagnosesToday: tenants.reduce((total, t) => total + t.aiDiagnosesToday, 0)
    }
  });
}));

export default router;
