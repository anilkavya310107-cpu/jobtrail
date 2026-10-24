import { useEffect, useState } from "react";
import api from "../api/axios";
import { Empty, PageLoader } from "../components/ui";
import { STAGE_LABEL } from "../lib/stages";
import { errMsg } from "../lib/format";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/analytics").then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (error) return <div className="page"><Empty title="Couldn't load analytics" action={<button className="btn" onClick={load}>Try again</button>}>{error}</Empty></div>;
  if (!data) return <PageLoader />;

  const { totals, funnel, avgDaysPerStage, weekly, sources } = data;
  if (totals.applications === 0)
    return <div className="page"><Empty title="No data yet">Add and move a few applications and your funnel will appear here.</Empty></div>;

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxDays = Math.max(1, ...avgDaysPerStage.map((d) => d.days));
  const maxWeek = Math.max(1, ...weekly.map((w) => w.count));

  return (
    <div className="page">
      <header className="page-head"><div><h1>Analytics</h1><p className="muted">How your search is converting.</p></div></header>

      <div className="kpis">
        <div className="kpi"><strong>{totals.applications}</strong><span>Total tracked</span></div>
        <div className="kpi"><strong>{totals.active}</strong><span>Still active</span></div>
        <div className="kpi"><strong>{totals.responseRate}%</strong><span>Heard back</span></div>
        <div className="kpi"><strong>{totals.interviewRate}%</strong><span>Reached interview</span></div>
        <div className="kpi"><strong>{totals.offerRate}%</strong><span>Reached offer</span></div>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Funnel</h2>
          {funnel.map((f) => (
            <div className="bar-row" key={f.stage}>
              <span className="bar-label">{STAGE_LABEL[f.stage]}</span>
              <div className="bar-track"><div className={`bar-fill stage-${f.stage}`} style={{ width: `${(f.count / maxFunnel) * 100}%` }} /></div>
              <span className="bar-value">{f.count}{f.conversionFromPrevious !== null && <small> {f.conversionFromPrevious}%</small>}</span>
            </div>
          ))}
          <p className="muted small">Percentages show how many moved on from the previous step.</p>
        </section>

        <section className="panel">
          <h2>Average days per stage</h2>
          {avgDaysPerStage.length === 0 ? <p className="muted">Appears once an application has moved between stages.</p> :
            avgDaysPerStage.map((d) => (
              <div className="bar-row" key={d.stage}>
                <span className="bar-label">{STAGE_LABEL[d.stage]}</span>
                <div className="bar-track"><div className={`bar-fill stage-${d.stage}`} style={{ width: `${(d.days / maxDays) * 100}%` }} /></div>
                <span className="bar-value">{d.days}d</span>
              </div>
            ))}
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Applications added per week</h2>
          <div className="weeks">
            {weekly.map((w) => (
              <div key={w.week} className="week" title={`${w.week}: ${w.count}`}>
                <div className="week-bar" style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                <small>{w.week.slice(-3)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Which sources work</h2>
          <table className="plain">
            <thead><tr><th>Source</th><th>Applied</th><th>Interviews</th><th>Rate</th></tr></thead>
            <tbody>
              {sources.map((s) => <tr key={s.source}><td>{s.source}</td><td>{s.applied}</td><td>{s.interviews}</td><td>{s.interviewRate}%</td></tr>)}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
