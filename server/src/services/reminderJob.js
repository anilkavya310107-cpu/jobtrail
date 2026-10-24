import cron from "node-cron";
import Reminder from "../models/Reminder.js";
import { sendReminderEmail } from "./mailer.js";

const MAX_ATTEMPTS = 3;
let running = false;

export async function runReminderJob() {
  if (running) return { skipped: true };
  running = true;
  const summary = { processed: 0, failed: 0 };
  try {
    const due = await Reminder.find({ status: "pending", dueAt: { $lte: new Date() } })
      .select("_id")
      .limit(200)
      .lean();

    for (const { _id } of due) {
      // Atomic claim: only one runner can flip pending -> sent, so a reminder never fires twice.
      const claimed = await Reminder.findOneAndUpdate(
        { _id, status: "pending" },
        { $set: { status: "sent", sentAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
      )
        .populate("user", "name email")
        .populate("application", "company role");
      if (!claimed || !claimed.user || !claimed.application) continue;

      try {
        await sendReminderEmail({
          to: claimed.user.email,
          name: claimed.user.name,
          title: claimed.title,
          company: claimed.application.company,
          role: claimed.application.role,
        });
        summary.processed++;
      } catch (err) {
        summary.failed++;
        console.error("Reminder email failed:", err.message);
        if (claimed.attempts >= MAX_ATTEMPTS) {
          await Reminder.updateOne({ _id }, { $set: { status: "failed" } });
        } else {
          // retry in 30 minutes
          await Reminder.updateOne(
            { _id },
            { $set: { status: "pending", dueAt: new Date(Date.now() + 30 * 60 * 1000) } }
          );
        }
      }
    }
  } finally {
    running = false;
  }
  return summary;
}

export function startScheduler() {
  cron.schedule("*/15 * * * *", () => {
    runReminderJob().catch((e) => console.error("Reminder job error:", e.message));
  });
  console.log("Reminder scheduler started (every 15 minutes)");
}
