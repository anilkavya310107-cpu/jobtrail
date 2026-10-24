import mongoose from "mongoose";
import { STAGES } from "../services/stateMachine.js";

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, default: "" },
    source: { type: String, default: "Other", trim: true, maxlength: 40 },
    location: { type: String, default: "", trim: true, maxlength: 80 },
    salary: { type: String, default: "", trim: true, maxlength: 60 },
    notes: { type: String, default: "", maxlength: 5000 },
    jobDescription: { type: String, default: "", maxlength: 10000 },
    stage: { type: String, enum: STAGES, default: "wishlist" },
    stageChangedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, stage: 1 });
applicationSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model("Application", applicationSchema);
