import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { Empty, PageLoader } from "../components/ui";
import { errMsg, fmtDate, relativeDue } from "../lib/format";

export default function Reminders() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/reminders");
      setItems(data.reminders);
      setError("");
    } catch (err) { setError(errMsg(err)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, action, body, msg) => {
    try { await api.patch(`/reminders/${id}/${action}`, body); toast.success(msg); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  if (error) return <div className="page"><Empty title="Couldn't load reminders" action={<button className="btn" onClick={load}>Try again</button>}>{error}</Empty></div>;
  if (!items) return <PageLoader />;

  const now = new Date();
  const dueNow = items.filter((r) => r.status === "sent" || (r.status === "pending" && new Date(r.dueAt) <= now));
  const upcoming = items.filter((r) => r.status === "pending" && new Date(r.dueAt) > now);
  const done = items.filter((r) => r.status === "done").slice(-8).reverse();

  const Group = ({ title, list, empty, actions }) => (
    <section className="panel">
      <h2>{title} <em className="count">{list.length}</em></h2>
      {list.length === 0 ? <p className="muted">{empty}</p> : (
        <ul className="reminder-list">
          {list.map((r) => (
            <li key={r._id} className={actions ? (title === "Due now" ? "due" : "") : "done"}>
              <div>
                <strong>{r.title}</strong>
                <small>
                  <Link to={`/applications/${r.application?._id}`}>{r.application?.company}</Link>
                  {" · "}{actions ? `Due ${relativeDue(r.dueAt)}` : `Was due ${fmtDate(r.dueAt)}`}
                </small>
              </div>
              {actions && (
                <span className="row-actions">
                  <button className="btn" onClick={() => act(r._id, "done", {}, "Marked done")}>Done</button>
                  <button className="btn" onClick={() => act(r._id, "snooze", { days: 1 }, "Snoozed for a day")}>Snooze 1 day</button>
                  <button className="btn" onClick={() => act(r._id, "snooze", { days: 7 }, "Snoozed for a week")}>Snooze 1 week</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Reminders</h1><p className="muted">Follow-ups are created when you move an application. Add your own from an application page.</p></div>
      </header>
      <Group title="Due now" list={dueNow} empty="You're all caught up." actions />
      <Group title="Upcoming" list={upcoming} empty="Nothing scheduled. Move an application to Applied to schedule a follow-up." actions />
      <Group title="Recently completed" list={done} empty="Completed reminders show up here." />
    </div>
  );
}
