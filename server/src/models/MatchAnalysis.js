import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },
    resumeName: String,
    resumeHash: { type: String, required: true },
    jdHash: { type: String, required: true },
    baselineScore: Number,
    llmScore: Number,
    score: { type: Number, required: true },
    source: { type: String, enum: ["hybrid", "baseline"], required: true },
    result: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

matchSchema.index({ user: 1, resumeHash: 1, jdHash: 1, source: 1 });

export default mongoose.model("MatchAnalysis", matchSchema);
