export const STAGES = [
  "wishlist", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn",
];

export const TRANSITIONS = {
  wishlist: ["applied", "withdrawn"],
  applied: ["screening", "interview", "rejected", "withdrawn"],
  screening: ["interview", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: ["applied"], // explicit reopen
  withdrawn: [],
};

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;
