import { STAGE_LABEL } from "../lib/stages";

export const PageLoader = () => (
  <div className="page-loader" role="status"><span className="spinner" /> Loading</div>
);

export const StageBadge = ({ stage }) => (
  <span className={`badge stage-${stage}`}>{STAGE_LABEL[stage] || stage}</span>
);

export const Empty = ({ title, children, action }) => (
  <div className="empty">
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export function ScoreRing({ value, size = 96 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const tone = value >= 70 ? "var(--good)" : value >= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Match score ${value} out of 100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} transform="rotate(-90 50 50)" />
      <text x="50" y="57" textAnchor="middle" className="ring-text">{value}</text>
    </svg>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
