import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import ApplicationForm from "../components/ApplicationForm";
import { Empty, PageLoader, StageBadge } from "../components/ui";
import { BOARD_STAGES, CLOSED_STAGES, SOURCES, STAGES, STAGE_LABEL, TRANSITIONS, canTransition } from "../lib/stages";
import { daysSince, errMsg } from "../lib/format";

export default function Board() {
  const toast = useToast();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState("board");
  const [showClosed, setShowClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const [filters, setFilters] = useState({ q: "", stage: "", source: "", sort: "recent" });
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const params = { sort: filters.sort };
      if (debouncedQ) params.q = debouncedQ;
      if (filters.stage) params.stage = filters.stage;
      if (filters.source) params.source = filters.source;
      const { data } = await api.get("/applications", { params });
      setApps(data.applications);
    } catch (err) {
      setLoadError(errMsg(err, "Couldn't load your applications."));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters.stage, filters.source, filters.sort]);

  useEffect(() => { load(); }, [load]);

  const move = async (id, to) => {
    const current = apps.find((a) => a._id === id);
    if (!current || current.stage === to) return;
    if (!canTransition(current.stage, to)) {
      toast.error(`Can't move from ${STAGE_LABEL[current.stage]} to ${STAGE_LABEL[to]}`);
      return;
    }
    const previous = apps;
    setApps((list) => list.map((a) => (a._id === id ? { ...a, stage: to, stageChangedAt: new Date().toISOString() } : a)));
    try {
      const { data } = await api.patch(`/applications/${id}/stage`, { stage: to });
      setApps((list) => list.map((a) => (a._id === id ? data.application : a)));
      toast.success(`${current.company} moved to ${STAGE_LABEL[to]}`);
    } catch (err) {
      setApps(previous);
      toast.error(errMsg(err));
    }
  };

  const onDragEnd = ({ draggableId, destination }) => {
    setDragFrom(null);
    if (destination) move(draggableId, destination.droppableId);
  };

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s, []]));
    apps.forEach((a) => map[a.stage]?.push(a));
    return map;
  }, [apps]);

  const columns = showClosed ? STAGES : BOARD_STAGES;
  const filtered = filters.q || filters.stage || filters.source;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Applications</h1>
          <p className="muted">{apps.length} {apps.length === 1 ? "application" : "applications"}{filtered ? " match your filters" : " in your trail"}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>Add application</button>
      </header>

      <div className="toolbar">
        <input className="search" type="search" placeholder="Search company, role or location" value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })} aria-label="Search applications" />
        <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} aria-label="Filter by stage">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} aria-label="Filter by source">
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} aria-label="Sort">
          <option value="recent">Recently updated</option>
          <option value="oldest">Least recently updated</option>
          <option value="company">Company A to Z</option>
          <option value="stage">Longest in stage</option>
        </select>
        <div className="segmented" role="group" aria-label="View">
          <button className={view === "board" ? "on" : ""} onClick={() => setView("board")}>Board</button>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
        </div>
        {view === "board" && (
          <label className="check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show rejected and withdrawn</label>
        )}
      </div>

      {loading ? <PageLoader /> : loadError ? (
        <Empty title="Couldn't load applications" action={<button className="btn" onClick={load}>Try again</button>}>{loadError}</Empty>
      ) : apps.length === 0 ? (
        filtered ? (
          <Empty title="Nothing matches those filters" action={<button className="btn" onClick={() => setFilters({ q: "", stage: "", source: "", sort: "recent" })}>Clear filters</button>} />
        ) : (
          <Empty title="Start your trail" action={<button className="btn btn-primary" onClick={() => setAdding(true)}>Add your first application</button>}>
            Add a role you're interested in. Move it forward as things happen and Jobtrail handles the follow-up reminders.
          </Empty>
        )
      ) : view === "board" ? (
        <DragDropContext onDragStart={(s) => setDragFrom(s.source.droppableId)} onDragEnd={onDragEnd}>
          <div className="board">
            {columns.map((stage) => {
              const blocked = dragFrom && stage !== dragFrom && !canTransition(dragFrom, stage);
              return (
                <Droppable droppableId={stage} key={stage} isDropDisabled={Boolean(blocked)}>
                  {(prov, snap) => (
                    <section className={`column stage-${stage} ${blocked ? "blocked" : ""} ${snap.isDraggingOver ? "over" : ""}`}>
                      <h3><span className="dot" /> {STAGE_LABEL[stage]} <em>{byStage[stage].length}</em></h3>
                      <div ref={prov.innerRef} {...prov.droppableProps} className="cards">
                        {byStage[stage].map((a, i) => (
                          <Draggable draggableId={a._id} index={i} key={a._id}>
                            {(p, s) => (
                              <article ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                className={`card ${s.isDragging ? "dragging" : ""}`} onClick={() => navigate(`/applications/${a._id}`)}>
                                <strong>{a.company}</strong>
                                <span>{a.role}</span>
                                <small>{[a.location, a.salary].filter(Boolean).join(" · ") || a.source}</small>
                                <small className="age">{daysSince(a.stageChangedAt)}d in stage</small>
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    </section>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Role</th><th>Stage</th><th>Source</th><th>In stage</th><th>Move to</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a._id}>
                  <td><Link to={`/applications/${a._id}`}><strong>{a.company}</strong></Link></td>
                  <td>{a.role}</td>
                  <td><StageBadge stage={a.stage} /></td>
                  <td>{a.source}</td>
                  <td>{daysSince(a.stageChangedAt)}d</td>
                  <td>
                    {TRANSITIONS[a.stage].length ? (
                      <select value="" onChange={(e) => move(a._id, e.target.value)} aria-label={`Move ${a.company}`}>
                        <option value="" disabled>Choose stage</option>
                        {TRANSITIONS[a.stage].map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                      </select>
                    ) : <span className="muted">Final</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <ApplicationForm
          onClose={() => setAdding(false)}
          onSaved={(app) => { setAdding(false); toast.success(`${app.company} added`); load(); }}
        />
      )}
    </div>
  );
}
