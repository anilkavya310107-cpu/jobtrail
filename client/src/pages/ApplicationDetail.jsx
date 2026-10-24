import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import ApplicationForm from "../components/ApplicationForm";
import MatchPanel from "../components/MatchPanel";
import { Empty, PageLoader, StageBadge } from "../components/ui";
import { STAGE_LABEL } from "../lib/stages";
import { errMsg, fmtDate, fmtDateTime, relativeDue } from "../lib/format";

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [reminder, setReminder] = useState({ title: "", dueAt: "" });

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/applications/${id}`);
      setData(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.status === 404 ? "This application doesn't exist or was deleted." : errMsg(err));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="page"><Empty title="Can't open this application" action={<Link className="btn" to="/">Back to board</Link>}>{error}</Empty></div>;
  if (!data) return <PageLoader />;

  const { application: app, events, reminders, analyses, allowedNext } = data;

  const move = async (stage) => {
    try {
      await api.patch(`/applications/${id}/stage`, { stage });
      toast.success(`Moved to ${STAGE_LABEL[stage]}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${app.role} at ${app.company}? This also removes its history and reminders.`)) return;
    try {
      await api.delete(`/applications/${id}`);
      toast.success("Application deleted");
      navigate("/");
    } catch (err) { toast.error(errMsg(err)); }
  };

  const addReminder = async (e) => {
    e.preventDefault();
    try {
      await api.post("/reminders", { application: id, ...reminder, dueAt: new Date(reminder.dueAt).toISOString() });
      setReminder({ title: "", dueAt: "" });
      toast.success("Reminder added");
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const reminderAction = async (rid, action, body) => {
    try { await api.patch(`/reminders/${rid}/${action}`, body); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="page detail">
      <Link to="/" className="back">Back to board</Link>
      <header className="page-head">
        <div>
          <h1>{app.company}</h1>
          <p className="muted">{app.role}{app.location && ` · ${app.location}`}</p>
        </div>
        <div className="head-actions">
          <StageBadge stage={app.stage} />
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-danger" onClick={remove}>Delete</button>
        </div>
      </header>

      <section className="panel">
        <h2>Move forward</h2>
        {allowedNext.length ? (
          <div className="chips">
            {allowedNext.map((s) => (
              <button key={s} className={`chip stage-${s}`} onClick={() => move(s)}>
                <span className="dot" /> {s === "applied" && app.stage === "rejected" ? "Reopen as Applied" : STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        ) : <p className="muted">This application is closed, so there are no further stages.</p>}
        <dl className="facts">
          <div><dt>Source</dt><dd>{app.source}</dd></div>
          <div><dt>Salary</dt><dd>{app.salary || "Not set"}</dd></div>
          <div><dt>Added</dt><dd>{fmtDate(app.createdAt)}</dd></div>
          <div><dt>Link</dt><dd>{app.url ? <a href={app.url} target="_blank" rel="noreferrer noopener">Open posting</a> : "Not set"}</dd></div>
        </dl>
        {app.notes && <p className="notes">{app.notes}</p>}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Timeline</h2>
          <ol className="timeline">
            {[...events].reverse().map((ev) => (
              <li key={ev._id} className={`stage-${ev.toStage}`}>
                <span className="dot" />
                <div>
                  <strong>{ev.fromStage ? `${STAGE_LABEL[ev.fromStage]} to ${STAGE_LABEL[ev.toStage]}` : `Added as ${STAGE_LABEL[ev.toStage]}`}</strong>
                  <small>{fmtDateTime(ev.createdAt)}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2>Reminders</h2>
          {reminders.length === 0 && <p className="muted">No reminders. Moving to Applied or Interview adds one automatically.</p>}
          <ul className="reminder-list">
            {reminders.map((r) => {
              const due = r.status === "sent" || (r.status === "pending" && new Date(r.dueAt) <= new Date());
              return (
                <li key={r._id} className={r.status === "done" ? "done" : due ? "due" : ""}>
                  <div>
                    <strong>{r.title}</strong>
                    <small>{r.status === "done" ? "Done" : `Due ${relativeDue(r.dueAt)}`}</small>
                  </div>
                  {r.status !== "done" && (
                    <span className="row-actions">
                      <button className="link-btn" onClick={() => reminderAction(r._id, "done")}>Done</button>
                      <button className="link-btn" onClick={() => reminderAction(r._id, "snooze", { days: 3 })}>Snooze 3d</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <form className="inline-form" onSubmit={addReminder}>
            <input placeholder="Add your own reminder" value={reminder.title} onChange={(e) => setReminder({ ...reminder, title: e.target.value })} maxLength={200} required />
            <input type="date" value={reminder.dueAt} onChange={(e) => setReminder({ ...reminder, dueAt: e.target.value })} required aria-label="Due date" />
            <button className="btn">Add</button>
          </form>
        </section>
      </div>

      <MatchPanel application={app} analyses={analyses} onDone={load} />

      {editing && (
        <ApplicationForm application={app} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); toast.success("Changes saved"); load(); }} />
      )}
    </div>
  );
}
