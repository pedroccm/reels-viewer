"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Curation, Reel } from "@/lib/types";

const COLORS = ["#ff3d77", "#7b5cff", "#2dd4bf", "#f59e0b", "#38bdf8", "#fb7185", "#a3e635", "#c084fc"];
const colorFor = (n: string) => {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};
const human = (n: number | null): string | null => {
  if (n == null || n < 0) return null;
  if (n < 1000) return String(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + "M";
  return Math.round(n / 1000) + "K";
};
const fmtDate = (ts: number | null) =>
  ts ? new Date(ts * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const LANGS: Record<string, string> = {
  Portuguese: "🇧🇷 Português",
  English: "🇬🇧 English",
  Spanish: "🇪🇸 Español",
};
const langLabel = (l: string) => LANGS[l] || l;
const LANG_OPTIONS = ["Portuguese", "English", "Spanish", "French", "Italian", "German", "Korean", "Russian", "Chinese", "Japanese"];

export default function Viewer({
  reels,
  curation: initial,
  title,
  editable,
}: {
  reels: Reel[];
  curation: Curation;
  title: string;
  editable: boolean;
}) {
  const [curation, setCuration] = useState<Curation>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [byFilter, setByFilter] = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("editpw");
    if (saved) setPw(saved);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setNoteDraft((selected && curation.notes?.[selected]) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const hidden = useMemo(() => new Set(curation.hidden || []), [curation]);
  const tagsOf = (code: string) => curation.tags?.[code] || [];
  const effLang = (r: Reel) => curation.langs?.[r.code] || r.lang;

  const allTags = useMemo(() => {
    const c: Record<string, number> = {};
    for (const arr of Object.values(curation.tags || {})) for (const t of arr) c[t] = (c[t] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [curation]);

  const people = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reels) c[r.by] = (c[r.by] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [reels]);

  const langs = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reels) {
      const l = curation.langs?.[r.code] || r.lang;
      if (l) c[l] = (c[l] || 0) + 1;
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [reels, curation]);

  const dayKey = (ts: number | null) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reels) {
      const k = dayKey(r.date_ts);
      if (k) m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels]);
  const newest = useMemo(() => {
    let mx = 0;
    for (const r of reels) if ((r.date_ts || 0) > mx) mx = r.date_ts || 0;
    return mx ? new Date(mx * 1000) : new Date();
  }, [reels]);
  const [calOpen, setCalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [calY, setCalY] = useState(() => newest.getFullYear());
  const [calM, setCalM] = useState(() => newest.getMonth());
  const shiftMonth = (delta: number) => {
    let y = calY;
    let m = calM + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalY(y);
    setCalM(m);
  };

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return reels
      .filter((r) => showHidden || !hidden.has(r.code))
      .filter((r) => !byFilter || r.by === byFilter)
      .filter((r) => !tagFilter || tagsOf(r.code).includes(tagFilter))
      .filter((r) => !qq || (r.caption + " " + r.transcript).toLowerCase().includes(qq))
      .filter((r) => !dateFilter || dayKey(r.date_ts) === dateFilter)
      .filter((r) => !langFilter || effLang(r) === langFilter)
      .filter((r) => !creatorFilter || r.creator === creatorFilter)
      .sort((a, b) => (b.date_ts || 0) - (a.date_ts || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels, q, tagFilter, byFilter, langFilter, creatorFilter, showHidden, curation, dateFilter]);

  const current = useMemo(() => reels.find((r) => r.code === selected) || null, [reels, selected]);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/curation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-edit-password": pw },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        setUnlocked(false);
        alert("Senha incorreta.");
        return null;
      }
      return await res.json();
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    const r = await post({ op: "check" });
    if (r?.ok) {
      setUnlocked(true);
      localStorage.setItem("editpw", pw);
    }
  }

  async function mutate(payload: Record<string, unknown>) {
    const data = await post(payload);
    if (data && !data.error) setCuration(data as Curation);
  }

  function addTag() {
    if (!current || !tagInput.trim()) return;
    mutate({ op: "addTag", code: current.code, tag: tagInput });
    setTagInput("");
  }

  function saveNote() {
    if (!current) return;
    const prev = curation.notes?.[current.code] || "";
    if (noteDraft === prev) return;
    mutate({ op: "setNote", code: current.code, note: noteDraft });
  }

  function printFrame() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const name = (current?.creator || current?.code || "frame").replace(/[^\w.-]/g, "_");
        a.download = `${name}-${Math.floor(v.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    } catch {
      alert("Não consegui capturar o frame (bloqueio de CORS).");
    }
  }

  return (
    <div className="app">
      <header>
        <span className="brand">🎬 {title}</span>
        <span className="counts">
          {list.length} de {reels.length}
          {people.length > 1 ? ` · ${people.length} pessoas` : ""}
        </span>
        <span className="spacer" />
        {editable &&
          (unlocked ? (
            <>
              <span className="badge-edit">edição ✓</span>
              <button className="btn" onClick={() => setUnlocked(false)}>🔒</button>
            </>
          ) : (
            <span className="pw">
              <input
                type="password"
                placeholder="senha p/ editar"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
              />
              <button className="btn" onClick={unlock} disabled={busy}>Editar</button>
            </span>
          ))}
      </header>

      <div className="filters">
        <input
          className="search"
          type="text"
          placeholder="Buscar na transcrição..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="calwrap">
          <button className={`chip ${calOpen ? "on" : ""}`} onClick={() => setCalOpen((o) => !o)}>📅 Calendário</button>
          {calOpen && (
            <>
              <div className="calbackdrop" onClick={() => setCalOpen(false)} />
              <div className="calpop">
                <div className="calhead">
                  <button onClick={() => shiftMonth(-1)}>‹</button>
                  <b>{new Date(calY, calM, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</b>
                  <button onClick={() => shiftMonth(1)}>›</button>
                </div>
                <div className="calgrid">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((w, i) => (
                    <div className="wd" key={i}>{w}</div>
                  ))}
                  {(() => {
                    const cells: (number | null)[] = [];
                    const startWd = new Date(calY, calM, 1).getDay();
                    const dim = new Date(calY, calM + 1, 0).getDate();
                    for (let i = 0; i < startWd; i++) cells.push(null);
                    for (let d = 1; d <= dim; d++) cells.push(d);
                    return cells.map((d, i) => {
                      if (d === null) return <div key={i} className="cell empty" />;
                      const key = `${calY}-${String(calM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const cnt = byDay.get(key);
                      if (!cnt) return <div key={i} className="cell none">{d}</div>;
                      return (
                        <div
                          key={i}
                          className={`cell has ${dateFilter === key ? "sel" : ""}`}
                          title={`${cnt} reels`}
                          onClick={() => {
                            setDateFilter(dateFilter === key ? null : key);
                            setCalOpen(false);
                          }}
                        >
                          {d}
                          <span className="dot" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
        {dateFilter && (
          <button className="chip on" onClick={() => setDateFilter(null)} title="limpar dia">
            {new Date(dateFilter + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} ×
          </button>
        )}
        {creatorFilter && (
          <button className="chip on" onClick={() => setCreatorFilter(null)} title="limpar criador">
            👤 @{creatorFilter} ×
          </button>
        )}

        {people.length > 1 && (
          <div className="chips">
            <button className={`chip ${!byFilter ? "on" : ""}`} onClick={() => setByFilter(null)}>Todos</button>
            {people.map(([name, n]) => (
              <button
                key={name}
                className={`chip ${byFilter === name ? "on" : ""}`}
                onClick={() => setByFilter(byFilter === name ? null : name)}
              >
                {name} <b>{n}</b>
              </button>
            ))}
          </div>
        )}
        {langs.length > 1 && (
          <div className="chips">
            {langs.map(([l, n]) => (
              <button
                key={l}
                className={`chip ${langFilter === l ? "on" : ""}`}
                onClick={() => setLangFilter(langFilter === l ? null : l)}
              >
                {langLabel(l)} <b>{n}</b>
              </button>
            ))}
          </div>
        )}
        {allTags.length > 0 && (
          <div className="chips">
            {allTags.map(([t, n]) => (
              <button
                key={t}
                className={`chip tag ${tagFilter === t ? "on" : ""}`}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
              >
                #{t} <b>{n}</b>
              </button>
            ))}
          </div>
        )}
        {unlocked && (
          <label className="toggle">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            mostrar escondidos ({hidden.size})
          </label>
        )}
      </div>

      <div className="main">
        <div className="grid">
          {list.length === 0 && <div className="empty">Nada por aqui.</div>}
          {list.map((r) => {
            const isHid = hidden.has(r.code);
            return (
              <div
                key={r.code}
                className={`card ${selected === r.code ? "sel" : ""} ${isHid ? "hid" : ""}`}
                onClick={() => setSelected(r.code)}
              >
                {r.thumb_url ? <img loading="lazy" src={r.thumb_url} alt="" /> : <div className="ph">{r.code}</div>}
                <div className="grad" />
                <div className="badge">{r.platform || "reel"}</div>
                {isHid && <div className="hidmark">escondido</div>}
                <div className="cmeta">
                  <div className="who">
                    <span className="ava" style={{ background: colorFor(r.by || "?") }}>
                      {(r.by || "?").slice(0, 2).toUpperCase()}
                    </span>
                    <span>{r.by}</span>
                  </div>
                  <div className="cdate">
                    {fmtDate(r.date_ts)}
                    {curation.notes?.[r.code] ? " · 📝" : ""}
                  </div>
                  {tagsOf(r.code).length > 0 && (
                    <div className="ctags">
                      {tagsOf(r.code).map((t) => (
                        <span key={t} className="t">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`drawer ${current ? "open" : ""}`}>
        {current && (
          <>
            <div className="dclose">
              <button onClick={() => setSelected(null)} aria-label="fechar">×</button>
            </div>
            <div className="dvideo">
              <video
                key={current.code}
                ref={videoRef}
                src={current.video_url}
                crossOrigin="anonymous"
                controls
                autoPlay
                loop
                playsInline
                poster={current.thumb_url || undefined}
              />
            </div>
            <div className="printbar">
              <button className="btn" onClick={printFrame} title="baixa o frame atual do vídeo (pause antes)">
                📸 Print do frame
              </button>
            </div>
            <div className="dbody">
              <div className="dmeta">
                <span className="ava" style={{ background: colorFor(current.by || "?") }}>
                  {(current.by || "?").slice(0, 2).toUpperCase()}
                </span>
                <span>{current.by}</span>
                {current.creator && (
                  <button
                    className="creatorlink"
                    onClick={() => { setCreatorFilter(current.creator); setSelected(null); }}
                    title="ver todos desse criador"
                  >
                    · por @{current.creator}
                  </button>
                )}
                {current.date_ts && <span>· {fmtDate(current.date_ts)}</span>}
                {effLang(current) && <span>· {langLabel(effLang(current))}</span>}
              </div>
              <div className="dstats">
                {([
                  ["Views", current.views],
                  ["Likes", current.likes],
                  ["Comentários", current.comments],
                  ["Saves", current.saves],
                  ["Shares", current.reshares],
                ] as [string, number | null][])
                  .map(([label, v]) => [label, human(v)] as [string, string | null])
                  .filter(([, v]) => v != null)
                  .map(([label, v]) => (
                    <span key={label}>
                      {label} <b>{v}</b>
                    </span>
                  ))}
              </div>

              {(unlocked || curation.notes?.[current.code]) && (
                <>
                  <div className="tlabel">Nota</div>
                  {unlocked ? (
                    <textarea
                      className="note"
                      value={noteDraft}
                      placeholder="Escreva uma nota sobre este reel... (salva ao sair do campo)"
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={saveNote}
                    />
                  ) : (
                    <div className="note-ro">{curation.notes?.[current.code]}</div>
                  )}
                </>
              )}

              {(tagsOf(current.code).length > 0 || unlocked) && <div className="tlabel">Tags</div>}
              <div className="dtags">
                {tagsOf(current.code).map((t) => (
                  <span key={t} className="dtag">
                    #{t}
                    {unlocked && (
                      <button onClick={() => mutate({ op: "removeTag", code: current.code, tag: t })}>×</button>
                    )}
                  </span>
                ))}
                {unlocked && (
                  <input
                    type="text"
                    placeholder="+ tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                  />
                )}
              </div>

              {unlocked && allTags.some(([t]) => !tagsOf(current.code).includes(t)) && (
                <div className="tagpick">
                  <span className="picklbl">clique p/ adicionar:</span>
                  {allTags
                    .filter(([t]) => !tagsOf(current.code).includes(t))
                    .map(([t, n]) => (
                      <button
                        key={t}
                        className="pick"
                        onClick={() => mutate({ op: "addTag", code: current.code, tag: t })}
                      >
                        #{t} <b>{n}</b>
                      </button>
                    ))}
                </div>
              )}

              {unlocked && (
                <div className="langedit">
                  <span>Idioma:</span>
                  <select
                    value={curation.langs?.[current.code] || "__auto__"}
                    onChange={(e) =>
                      mutate({ op: "setLang", code: current.code, lang: e.target.value === "__auto__" ? "" : e.target.value })
                    }
                  >
                    <option value="__auto__">auto (detectado: {current.lang || "?"})</option>
                    {Array.from(new Set([...LANG_OPTIONS, current.lang].filter(Boolean))).map((l) => (
                      <option key={l as string} value={l as string}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {unlocked && (
                <div className="actions">
                  <button
                    className="btn warn"
                    onClick={() => mutate({ op: "setHidden", code: current.code, hidden: !hidden.has(current.code) })}
                  >
                    {hidden.has(current.code) ? "Mostrar de novo" : "Esconder este"}
                  </button>
                </div>
              )}

              {current.caption && (
                <>
                  <div className="tlabel">Legenda</div>
                  <div className="transcript">{current.caption}</div>
                </>
              )}

              <div className="tlabel">Transcrição</div>
              <div className="transcript">{current.transcript || "(sem transcrição)"}</div>

              <div className="openlink">
                <a href={current.source_url} target="_blank" rel="noopener noreferrer">
                  Abrir original ↗
                </a>
              </div>

              {current.creator &&
                (() => {
                  const others = reels.filter(
                    (r) => r.creator === current.creator && r.code !== current.code && (showHidden || !hidden.has(r.code))
                  );
                  if (!others.length) return null;
                  return (
                    <div className="related-wrap">
                      <div className="tlabel">Outros de @{current.creator} ({others.length})</div>
                      <div className="related">
                        {others.slice(0, 24).map((r) => (
                          <button
                            key={r.code}
                            className="rel"
                            onClick={() => setSelected(r.code)}
                            title={fmtDate(r.date_ts)}
                          >
                            {r.thumb_url ? <img loading="lazy" src={r.thumb_url} alt="" /> : <span>{r.code}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
