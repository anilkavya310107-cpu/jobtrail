import mongoose from "mongoose";

const stageEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  fromStage: { type: String, default: null },
  toStage: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

stageEventSchema.index({ user: 1, createdAt: 1 });

export default mongoose.model("StageEvent", stageEventSchema);
