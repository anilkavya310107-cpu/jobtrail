import mongoose from "mongoose";
import Application from "../models/Application.js";
import Resume from "../models/Resume.js";
import MatchAnalysis from "../models/MatchAnalysis.js";
import { baselineMatch, llmAnalyze, sha256 } from "../services/matcher.js";
import HttpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const analyze = asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!app) throw new HttpError(404, "Application not found");

  const { resumeId } = req.body;
  if (!mongoose.isValidObjectId(resumeId)) throw new HttpError(400, "Choose a resume");
  const resume = await Resume.findOne({ _id: resumeId, user: req.user._id }).select("+extractedText");
  if (!resume) throw new HttpError(404, "Resume not found");

  const jd = String(req.body.jobDescription ?? app.jobDescription ?? "").trim();
  if (jd.length < 80) throw new HttpError(400, "Paste the full job description (at least 80 characters)");
  if (jd.length > 10000) throw new HttpError(400, "Job description is too long (max 10,000 characters)");

  const jdHash = sha256(jd);
  const base = { user: req.user._id, resumeHash: resume.textHash, jdHash, source: "hybrid" };

  // Cache: identical resume + job description never hits the AI twice.
  const cached = await MatchAnalysis.findOne(base).sort("-createdAt");
  if (cached) {
    if (String(cached.application) === String(app._id)) return res.json({ analysis: cached, cached: true });
    const copy = await MatchAnalysis.create({
      ...cached.toObject(), _id: undefined, application: app._id, resume: resume._id,
      resumeName: resume.filename, createdAt: undefined, updatedAt: undefined,
    });
    return res.status(201).json({ analysis: copy, cached: true });
  }

  const baseline = baselineMatch(resume.extractedText, jd);
  let llm = null;
  let llmError = null;
  try {
    llm = await llmAnalyze(resume.extractedText, jd);
  } catch (err) {
    llmError = err.message; // fall back to the deterministic score
  }

  const score = llm ? Math.round(0.4 * baseline.score + 0.6 * llm.fitScore) : baseline.score;
  const analysis = await MatchAnalysis.create({
    user: req.user._id,
    application: app._id,
    resume: resume._id,
    resumeName: resume.filename,
    resumeHash: resume.textHash,
    jdHash,
    baselineScore: baseline.score,
    llmScore: llm?.fitScore,
    score,
    source: llm ? "hybrid" : "baseline",
    result: { baseline, llm, llmError },
  });

  if (!app.jobDescription) {
    app.jobDescription = jd;
    await app.save();
  }
  res.status(201).json({ analysis, cached: false });
});
