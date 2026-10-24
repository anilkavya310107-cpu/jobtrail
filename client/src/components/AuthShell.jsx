import { Logo } from "./Layout";

const TRAIL = [
  ["wishlist", "Saved the role"],
  ["applied", "Sent the application"],
  ["screening", "Recruiter call booked"],
  ["interview", "Final round"],
  ["offer", "Offer in hand"],
];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <div className="brand light"><Logo /> Jobtrail</div>
        <div>
          <h1>Every application, one clear trail.</h1>
          <p>Track each role from wishlist to offer, never miss a follow-up, and see how your resume stacks up.</p>
          <ol className="trail" aria-hidden>
            {TRAIL.map(([stage, text], i) => (
              <li key={stage} className={`stage-${stage}`} style={{ "--i": i }}>
                <span className="dot" />
                <span className="trail-label">{text}</span>
              </li>
            ))}
          </ol>
        </div>
        <small>Your data stays in your account. Nothing is shared.</small>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
