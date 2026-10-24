import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { ScoreRing } from "./ui";
import { errMsg, fmtDateTime } from "../lib/format";

export default function MatchPanel({ application, analyses, onDone }) {
  const toast = useToast();
  const [resumes, setResumes] = useState(null);
  const [resumeId, setResumeId] = useState("");
  const [jd, setJd] = useState(application.jobDescription || "");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(analyses[0] || null);

  useEffect(() => {
    api.get("/resumes").then(({ data }) => {
      setResumes(data.resumes);
      if (data.resumes[0]) setResumeId((cur) => cur || data.resumes[0]._id);
    }).catch(() => setResumes([]));
  }, []);

  useEffect(() => { if (!shown && analyses[0]) setShown(analyses[0]); }, [analyses, shown]);

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/applications/${application._id}/match`, { resumeId, jobDescription: jd });
      setShown(data.analysis);
      toast.success(data.cached ? "Showing a saved result for this resume and job description" : "Analysis complete");
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const llm = shown?.result?.llm;
  const base = shown?.result?.baseline;

  return (
    <section className="panel">
      <h2>Resume match</h2>
      {resumes && resumes.length === 0 ? (
        <p className="muted">Upload a PDF resume first. <Link to="/resumes">Go to Resumes</Link></p>
      ) : (
        <form onSubmit={run} className="match-form">
          <label>Resume
            <select value={resumeId} onChange={(e) => setResumeId(e.target.value)} disabled={!resumes}>
              {resumes?.map((r) => <option key={r._id} value={r._id}>{r.filename}</option>)}
            </select>
          </label>
          <label>Job description
            <textarea rows={6} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job description" />
          </label>
          <button className="btn btn-primary" disabled={busy || !resumeId || jd.trim().length < 80}>
            {busy ? "Analyzing..." : "Analyze match"}
          </button>
        </form>
      )}

      {shown && (
        <div className="result">
          <div className="result-head">
            <ScoreRing value={shown.score} />
            <div>
              <h3>{llm ? llm.summary : "Keyword match"}</h3>
              <p className="muted">
                Keyword score {shown.baselineScore}
                {shown.llmScore != null && ` · AI score ${shown.llmScore}`} · {shown.resumeName} · {fmtDateTime(shown.createdAt)}
              </p>
              {shown.result?.llmError && (
                <p className="alert alert-warn">AI review unavailable ({shown.result.llmError}). Showing the keyword score only.</p>
              )}
            </div>
          </div>
          <div className="lists">
            <div><h4>Matched skills</h4>{base?.matched?.length ? <div className="tags good">{base.matched.map((s) => <span key={s}>{s}</span>)}</div> : <p className="muted">None detected</p>}</div>
            <div><h4>Missing skills</h4>{(llm?.missingSkills?.length ? llm.missingSkills : base?.missing)?.length ? <div className="tags bad">{(llm?.missingSkills?.length ? llm.missingSkills : base.missing).map((s) => <span key={s}>{s}</span>)}</div> : <p className="muted">Nothing missing</p>}</div>
          </div>
          {llm?.strengths?.length > 0 && <><h4>Strengths</h4><ul>{llm.strengths.map((s) => <li key={s}>{s}</li>)}</ul></>}
          {llm?.suggestions?.length > 0 && <><h4>Suggested resume edits</h4><ul>{llm.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></>}
        </div>
      )}

      {analyses.length > 1 && (
        <>
          <h4>History</h4>
          <ul className="history">
            {analyses.map((a, i) => {
              const prev = analyses[i + 1];
              const delta = prev ? a.score - prev.score : null;
              return (
                <li key={a._id}>
                  <button className="link-btn" onClick={() => setShown(a)}>{fmtDateTime(a.createdAt)} · {a.resumeName}</button>
                  <strong>{a.score}</strong>
                  {delta !== null && delta !== 0 && <span className={delta > 0 ? "up" : "down"}>{delta > 0 ? `+${delta}` : delta}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
