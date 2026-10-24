import Application from "../models/Application.js";
import StageEvent from "../models/StageEvent.js";
import asyncHandler from "../utils/asyncHandler.js";

const RANK = { applied: 1, screening: 2, interview: 3, offer: 4, accepted: 5 };
const FUNNEL = ["applied", "screening", "interview", "offer", "accepted"];
const RESPONDED = ["screening", "interview", "offer", "accepted", "rejected"];
const DAY = 86400000;

export const getAnalytics = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const eightWeeksAgo = new Date(Date.now() - 56 * DAY);

  const [apps, perApp, weekly] = await Promise.all([
    Application.find({ user }).select("source stage").lean(),
    StageEvent.aggregate([
      { $match: { user } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: "$application", events: { $push: { to: "$toStage", at: "$createdAt" } } } },
    ]),
    Application.aggregate([
      { $match: { user, createdAt: { $gte: eightWeeksAgo } } },
      { $group: { _id: { $dateToString: { format: "%G-W%V", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const sourceOf = new Map(apps.map((a) => [String(a._id), a.source || "Other"]));
  const funnelCounts = Object.fromEntries(FUNNEL.map((s) => [s, 0]));
  const dwell = {}; // stage -> {total, n}
  const sources = {}; // source -> {applied, interviews}
  let applied = 0;
  let responded = 0;

  for (const { _id, events } of perApp) {
    const reached = events.map((e) => e.to);
    const maxRank = Math.max(0, ...reached.map((s) => RANK[s] || 0));
    for (const s of FUNNEL) if (maxRank >= RANK[s]) funnelCounts[s]++;

    const didApply = maxRank >= 1;
    if (didApply) {
      applied++;
      if (reached.some((s) => RESPONDED.includes(s))) responded++;
    }
    const src = sourceOf.get(String(_id)) || "Other";
    sources[src] ??= { source: src, applied: 0, interviews: 0 };
    if (didApply) sources[src].applied++;
    if (maxRank >= RANK.interview) sources[src].interviews++;

    // Completed stays only: time between entering a stage and moving on.
    for (let i = 0; i < events.length - 1; i++) {
      const stage = events[i].to;
      if (!["wishlist", ...FUNNEL].includes(stage)) continue;
      const days = (new Date(events[i + 1].at) - new Date(events[i].at)) / DAY;
      dwell[stage] ??= { total: 0, n: 0 };
      dwell[stage].total += days;
      dwell[stage].n++;
    }
  }

  const funnel = FUNNEL.map((stage, i) => ({
    stage,
    count: funnelCounts[stage],
    conversionFromPrevious: i === 0 || !funnelCounts[FUNNEL[i - 1]] ? null : Math.round((funnelCounts[stage] / funnelCounts[FUNNEL[i - 1]]) * 100),
  }));

  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  res.json({
    totals: {
      applications: apps.length,
      active: apps.filter((a) => !["accepted", "rejected", "withdrawn"].includes(a.stage)).length,
      applied,
      responseRate: pct(responded, applied),
      interviewRate: pct(funnelCounts.interview, applied),
      offerRate: pct(funnelCounts.offer, applied),
    },
    funnel,
    avgDaysPerStage: Object.entries(dwell).map(([stage, v]) => ({ stage, days: Math.round((v.total / v.n) * 10) / 10, samples: v.n })),
    weekly: weekly.map((w) => ({ week: w._id, count: w.count })),
    sources: Object.values(sources)
      .map((s) => ({ ...s, interviewRate: pct(s.interviews, s.applied) }))
      .sort((a, b) => b.applied - a.applied),
  });
});
