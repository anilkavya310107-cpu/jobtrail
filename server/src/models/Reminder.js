import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    type: { type: String, enum: ["follow_up", "thank_you", "offer_decision", "custom"], required: true },
    auto: { type: Boolean, default: false },
    title: { type: String, required: true, maxlength: 200 },
    dueAt: { type: Date, required: true },
    // pending: waiting | sent: notified, awaiting action | done | cancelled | failed (email kept failing)
    status: { type: String, enum: ["pending", "sent", "done", "cancelled", "failed"], default: "pending" },
    sentAt: Date,
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reminderSchema.index({ status: 1, dueAt: 1 });
reminderSchema.index({ user: 1, status: 1 });
// An application can only have one pending automatic reminder of each type (dedupe).
reminderSchema.index(
  { application: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: "pending", auto: true } }
);

export default mongoose.model("Reminder", reminderSchema);
