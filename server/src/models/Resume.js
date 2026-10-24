import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true },
    size: Number,
    extractedText: { type: String, required: true, select: false },
    textHash: { type: String, required: true },
    wordCount: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);
