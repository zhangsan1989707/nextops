import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { errorHandler } from "./middleware/error.js";
import { initializeDatabase } from "./db.js";

// Routes
import healthRouter from "./routes/health.js";
import dashboardRouter from "./routes/dashboard.js";
import serversRouter from "./routes/servers.js";
import agentsRouter from "./routes/agents.js";
import alertsRouter from "./routes/alerts.js";
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
import packagesRouter from "./routes/packages.js";
import tenantsRouter from "./routes/tenants.js";
import auditLogsRouter from "./routes/audit-logs.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(express.json());

// Health check
app.use("/health", healthRouter);

// API routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/servers", serversRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/scripts", scriptsRouter);
app.use("/api/slash-commands", slashCommandsRouter);
app.use("/api/chatops", chatopsRouter);
app.use("/api/models", modelsRouter);
app.use("/api/members", membersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/files", filesRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/audit-logs", auditLogsRouter);

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
