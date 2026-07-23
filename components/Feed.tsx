"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Reel } from "@/lib/types";

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
const fmtShort = (ts: number | null) =>
  ts ? new Date(ts * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";

function PhotoPager({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="fgal">
      <div
        className="fgal-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIdx(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((p, i) => (
          <div className="fgal-slide" key={i}>
            <img src={p} alt="" loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <div className="fgal-cnt">
            {idx + 1}/{photos.length}
          </div>
          <div className="fgal-dots">
            {photos.map((_, i) => (
              <span key={i} className={i === idx ? "on" : ""} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Feed({
  items,
  startIndex,
  suspended,
  onClose,
  onDetails,
}: {
  items: Reel[];
  startIndex: number;
  suspended: boolean; // drawer de detalhes aberto por cima → pausa o feed
  onClose: () => void;
  onDetails: (code: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<number, HTMLVideoElement>());
  const bars = useRef(new Map<number, HTMLDivElement>());
  const [active, setActive] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)));
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [capOpen, setCapOpen] = useState(false);

  // starts the feed already positioned on the chosen reel
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (wrap) wrap.scrollTop = active * wrap.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setActive(Number((en.target as HTMLElement).dataset.idx));
            setPaused(false);
            setCapOpen(false);
          }
        }
      },
      { root: wrap, threshold: 0.6 }
    );
    wrap.querySelectorAll("section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (i === active && !suspended && !paused) {
        v.muted = muted;
        v.play().catch(() => {
          // autoplay com som bloqueado → tenta mudo; se nem mudo rolar, mostra o botão de play
          if (!muted) setMuted(true);
          else setPaused(true);
        });
      } else {
        v.pause();
        if (i !== active) v.currentTime = 0;
      }
    });
  }, [active, muted, paused, suspended]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (suspended) return; // drawer aberto → teclado é dele
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.scrollBy({ top: e.key === "ArrowDown" ? wrap.clientHeight : -wrap.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [suspended]);

  function togglePlay() {
    const v = videos.current.get(active);
    if (!v) return;
    if (v.paused) {
      v.muted = muted;
      v.play().catch(() => {
        setMuted(true);
        v.muted = true;
        v.play().catch(() => {});
      });
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  function toggleMute() {
    const v = videos.current.get(active);
    const next = !muted;
    setMuted(next);
    if (v) {
      v.muted = next;
      if (!paused && !suspended) v.play().catch(() => {});
    }
  }

  return (
    <div className="feedwrap">
      <div className="feed" ref={wrapRef}>
        {items.map((r, i) => {
          const near = Math.abs(i - active) <= 2;
          const isPhoto = Boolean(r.photos?.length && !r.video_url);
          const isActive = i === active;
          return (
            <section key={r.code} data-idx={i} className="fitem">
              <div className="fframe">
                <div className="fmedia" onClick={() => !isPhoto && isActive && togglePlay()}>
                  {isPhoto ? (
                    near ? (
                      <PhotoPager photos={r.photos!} />
                    ) : (
                      r.thumb_url && <img className="fposter" src={r.thumb_url} alt="" loading="lazy" />
                    )
                  ) : near ? (
                    <video
                      ref={(el) => {
                        if (el) videos.current.set(i, el);
                        else videos.current.delete(i);
                      }}
                      src={r.video_url || undefined}
                      poster={r.thumb_url || undefined}
                      preload={isActive ? "auto" : "metadata"}
                      loop
                      playsInline
                      onTimeUpdate={(e) => {
                        const v = e.currentTarget;
                        const bar = bars.current.get(i);
                        if (bar && v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`;
                      }}
                    />
                  ) : (
                    r.thumb_url && <img className="fposter" src={r.thumb_url} alt="" loading="lazy" />
                  )}
                </div>

                {isActive && paused && !isPhoto && (
                  <div className="fpause">
                    <span>▶</span>
                  </div>
                )}

                <div className="frail">
                  {!isPhoto && (
                    <button onClick={toggleMute} aria-label={muted ? "ativar som" : "silenciar"}>
                      {muted ? "🔇" : "🔊"}
                    </button>
                  )}
                  <button className="finfo" onClick={() => onDetails(r.code)} aria-label="detalhes">
                    ⓘ
                  </button>
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer" aria-label="abrir original">
                    ↗
                  </a>
                  {human(r.likes) && <div className="fstat">❤️ {human(r.likes)}</div>}
                  {human(r.views) && <div className="fstat">▶ {human(r.views)}</div>}
                </div>

                <div className="fmeta">
                  <div className="fwho">
                    <span className="ava" style={{ background: colorFor(r.by || "?") }}>
                      {(r.by || "?").slice(0, 2).toUpperCase()}
                    </span>
                    <span>{r.by}</span>
                    {r.creator && <span className="fcreator">@{r.creator}</span>}
                    <span className="fdate">{fmtShort(r.date_ts)}</span>
                  </div>
                  {r.caption && (
                    <div
                      className={`fcap ${isActive && capOpen ? "open" : ""}`}
                      onClick={() => isActive && setCapOpen((o) => !o)}
                    >
                      {r.caption}
                    </div>
                  )}
                </div>

                {!isPhoto && (
                  <div
                    className="fprog"
                    onPointerDown={(e) => {
                      const v = videos.current.get(i);
                      if (!v || !v.duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                      v.currentTime = ratio * v.duration;
                    }}
                  >
                    <div className="track">
                      <div
                        className="fill"
                        ref={(el) => {
                          if (el) bars.current.set(i, el);
                          else bars.current.delete(i);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="ftop">
        <button className="fclose" onClick={onClose} aria-label="fechar feed">
          ✕
        </button>
        <span className="fcount">
          {active + 1} / {items.length}
        </span>
      </div>
    </div>
  );
}
