import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Modal } from "./ui";
import { SOURCES } from "../lib/stages";
import { errMsg } from "../lib/format";

const blank = { company: "", role: "", location: "", source: "LinkedIn", salary: "", url: "", notes: "", stage: "wishlist" };

export default function ApplicationForm({ application, onClose, onSaved }) {
  const editing = Boolean(application);
  const [form, setForm] = useState(editing ? { ...blank, ...application } : blank);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (force = false) => {
    setError("");
    setBusy(true);
    try {
      const payload = { ...form, force };
      const { data } = editing
        ? await api.put(`/applications/${application._id}`, payload)
        : await api.post("/applications", payload);
      onSaved(data.application, editing);
    } catch (err) {
      if (err.response?.data?.duplicate) setDuplicate(err.response.data);
      else setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setDuplicate(null);
    if (!form.company.trim() || !form.role.trim()) return setError("Company and role are required");
    save(false);
  };

  return (
    <Modal title={editing ? "Edit application" : "Add application"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form-grid">
        {error && <div className="alert alert-error full" role="alert">{error}</div>}
        {duplicate && (
          <div className="alert alert-warn full" role="alert">
            {duplicate.message}{" "}
            <Link to={`/applications/${duplicate.existingId}`} onClick={onClose}>View it</Link> or{" "}
            <button type="button" className="link-btn" onClick={() => save(true)}>add anyway</button>.
          </div>
        )}
        <label>Company<input name="company" value={form.company} onChange={set} maxLength={100} autoFocus /></label>
        <label>Role<input name="role" value={form.role} onChange={set} maxLength={120} /></label>
        <label>Location<input name="location" value={form.location} onChange={set} placeholder="Bengaluru, Remote" /></label>
        <label>Salary<input name="salary" value={form.salary} onChange={set} placeholder="12 LPA" /></label>
        <label>Where you found it
          <select name="source" value={form.source} onChange={set}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        {!editing ? (
          <label>Start as
            <select name="stage" value={form.stage} onChange={set}>
              <option value="wishlist">Wishlist (not applied yet)</option>
              <option value="applied">Applied</option>
            </select>
          </label>
        ) : <span />}
        <label className="full">Job link<input name="url" value={form.url} onChange={set} placeholder="https://" /></label>
        <label className="full">Notes<textarea name="notes" rows={3} value={form.notes} onChange={set} /></label>
        <div className="modal-actions full">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : editing ? "Save changes" : "Add application"}</button>
        </div>
      </form>
    </Modal>
  );
}
