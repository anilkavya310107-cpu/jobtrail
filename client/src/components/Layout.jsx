import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Board", end: true },
  { to: "/reminders", label: "Reminders" },
  { to: "/resumes", label: "Resumes" },
  { to: "/analytics", label: "Analytics" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Logo /> Jobtrail</div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <div className="avatar" aria-hidden>{user.name[0]?.toUpperCase()}</div>
          <div className="user-meta">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button className="link-btn" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

export const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="8" fill="#16202C" />
    <path d="M8 22c4 0 4-12 8-12s4 12 8 12" fill="none" stroke="#7C9CFF" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="22" r="2.5" fill="#F5B83D" />
  </svg>
);
