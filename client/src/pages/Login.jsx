import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../lib/format";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Log in" subtitle="Pick up where you left off.">
      <form onSubmit={submit} noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label>Email
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={set} required autoFocus />
        </label>
        <label>Password
          <span className="pw">
            <input name="password" type={show ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={set} required />
            <button type="button" className="link-btn" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy || !form.email || !form.password}>
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="switch">New to Jobtrail? <Link to="/register">Create an account</Link></p>
    </AuthShell>
  );
}
