const DAY = 86400000;

export const daysSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d)) / DAY));

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function relativeDue(d) {
  const diff = Math.round((new Date(d) - Date.now()) / DAY);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export const errMsg = (err, fallback = "Something went wrong. Try again.") =>
  err?.response?.data?.message || (err?.request ? "Can't reach the server. Check your connection." : fallback);
