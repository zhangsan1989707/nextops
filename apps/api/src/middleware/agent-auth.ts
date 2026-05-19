import type { Request, Response, NextFunction } from "express";

const AGENT_TOKEN = process.env.AGENT_TOKEN;

export function agentAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!AGENT_TOKEN) {
    res.status(500).json({ message: "Agent registration is not configured (missing AGENT_TOKEN)" });
    return;
  }

  const token = req.headers["x-agent-token"] ?? req.headers["x-agent-key"];

  if (!token || token !== AGENT_TOKEN) {
    res.status(401).json({ message: "Invalid agent token" });
    return;
  }

  next();
}