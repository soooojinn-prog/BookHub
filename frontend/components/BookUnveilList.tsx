"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { coverGradient, type BookFeed } from "@/lib/books";

type Row = {
  book: BookFeed;
  index: number;
  holder: string;
  next: string;
  percent: number;
};

export default function BookUnveilList({
  books,
  groupId,
}: {
  books: BookFeed[];
  groupId: string;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  // Circulation state (current holder / next reader / percent) comes from the
  // backend feed — the frontend does not recompute rotation logic.
  const rows: Row[] = useMemo(
    () =>
      books.map((book, index) => ({
        book,
        index,
        holder: book.current_holder?.nickname ?? "—",
        next: book.next_user?.nickname ?? "—",
        percent: book.percent,
      })),
    [books],
  );

  const active = rows.find((r) => r.book.id === activeId) ?? null;

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    const loop = () => {
      const k = reduce ? 1 : 0.15;
      pos.current.x += (target.current.x - pos.current.x) * k;
      pos.current.y += (target.current.y - pos.current.y) * k;
      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${pos.current.x - 98}px, ${pos.current.y - 300}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      className="bw-wrap relative border-t"
      data-testid="hero-list"
      data-hovering={activeId !== null}
      style={{ borderColor: "var(--line)" }}
      onMouseLeave={() => setActiveId(null)}
    >
      <ul>
        {rows.map((r) => (
          <li key={r.book.id}>
            <button
              type="button"
              onClick={() => router.push(`/groups/${groupId}/books/${r.book.id}`)}
              onMouseEnter={() => setActiveId(r.book.id)}
              onFocus={() => setActiveId(r.book.id)}
              onBlur={() => setActiveId(null)}
              data-active={activeId === r.book.id}
              data-testid="hero-book"
              className="bw-row"
              style={{ borderColor: "var(--line)" }}
            >
              <span className="bw-idx font-en">{String(r.index + 1).padStart(2, "0")}</span>
              <span className="bw-title">
                {r.book.title}
                <span className="bw-author">{r.book.author}</span>
              </span>
              <span className="bw-meta">
                <span className="bw-st font-en">
                  {r.percent >= 85 ? "handoff soon" : "reading now"}
                </span>
                <span className="bw-who">{r.holder}</span> ·{" "}
                <span className="bw-pct font-en">{r.percent}%</span>
                <span className="bw-next">다음 · {r.next}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div ref={previewRef} className="bw-preview" data-on={active !== null} aria-hidden="true">
        {active && (
          <div className="bw-pv-inner">
            <div className="bw-pv-cover" style={{ background: coverGradient(active.index) }}>
              <span className="bw-pv-t">{active.book.title}</span>
              <span className="bw-pv-a">{active.book.author}</span>
            </div>
            <div className="bw-pv-foot">
              <div className="bw-pv-row">
                <span>지금 · <b>{active.holder}</b></span>
                <span>다음 · <b>{active.next}</b></span>
              </div>
              <div className="bw-pv-bar"><i style={{ width: `${active.percent}%` }} /></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .bw-row {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 26px;
          width: 100%;
          text-align: left;
          padding: 30px 24px;
          border: 0;
          border-bottom: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.16, 0.8, 0.2, 1);
        }
        .bw-row::before {
          content: "";
          position: absolute;
          inset: 2px -14px;
          border: 1px solid var(--line-2);
          border-radius: 7px;
          background: linear-gradient(180deg, var(--bg-2), var(--bg));
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transform: scale(0.97);
          z-index: 0;
          pointer-events: none;
          transition: opacity 0.45s ease, transform 0.6s cubic-bezier(0.16, 0.8, 0.2, 1),
            border-color 0.45s;
        }
        .bw-row > * {
          position: relative;
          z-index: 1;
        }
        .bw-wrap[data-hovering="true"] .bw-row:not([data-active="true"]) {
          opacity: 0.3;
        }
        .bw-row[data-active="true"] {
          transform: scale(1.02);
          transform-origin: left center;
          border-bottom-color: transparent;
        }
        .bw-row[data-active="true"]::before {
          opacity: 1;
          transform: scale(1);
          border-color: var(--accent-dim);
        }
        .bw-idx {
          font-size: 13px;
          color: var(--faint);
          letter-spacing: 0.05em;
        }
        .bw-row[data-active="true"] .bw-idx {
          color: var(--accent);
        }
        .bw-title {
          font-weight: 500;
          font-size: clamp(22px, 4vw, 40px);
          line-height: 1.05;
          letter-spacing: -0.015em;
          min-width: 0;
          overflow-wrap: anywhere;
          transition: transform 0.5s cubic-bezier(0.16, 0.8, 0.2, 1);
        }
        .bw-row[data-active="true"] .bw-title {
          transform: translateX(10px);
        }
        .bw-author {
          display: block;
          font-weight: 300;
          font-size: 13px;
          color: var(--dim);
          margin-top: 8px;
        }
        .bw-meta {
          text-align: right;
          font-size: 12.5px;
          color: var(--dim);
          white-space: nowrap;
          line-height: 1.5;
        }
        .bw-st {
          display: block;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--faint);
          margin-bottom: 3px;
        }
        .bw-who {
          color: var(--ink);
          font-weight: 500;
        }
        .bw-pct {
          color: var(--accent);
        }
        .bw-next {
          display: block;
          font-size: 11px;
          color: var(--faint);
          margin-top: 4px;
        }
        .bw-preview {
          position: fixed;
          left: 0;
          top: 0;
          width: 196px;
          pointer-events: none;
          z-index: 60;
          opacity: 0;
          transition: opacity 0.3s ease;
          will-change: transform;
        }
        .bw-preview[data-on="true"] {
          opacity: 1;
        }
        @media (hover: none) {
          .bw-preview {
            display: none;
          }
        }
        .bw-pv-cover {
          position: relative;
          width: 196px;
          height: 286px;
          border-radius: 2px 6px 6px 2px;
          color: #eef3f4;
          overflow: hidden;
          border-left: 4px solid rgba(0, 0, 0, 0.3);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(226, 235, 238, 0.12),
            0 0 60px -8px var(--glow);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 18px;
        }
        .bw-pv-t {
          font-weight: 600;
          font-size: 19px;
          line-height: 1.25;
        }
        .bw-pv-a {
          font-size: 11px;
          opacity: 0.82;
          margin-top: 4px;
        }
        .bw-pv-foot {
          margin-top: 12px;
          background: var(--bg-2);
          border: 1px solid var(--line-2);
          border-radius: 7px;
          padding: 11px 13px;
        }
        .bw-pv-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--dim);
          margin-bottom: 8px;
        }
        .bw-pv-row b {
          color: var(--ink);
          font-weight: 500;
        }
        .bw-pv-bar {
          height: 3px;
          background: var(--line-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .bw-pv-bar i {
          display: block;
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
        }
        @media (max-width: 640px) {
          .bw-row {
            grid-template-columns: auto 1fr;
            column-gap: 12px;
            row-gap: 8px;
            padding: 20px 6px;
          }
          .bw-row::before {
            inset: 2px -8px;
          }
          .bw-title {
            font-size: 22px;
          }
          /* meta drops to its own full-width line under the title, left-aligned */
          .bw-meta {
            grid-column: 1 / -1;
            text-align: left;
            font-size: 12px;
            white-space: normal;
          }
          .bw-st {
            display: inline;
            margin: 0 6px 0 0;
          }
          .bw-next {
            display: inline;
            margin: 0 0 0 8px;
          }
          .bw-row[data-active="true"] {
            transform: none;
          }
          .bw-row[data-active="true"] .bw-title {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
