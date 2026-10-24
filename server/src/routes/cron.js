import { Router } from "express";
import crypto from "crypto";
import { runReminderJob } from "../services/reminderJob.js";

const router = Router();

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Lets an external scheduler trigger reminders on hosts that sleep (e.g. a free Render instance).
router.post("/reminders", async (req, res, next) => {
  try {
    if (!process.env.CRON_SECRET) return res.status(503).json({ message: "Cron endpoint is not configured" });
    if (!safeEqual(req.get("x-cron-secret") || "", process.env.CRON_SECRET))
      return res.status(401).json({ message: "Invalid cron secret" });
    res.json(await runReminderJob());
  } catch (err) {
    next(err);
  }
});

export default router;
