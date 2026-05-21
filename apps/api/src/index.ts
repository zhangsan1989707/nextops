import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error.js";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { initializeDatabase } from "./db.js";

// Routes
import healthRouter from "./routes/health.js";
import inspectionRouter from "./routes/inspection.js";
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import serversRouter from "./routes/servers.js";
import agentsRouter from "./routes/agents.js";
import alertsRouter from "./routes/alerts.js";
import diagnosisRouter from "./routes/diagnosis.js";
import scriptsRouter from "./routes/scripts.js";
import slashCommandsRouter from "./routes/slash-commands.js";
import chatopsRouter from "./routes/chatops.js";
import modelsRouter from "./routes/models.js";
import membersRouter from "./routes/members.js";
import teamsRouter from "./routes/teams.js";
import rolesRouter from "./routes/roles.js";
import tasksRouter from "./routes/tasks.js";
import approvalsRouter from "./routes/approvals.js";
import filesRouter from "./routes/files.js";
import knowledgeRouter from "./routes/knowledge.js";
import topologyRouter from "./routes/topology.js";
import packagesRouter from "./routes/packages.js";
import tenantsRouter from "./routes/tenants.js";
import auditLogsRouter from "./routes/audit-logs.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(express.json());

// CORS — must explicitly configure ALLOWED_ORIGINS in production
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
}));

app.use(rateLimiter);

// Health check
app.use("/health", healthRouter);

// Auth (public)
app.use("/api/auth", authRouter);

// API routes — agents has public endpoints (register, metrics), rest are authenticated
app.use("/api/dashboard", authMiddleware, dashboardRouter);
app.use("/api/servers", authMiddleware, serversRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/alerts", authMiddleware, alertsRouter);
app.use("/api/diagnosis", authMiddleware, diagnosisRouter);
app.use("/api/scripts", authMiddleware, scriptsRouter);
app.use("/api/slash-commands", authMiddleware, slashCommandsRouter);
app.use("/api/chatops", authMiddleware, chatopsRouter);
app.use("/api/models", authMiddleware, modelsRouter);
app.use("/api/members", authMiddleware, membersRouter);
app.use("/api/teams", authMiddleware, teamsRouter);
app.use("/api/roles", authMiddleware, rolesRouter);
app.use("/api/tasks", authMiddleware, tasksRouter);
app.use("/api/approvals", authMiddleware, approvalsRouter);
app.use("/api/files", authMiddleware, filesRouter);
app.use("/api/knowledge", authMiddleware, knowledgeRouter);
app.use("/api/inspection", authMiddleware, inspectionRouter);
app.use("/api/topology", authMiddleware, topologyRouter);
app.use("/api/packages", authMiddleware, packagesRouter);
app.use("/api/tenants", authMiddleware, tenantsRouter);
app.use("/api/audit-logs", authMiddleware, auditLogsRouter);

// Error handler (must be last)
app.use(errorHandler);

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`NextOps API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
