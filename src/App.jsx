import { useState, useEffect, useRef, useCallback } from "react";

const SK = "diary-planner-v2";
async function load() {
  try { const s = localStorage.getItem(SK); return s ? JSON.parse(s) : null; } catch {}
  return null;
}
async function save(data) {
  try { localStorage.setItem(SK, JSON.stringify(data)); } catch {}
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDay = (k) => new Date(k + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtFull = (k) => new Date(k + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const uid = () => Math.random().toString(36).slice(2, 9);

function useSpeech(onResult) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState("");
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const start = useCallback((currentText) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    let final = currentText || "";
    r.onresult = (e) => {
      let it = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += (final ? " " : "") + t;
        else it += t;
      }
      onResult(final);
      setInterim(it);
    };
    r.onend = () => { setActive(false); setInterim(""); };
    r.onerror = () => { setActive(false); setInterim(""); };
    ref.current = r;
    r.start();
    setActive(true);
  }, [onResult]);
  const stop = useCallback(() => { ref.current?.stop(); setActive(false); setInterim(""); }, []);
  return { active, interim, supported, start, stop, toggle: (txt) => active ? stop() : start(txt) };
}

const Tag = ({ label, color }) => (
  <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: color + "22", color, fontFamily: "inherit" }}>{label}</span>
);

function MicBtn({ active, onClick, size = 40 }) {
  return (
    <button onClick={onClick} title={active ? "Stop recording" : "Speak"} style={{
      width: size, height: size, borderRadius: "50%", border: `1.5px solid ${active ? "#e0a060" : "#3a3530"}`,
      background: active ? "#e0a060" : "transparent", cursor: "pointer", fontSize: size * 0.38,
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
      flexShrink: 0, boxShadow: active ? "0 0 0 5px rgba(224,160,96,0.18)" : "none",
      animation: active ? "micPulse 1.4s ease-in-out infinite" : "none",
    }}>
      {active ? "⬛" : "🎙"}
    </button>
  );
}

function NoteEditor({ value, onChange, placeholder, label, accent }) {
  const [open, setOpen] = useState(!!value);
  const ta = useRef(null);
  const handleResult = useCallback((t) => onChange(t), [onChange]);
  const mic = useSpeech(handleResult);
  useEffect(() => { if (open && ta.current) { ta.current.style.height = "auto"; ta.current.style.height = ta.current.scrollHeight + "px"; } }, [value, open]);
  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: accent || "#7a6f5e", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "inherit", letterSpacing: "0.08em" }}>
          + {label}
        </button>
      ) : (
        <div style={{ background: "#141210", borderLeft: `2px solid ${accent || "#3a3530"}`, borderRadius: "0 4px 4px 0", padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea ref={ta} value={value}
              onChange={e => { onChange(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              placeholder={placeholder} rows={2}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#c8bfaf", fontSize: 13, lineHeight: 1.7, fontFamily: "Georgia, serif", resize: "none", width: "100%" }} />
            <MicBtn active={mic.active} onClick={() => mic.toggle(value)} size={28} />
          </div>
          {mic.interim && <div style={{ fontSize: 12, color: "#7a6f5e", fontStyle: "italic", marginTop: 4 }}>{mic.interim}…</div>}
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#4a443c", cursor: "pointer", fontSize: 11, padding: 0, marginTop: 6, fontFamily: "inherit" }}>hide</button>
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onUpdate, onDelete, accent }) {
  const handleResult = useCallback((t) => onUpdate({ ...task, text: t }), [task, onUpdate]);
  const mic = useSpeech(handleResult);
  return (
    <div style={{ padding: "14px 0 14px 4px", borderBottom: "1px solid #1a1814", opacity: task.done ? 0.75 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <button onClick={() => onUpdate({ ...task, done: !task.done })} style={{
          width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${task.done ? accent : "#3a3530"}`,
          background: task.done ? accent : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2,
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
        }}>
          {task.done && <span style={{ color: "#0f0e0c", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: task.done ? "#7a6f5e" : "#e0d8cc", textDecoration: task.done ? "line-through" : "none", flex: 1 }}>{task.text}</span>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <MicBtn active={mic.active} onClick={() => mic.toggle(task.text)} size={24} />
              <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", color: "#3a3530", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 4px", transition: "color 0.15s" }}
                onMouseEnter={e => e.target.style.color = "#a04040"} onMouseLeave={e => e.target.style.color = "#3a3530"}>✕</button>
            </div>
          </div>
          {mic.interim && <div style={{ fontSize: 12, color: "#7a6f5e", fontStyle: "italic" }}>{mic.interim}…</div>}
          {task.done ? (
            <NoteEditor value={task.completionNote || ""} onChange={v => onUpdate({ ...task, completionNote: v })} placeholder="How did it go? Any reflections…" label="Add completion note" accent="#6aaa6a" />
          ) : (
            <NoteEditor value={task.progressNote || ""} onChange={v => onUpdate({ ...task, progressNote: v })} placeholder="Progress so far, blockers, next steps…" label="Add progress note" accent="#6a9aaa" />
          )}
        </div>
      </div>
    </div>
  );
}

function AddTaskBar({ onAdd, accent }) {
  const [text, setText] = useState("");
  const handleResult = useCallback((t) => setText(t), []);
  const mic = useSpeech(handleResult);
  const inp = useRef(null);
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim()); setText(""); mic.active && mic.stop(); inp.current?.focus();
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #2a2620" }}>
      <MicBtn active={mic.active} onClick={() => mic.toggle(text)} size={32} />
      <input ref={inp} value={mic.interim ? text + " " + mic.interim : text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="Add a task — type or speak…"
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e0d8cc", fontSize: 15, fontFamily: "Georgia, serif", borderBottom: "1px solid #2a2620" }} />
      <button onClick={submit} disabled={!text.trim() && !mic.interim} style={{
        background: text.trim() ? accent : "transparent", border: `1px solid ${text.trim() ? accent : "#3a3530"}`,
        color: text.trim() ? "#0f0e0c" : "#4a443c", borderRadius: 4, padding: "6px 14px", cursor: "pointer",
        fontSize: 12, fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s",
      }}>Add</button>
    </div>
  );
}

function DayView({ dayData, dayKey, onUpdateDay, accent }) {
  const tasks = dayData?.tasks || [];
  const diary = dayData?.diary || "";
  const handleDiaryResult = useCallback((t) => onUpdateDay({ ...dayData, diary: t }), [dayData, onUpdateDay]);
  const mic = useSpeech(handleDiaryResult);
  const taRef = useRef(null);
  useEffect(() => { if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = taRef.current.scrollHeight + "px"; } }, [diary]);
  const addTask = (text) => {
    const t = { id: uid(), text, done: false, completionNote: "", progressNote: "", createdAt: new Date().toISOString() };
    onUpdateDay({ ...dayData, tasks: [...tasks, t] });
  };
  const updateTask = (updated) => onUpdateDay({ ...dayData, tasks: tasks.map(t => t.id === updated.id ? updated : t) });
  const deleteTask = (id) => onUpdateDay({ ...dayData, tasks: tasks.filter(t => t.id !== id) });
  const done = tasks.filter(t => t.done);
  const todo = tasks.filter(t => !t.done);
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7a6f5e", marginBottom: 12 }}>Tasks · {done.length}/{tasks.length} done</div>
        <AddTaskBar onAdd={addTask} accent={accent} />
        {todo.length > 0 && <div style={{ marginTop: 4 }}>{todo.map(t => <TaskItem key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} accent={accent} />)}</div>}
        {done.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "#4a443c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Completed</div>
            {done.map(t => <TaskItem key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} accent="#6aaa6a" />)}
          </div>
        )}
        {tasks.length === 0 && <div style={{ fontSize: 13, color: "#3a3530", fontStyle: "italic", padding: "20px 0" }}>No tasks yet for this day.</div>}
      </section>
      <section>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7a6f5e", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Diary Entry</span>
          <MicBtn active={mic.active} onClick={() => mic.toggle(diary)} size={28} />
        </div>
        {mic.interim && <div style={{ fontSize: 13, color: "#7a6f5e", fontStyle: "italic", marginBottom: 6 }}>{mic.interim}…</div>}
        <textarea ref={taRef} value={diary} onChange={e => onUpdateDay({ ...dayData, diary: e.target.value })}
          placeholder="Write or speak your thoughts for the day…" rows={5}
          style={{ width: "100%", background: "#141210", border: "1px solid #2a2620", borderRadius: 6, padding: "16px", color: "#c8bfaf", fontSize: 15, lineHeight: 1.85, fontFamily: "Georgia, serif", resize: "none", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2a2620"} />
        <div style={{ fontSize: 11, color: "#3a3530", marginTop: 6 }}>{diary.trim().split(/\s+/).filter(Boolean).length} words · auto-saved</div>
      </section>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState({});
  const [activeDay, setActiveDay] = useState(todayKey());
  const [view, setView] = useState("today");
  const [loaded, setLoaded] = useState(false);
  const ACCENT = "#c9a96e";
  useEffect(() => { load().then(d => { if (d) setData(d); setLoaded(true); }); }, []);
  const updateDay = useCallback((dayKey, dayData) => {
    const updated = { ...data, [dayKey]: dayData };
    setData(updated); save(updated);
  }, [data]);
  const carryForward = () => {
    const keys = Object.keys(data).sort();
    const prevKey = keys.filter(k => k < activeDay).pop();
    if (!prevKey) return;
    const prevTodos = (data[prevKey]?.tasks || []).filter(t => !t.done);
    if (prevTodos.length === 0) { alert("No incomplete tasks to carry forward."); return; }
    const current = data[activeDay] || { tasks: [], diary: "" };
    const existingTexts = new Set(current.tasks.map(t => t.text.toLowerCase()));
    const toAdd = prevTodos.filter(t => !existingTexts.has(t.text.toLowerCase())).map(t => ({ ...t, id: uid(), progressNote: t.progressNote || "", completionNote: "" }));
    if (toAdd.length === 0) { alert("All carry-forward tasks already exist today."); return; }
    updateDay(activeDay, { ...current, tasks: [...current.tasks, ...toAdd] });
  };
  const dayData = data[activeDay] || { tasks: [], diary: "" };
  const sortedDays = Object.keys(data).sort().reverse();
  const hasYesterday = Object.keys(data).filter(k => k < activeDay).length > 0;
  if (!loaded) return <div style={{ minHeight: "100vh", background: "#0f0e0c", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a443c", fontFamily: "Georgia, serif" }}>Loading…</div>;
  return (
    <div style={{ minHeight: "100vh", background: "#0f0e0c", fontFamily: "Georgia, 'Times New Roman', serif", color: "#e8e0d0" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 80px", position: "relative", zIndex: 1 }}>
        <header style={{ padding: "36px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#5a5040", textTransform: "uppercase", marginBottom: 8 }}>Daily Planner & Diary</div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 400, color: "#e8e0d0", letterSpacing: "-0.3px" }}>{fmtFull(activeDay)}</h1>
            </div>
            <nav style={{ display: "flex", gap: 4 }}>
              {[["today", "Today"], ["history", `History (${sortedDays.length})`]].map(([v, label]) => (
                <button key={v} onClick={() => { setView(v); if (v === "today") setActiveDay(todayKey()); }} style={{
                  background: view === v ? ACCENT : "transparent", color: view === v ? "#0f0e0c" : "#7a6f5e",
                  border: `1px solid ${view === v ? ACCENT : "#2e2b25"}`, borderRadius: 4, padding: "6px 13px", cursor: "pointer",
                  fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </nav>
          </div>
          {view === "today" && hasYesterday && (
            <div style={{ marginTop: 16 }}>
              <button onClick={carryForward} style={{
                background: "transparent", border: "1px dashed #3a3530", borderRadius: 4, color: "#7a6f5e",
                padding: "6px 14px", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em",
                textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.target.style.borderColor = ACCENT; e.target.style.color = ACCENT; }}
                onMouseLeave={e => { e.target.style.borderColor = "#3a3530"; e.target.style.color = "#7a6f5e"; }}
              >↑ Carry forward incomplete tasks</button>
            </div>
          )}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, #2e2b25 20%, ${ACCENT} 50%, #2e2b25 80%, transparent)`, margin: "20px 0 28px" }} />
        </header>
        {view === "today" && <DayView dayKey={activeDay} dayData={dayData} onUpdateDay={(d) => updateDay(activeDay, d)} accent={ACCENT} />}
        {view === "history" && (
          <div>
            {sortedDays.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4a443c" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
                <div style={{ fontStyle: "italic" }}>No entries yet.</div>
              </div>
            ) : (
              sortedDays.map((dk, i) => {
                const dd = data[dk];
                const doneCt = (dd?.tasks || []).filter(t => t.done).length;
                const totalCt = (dd?.tasks || []).length;
                const isToday = dk === todayKey();
                return (
                  <div key={dk} style={{ marginBottom: 4, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                    <button onClick={() => { setActiveDay(dk); setView("today"); }} style={{
                      width: "100%", background: "transparent", border: "none", textAlign: "left",
                      cursor: "pointer", padding: "16px 0", borderBottom: "1px solid #1a1814", fontFamily: "inherit",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <span style={{ fontSize: 15, color: "#d8d0c0" }}>{fmtDay(dk)}</span>
                            {isToday && <Tag label="Today" color={ACCENT} />}
                          </div>
                          {dd?.diary && <div style={{ fontSize: 13, color: "#5a5040", marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{dd.diary.slice(0, 80)}{dd.diary.length > 80 ? "…" : ""}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {totalCt > 0 && <div style={{ fontSize: 12, color: doneCt === totalCt ? "#6aaa6a" : "#7a6f5e" }}>{doneCt}/{totalCt} tasks</div>}
                          <span style={{ color: "#3a3530", fontSize: 14 }}>›</span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes micPulse { 0%,100% { box-shadow:0 0 0 5px rgba(224,160,96,0.18); } 50% { box-shadow:0 0 0 10px rgba(224,160,96,0.08); } }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #3a3530; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2e2b25; border-radius: 2px; }
      `}</style>
    </div>
  );
}
