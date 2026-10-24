import Reminder from "../models/Reminder.js";
import Application from "../models/Application.js";
import HttpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id, status: { $in: ["pending", "sent", "done"] } })
    .populate("application", "company role stage")
    .sort("dueAt")
    .limit(300);
  res.json({ reminders });
});

export const create = asyncHandler(async (req, res) => {
  const title = String(req.body.title ?? "").trim();
  const dueAt = new Date(req.body.dueAt);
  if (!title) throw new HttpError(400, "Add a title for the reminder");
  if (title.length > 200) throw new HttpError(400, "Title must be 200 characters or fewer");
  if (Number.isNaN(dueAt.getTime())) throw new HttpError(400, "Pick a valid date");

  const app = await Application.findOne({ _id: req.body.application, user: req.user._id }).select("_id");
  if (!app) throw new HttpError(404, "Application not found");

  const reminder = await Reminder.create({ user: req.user._id, application: app._id, type: "custom", title, dueAt });
  res.status(201).json({ reminder });
});

export const markDone = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: { $in: ["pending", "sent"] } },
    { $set: { status: "done" } },
    { new: true }
  );
  if (!reminder) throw new HttpError(404, "Reminder not found or already completed");
  res.json({ reminder });
});

export const snooze = asyncHandler(async (req, res) => {
  const days = Number(req.body.days ?? 1);
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new HttpError(400, "Snooze between 1 and 30 days");
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: { $in: ["pending", "sent"] } },
    { $set: { status: "pending", dueAt: new Date(Date.now() + days * 86400000), attempts: 0 }, $unset: { sentAt: 1 } },
    { new: true }
  );
  if (!reminder) throw new HttpError(404, "Reminder not found or already completed");
  res.json({ reminder });
});
