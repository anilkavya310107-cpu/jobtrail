import Reminder from "../models/Reminder.js";

const DAY = 24 * 60 * 60 * 1000;

const AUTO = {
  applied: { type: "follow_up", days: 7, title: (a) => `Follow up on your ${a.role} application at ${a.company}` },
  interview: { type: "thank_you", days: 1, title: (a) => `Send a thank-you note to ${a.company} after your interview` },
  offer: { type: "offer_decision", days: 3, title: (a) => `Review and respond to the ${a.company} offer` },
};

// Pending reminders that no longer make sense once the application reaches a stage.
const SUPERSEDED = {
  screening: ["follow_up"],
  interview: ["follow_up"],
  offer: ["follow_up", "thank_you"],
};

const CLOSING = ["rejected", "withdrawn", "accepted"];

export async function syncRemindersForStage(app, toStage) {
  const open = { application: app._id, status: { $in: ["pending", "sent"] } };

  if (CLOSING.includes(toStage)) {
    await Reminder.updateMany(open, { $set: { status: "cancelled" } });
    return;
  }

  if (SUPERSEDED[toStage]) {
    await Reminder.updateMany(
      { ...open, auto: true, type: { $in: SUPERSEDED[toStage] } },
      { $set: { status: "cancelled" } }
    );
  }

  const rule = AUTO[toStage];
  if (!rule) return;
  try {
    await Reminder.create({
      user: app.user,
      application: app._id,
      type: rule.type,
      auto: true,
      title: rule.title(app),
      dueAt: new Date(Date.now() + rule.days * DAY),
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // 11000 = a pending one already exists, which is fine
  }
}
