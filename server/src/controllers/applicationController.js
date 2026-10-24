import Application from "../models/Application.js";
import StageEvent from "../models/StageEvent.js";
import Reminder from "../models/Reminder.js";
import MatchAnalysis from "../models/MatchAnalysis.js";
import { STAGES, TRANSITIONS, canTransition } from "../services/stateMachine.js";
import { syncRemindersForStage } from "../services/reminderService.js";
import HttpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SORTS = { recent: "-updatedAt", oldest: "updatedAt", company: "company", stage: "stageChangedAt" };

function cleanUrl(u) {
  const value = String(u ?? "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new HttpError(400, "Job link must be a valid http or https URL");
  }
}

function buildFields(body, { requireCore }) {
  const out = {};
  const str = (k, max) => {
    if (body[k] === undefined) return;
    const v = String(body[k] ?? "").trim();
    if (v.length > max) throw new HttpError(400, `${k} must be ${max} characters or fewer`);
    out[k] = v;
  };
  str("company", 100); str("role", 120); str("source", 40); str("location", 80);
  str("salary", 60); str("notes", 5000); str("jobDescription", 10000);
  if (body.url !== undefined) out.url = cleanUrl(body.url);

  if (requireCore && (!out.company || !out.role)) throw new HttpError(400, "Company and role are required");
  if (!requireCore && (out.company === "" || out.role === "")) throw new HttpError(400, "Company and role cannot be empty");
  return out;
}

export const list = asyncHandler(async (req, res) => {
  const { q, stage, source, sort = "recent" } = req.query;
  const filter = { user: req.user._id };
  if (stage) {
    if (!STAGES.includes(stage)) throw new HttpError(400, "Unknown stage");
    filter.stage = stage;
  }
  if (source) filter.source = String(source);
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), "i");
    filter.$or = [{ company: rx }, { role: rx }, { location: rx }];
  }
  const apps = await Application.find(filter).select("-jobDescription").sort(SORTS[sort] || SORTS.recent).limit(500);
  res.json({ applications: apps });
});

export const create = asyncHandler(async (req, res) => {
  const fields = buildFields(req.body, { requireCore: true });
  const stage = req.body.stage ?? "wishlist";
  if (!["wishlist", "applied"].includes(stage)) throw new HttpError(400, "New applications start as wishlist or applied");

  if (!req.body.force) {
    const dup = await Application.findOne({
      user: req.user._id,
      company: new RegExp(`^${escapeRegex(fields.company)}$`, "i"),
      role: new RegExp(`^${escapeRegex(fields.role)}$`, "i"),
    }).select("_id stage");
    if (dup)
      throw new HttpError(409, `You already track ${fields.role} at ${fields.company} (${dup.stage}).`, {
        duplicate: true, existingId: dup._id,
      });
  }

  const app = await Application.create({ ...fields, user: req.user._id, stage });
  await StageEvent.create({ user: req.user._id, application: app._id, fromStage: null, toStage: stage });
  await syncRemindersForStage(app, stage);
  res.status(201).json({ application: app });
});

export const getOne = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!app) throw new HttpError(404, "Application not found");
  const [events, reminders, analyses] = await Promise.all([
    StageEvent.find({ application: app._id }).sort("createdAt"),
    Reminder.find({ application: app._id, status: { $ne: "cancelled" } }).sort("dueAt"),
    MatchAnalysis.find({ application: app._id }).sort("-createdAt").limit(20),
  ]);
  res.json({ application: app, events, reminders, analyses, allowedNext: TRANSITIONS[app.stage] });
});

export const update = asyncHandler(async (req, res) => {
  const fields = buildFields(req.body, { requireCore: false });
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: fields },
    { new: true, runValidators: true }
  );
  if (!app) throw new HttpError(404, "Application not found");
  res.json({ application: app });
});

export const moveStage = asyncHandler(async (req, res) => {
  const to = req.body.stage;
  if (!STAGES.includes(to)) throw new HttpError(400, "Unknown stage");

  const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!app) throw new HttpError(404, "Application not found");
  const from = app.stage;
  if (from === to) throw new HttpError(400, `Already in ${to}`);
  if (!canTransition(from, to))
    throw new HttpError(400, `Cannot move from ${from} to ${to}`, { allowed: TRANSITIONS[from] });

  // Compare-and-set on the old stage so two concurrent moves can't both succeed.
  const updated = await Application.findOneAndUpdate(
    { _id: app._id, user: req.user._id, stage: from },
    { $set: { stage: to, stageChangedAt: new Date() } },
    { new: true }
  );
  if (!updated) throw new HttpError(409, "This application was just changed elsewhere. Refresh and try again.");

  await StageEvent.create({ user: req.user._id, application: app._id, fromStage: from, toStage: to });
  await syncRemindersForStage(updated, to);
  res.json({ application: updated });
});

export const remove = asyncHandler(async (req, res) => {
  const app = await Application.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!app) throw new HttpError(404, "Application not found");
  await Promise.all([
    StageEvent.deleteMany({ application: app._id }),
    Reminder.deleteMany({ application: app._id }),
    MatchAnalysis.deleteMany({ application: app._id }),
  ]);
  res.json({ message: "Application deleted" });
});
