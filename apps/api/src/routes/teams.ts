import { Router } from "express";
import { getTeams, toggleTeam } from "../db.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

router.get("/summary", asyncHandler(async (_req, res) => {
  const teams = await getTeams();
  res.json({
    items: teams,
    totals: {
      teams: teams.length,
      active: teams.filter((t) => t.status === "active").length,
      members: teams.reduce((total, t) => total + t.memberCount, 0),
      servers: teams.reduce((total, t) => total + t.serverCount, 0)
    }
  });
}));

router.post("/:id/toggle", asyncHandler(async (req, res) => {
  const team = await toggleTeam(String(req.params.id));
  if (!team) {
    res.status(404).json({ message: "Team not found" });
    return;
  }
  res.json(team);
}));

export default router;
