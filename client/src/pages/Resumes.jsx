import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import { Empty, PageLoader } from "../components/ui";
import { errMsg, fmtDate } from "../lib/format";

export default function Resumes() {
  const toast = useToast();
  const input = useRef();
  const [resumes, setResumes] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try { setResumes((await api.get("/resumes")).data.resumes); setError(""); }
    catch (err) { setError(errMsg(err)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Only PDF files are accepted");
    if (file.size > 5 * 1024 * 1024) return toast.error("File is too large (max 5 MB)");
    const body = new FormData();
    body.append("resume", file);
    setUploading(true);
    try {
      await api.post("/resumes", body);
      toast.success("Resume uploaded");
      load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setUploading(false); if (input.current) input.current.value = ""; }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete ${r.filename}? Past match results keep their scores.`)) return;
    try { await api.delete(`/resumes/${r._id}`); toast.success("Resume deleted"); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Resumes</h1><p className="muted">Upload a PDF, then compare it with any job description from an application page.</p></div>
        <button className="btn btn-primary" onClick={() => input.current.click()} disabled={uploading}>{uploading ? "Uploading..." : "Upload PDF"}</button>
        <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => upload(e.target.files[0])} />
      </header>

      {error ? <Empty title="Couldn't load resumes" action={<button className="btn" onClick={load}>Try again</button>}>{error}</Empty>
        : !resumes ? <PageLoader />
        : resumes.length === 0 ? (
          <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
            <h3>Drop your resume here</h3>
            <p className="muted">PDF only, up to 5 MB. Scanned images aren't supported because the text has to be readable.</p>
          </div>
        ) : (
          <ul className="resume-list">
            {resumes.map((r) => (
              <li key={r._id} className="panel">
                <div>
                  <strong>{r.filename}</strong>
                  <small>{r.wordCount} words · {Math.round(r.size / 1024)} KB · uploaded {fmtDate(r.createdAt)}</small>
                </div>
                <button className="btn btn-danger" onClick={() => remove(r)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
