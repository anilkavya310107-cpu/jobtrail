import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import applicationRoutes from "./routes/applications.js";
import reminderRoutes from "./routes/reminders.js";
import resumeRoutes from "./routes/resumes.js";
import analyticsRoutes from "./routes/analytics.js";
import cronRoutes from "./routes/cron.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  const origins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/cron", cronRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
