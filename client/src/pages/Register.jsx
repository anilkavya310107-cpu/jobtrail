import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../lib/format";

const rules = (pw) => [
  ["At least 8 characters", pw.length >= 8],
  ["A letter", /[A-Za-z]/.test(pw)],
  ["A number", /\d/.test(pw)],
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState({});
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const blur = (e) => setTouched({ ...touched, [e.target.name]: true });

  const fieldErrors = {
    name: form.name.trim().length < 2 ? "Enter your full name" : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "" : "Enter a valid email address",
    password: rules(form.password).every(([, ok]) => ok) ? "" : "Password doesn't meet the rules below",
  };
  const valid = !Object.values(fieldErrors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const showErr = (k) => touched[k] && fieldErrors[k];

  return (
    <AuthShell title="Create your account" subtitle="Free, and ready in under a minute.">
      <form onSubmit={submit} noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label>Full name
          <input name="name" autoComplete="name" value={form.name} onChange={set} onBlur={blur} aria-invalid={!!showErr("name")} autoFocus />
          {showErr("name") && <span className="field-error">{fieldErrors.name}</span>}
        </label>
        <label>Email
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={set} onBlur={blur} aria-invalid={!!showErr("email")} />
          {showErr("email") && <span className="field-error">{fieldErrors.email}</span>}
        </label>
        <label>Password
          <span className="pw">
            <input name="password" type={show ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={set} onBlur={blur} aria-invalid={!!showErr("password")} />
            <button type="button" className="link-btn" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        <ul className="rules">
          {rules(form.password).map(([text, ok]) => (
            <li key={text} className={ok ? "ok" : ""}>{text}</li>
          ))}
        </ul>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
      </form>
      <p className="switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
