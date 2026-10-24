// Mirrors server/src/services/stateMachine.js
export const STAGES = ["wishlist", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn"];
export const BOARD_STAGES = ["wishlist", "applied", "screening", "interview", "offer", "accepted"];
export const CLOSED_STAGES = ["rejected", "withdrawn"];

export const TRANSITIONS = {
  wishlist: ["applied", "withdrawn"],
  applied: ["screening", "interview", "rejected", "withdrawn"],
  screening: ["interview", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: ["applied"],
  withdrawn: [],
};

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

export const STAGE_LABEL = {
  wishlist: "Wishlist", applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn",
};

export const SOURCES = ["LinkedIn", "Referral", "Company site", "Job board", "Recruiter", "Campus", "Other"];
