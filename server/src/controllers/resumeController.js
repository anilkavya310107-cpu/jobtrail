import pdf from "pdf-parse/lib/pdf-parse.js";
import Resume from "../models/Resume.js";
import { sha256 } from "../services/matcher.js";
import HttpError from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";

const MAX_RESUMES = 5;

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Choose a PDF file to upload");
  if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") throw new HttpError(400, "That file is not a valid PDF");

  if ((await Resume.countDocuments({ user: req.user._id })) >= MAX_RESUMES)
    throw new HttpError(400, `You can keep up to ${MAX_RESUMES} resumes. Delete one first.`);

  let text;
  try {
    text = (await pdf(req.file.buffer)).text.replace(/\s+/g, " ").trim();
  } catch {
    throw new HttpError(422, "We couldn't read this PDF. It may be corrupted or password protected.");
  }
  if (text.length < 80)
    throw new HttpError(422, "No readable text found. Scanned or image-only PDFs aren't supported.");

  text = text.slice(0, 20000);
  const resume = await Resume.create({
    user: req.user._id,
    filename: req.file.originalname.slice(0, 120),
    size: req.file.size,
    extractedText: text,
    textHash: sha256(text),
    wordCount: text.split(" ").length,
  });
  res.status(201).json({ resume });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ resumes: await Resume.find({ user: req.user._id }).sort("-createdAt") });
});

export const remove = asyncHandler(async (req, res) => {
  const r = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!r) throw new HttpError(404, "Resume not found");
  res.json({ message: "Resume deleted" });
});
