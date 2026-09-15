"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { coverGradient, type BookFeed, type Person } from "@/lib/books";

const memberColors = ["#5f8298", "#4f9d82", "#6f7bb2", "#8a6f9c", "#4d7f95", "#5a5a83"];

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="bc-stars">—</span>;
  const full = Math.round(value);
  return (
    <span className="bc-stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < full ? "" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function Avatars({ readers, chooserId }: { readers: Person[]; chooserId: number }) {
  return (
    <span className="bc-avs">
      {readers.map((p, i) => (
        <span
          key={p.user_id}
          className={"bc-av" + (p.user_id === chooserId ? " chooser" : "")}
          style={{ background: memberColors[i % memberColors.length] }}
          title={p.nickname + (p.user_id === chooserId ? " · 고른 사람" : "")}
        >
          {p.nickname.charAt(0)}
        </span>
      ))}
    </span>
  );
}

export default function Bookcase({ books, groupId }: { books: BookFeed[]; groupId: string }) {
  const router = useRouter();
  const [view, setView] = useState<"cover" | "shelf">("cover");
  const widthFor = (pages: number) => Math.round(30 + pages / 16);

  return (
    <div>
      <div className="bc-toggle" role="tablist">
        <button role="tab" aria-selected={view === "cover"} onClick={() => setView("cover")}>
          Cover
        </button>
        <button role="tab" aria-selected={view === "shelf"} onClick={() => setView("shelf")}>
          Bookshelf
        </button>
      </div>

      <div className="bc-case">
        {view === "cover" ? (
          <div className="bc-faceRow" data-testid="cover-view">
            {books.map((b) => (
              <button
                key={b.id}
                className="bc-cbook"
                data-testid="cover-book"
                onClick={() => router.push(`/groups/${groupId}/books/${b.id}`)}
              >
                <div className="bc-cap">
                  <div className="bc-t">{b.title}</div>
                  <div className="bc-a">{b.author} · {b.total_pages}p</div>
                  <div className="bc-capr">
                    <Stars value={b.avg_rating} />
                    <Avatars readers={b.readers} chooserId={b.chooser_user_id} />
                  </div>
                </div>
                <div className="bc-cov" style={{ background: coverGradient(b.id) }}>
                  <span className="bc-glare" />
                  {b.recent_review && (
                    <div className="bc-review">
                      <div className="bc-q">&ldquo;{b.recent_review.one_liner}&rdquo;</div>
                      <div className="bc-by">— {b.recent_review.nickname}</div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bc-spines" data-testid="shelf-view">
            {books.map((b) => (
              <button
                key={b.id}
                className="bc-spine"
                data-testid="shelf-book"
                style={{ width: widthFor(b.total_pages), background: coverGradient(b.id) }}
                onClick={() => router.push(`/groups/${groupId}/books/${b.id}`)}
              >
                <span className="bc-band top" />
                <span className="bc-txt">{b.title}</span>
                <span className="bc-band" />
                <span className="bc-tip">
                  <span className="bc-tt">{b.title}</span>
                  <span className="bc-ta">{b.author} · {b.total_pages}쪽</span>
                  <span className="bc-trow"><Stars value={b.avg_rating} /> <Avatars readers={b.readers} chooserId={b.chooser_user_id} /></span>
                  {b.recent_review && <span className="bc-tq">&ldquo;{b.recent_review.one_liner}&rdquo;</span>}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="bc-ledge" />
      </div>

      <style jsx>{`
        .bc-toggle {
          display: inline-flex;
          border: 1px solid var(--line-2);
          border-radius: 8px;
          background: var(--bg-2);
          padding: 4px;
          gap: 2px;
          margin-bottom: 16px;
        }
        .bc-toggle button {
          border: 0;
          background: transparent;
          color: var(--dim);
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          min-height: 44px;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          font-family: var(--font-en);
        }
        .bc-toggle button[aria-selected="true"] {
          background: var(--accent);
          color: #0c1512;
        }
        .bc-case {
          position: relative;
          overflow: hidden;
          border-radius: 6px;
          padding: 26px 24px 0;
          background:
            radial-gradient(120% 120% at 50% 20%, transparent 58%, rgba(0, 0, 0, 0.5)),
            repeating-linear-gradient(90deg, #11161a, #11161a 3px, #141a1e 3px, #141a1e 7px),
            linear-gradient(180deg, #1b2327, #0e1316);
          box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.55), 0 30px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }
        .bc-ledge {
          height: 16px;
          margin: 0 -24px;
          background: linear-gradient(180deg, #747f85, #4b555c 15%, #2d353a 55%, #131a1d);
          box-shadow: 0 20px 30px rgba(0, 0, 0, 0.6), inset 0 1.5px 0 rgba(255, 255, 255, 0.18);
        }
        /* cover */
        .bc-faceRow {
          display: flex;
          align-items: flex-end;
          gap: 30px;
          flex-wrap: wrap;
          padding-bottom: 6px;
        }
        .bc-cbook {
          width: 140px;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          color: var(--ink);
        }
        .bc-cap {
          margin-bottom: 11px;
        }
        .bc-t {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.25;
        }
        .bc-a {
          font-size: 11px;
          color: var(--dim);
          margin-top: 3px;
        }
        .bc-capr {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 7px;
        }
        .bc-cov {
          position: relative;
          height: 196px;
          border-radius: 2px 6px 6px 2px;
          border-left: 4px solid rgba(0, 0, 0, 0.3);
          overflow: hidden;
          box-shadow: 0 16px 26px rgba(0, 0, 0, 0.5), inset -7px 0 14px rgba(0, 0, 0, 0.24);
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s;
        }
        .bc-cbook:hover .bc-cov {
          transform: translateY(-12px);
          box-shadow: 0 30px 46px rgba(0, 0, 0, 0.6), 0 0 40px -12px var(--glow),
            inset -7px 0 14px rgba(0, 0, 0, 0.24);
        }
        .bc-glare {
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.03) 15%, transparent 34%);
          pointer-events: none;
        }
        .bc-review {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 14px;
          color: #eef3f4;
          background: linear-gradient(180deg, transparent, rgba(9, 13, 15, 0.86) 45%);
          opacity: 0;
          transition: opacity 0.35s;
        }
        .bc-cbook:hover .bc-review {
          opacity: 1;
        }
        .bc-q {
          font-size: 12.5px;
          line-height: 1.45;
        }
        .bc-by {
          font-size: 10.5px;
          color: var(--accent);
          margin-top: 6px;
          font-family: var(--font-en);
        }
        /* shelf */
        .bc-spines {
          display: flex;
          align-items: flex-end;
          gap: 5px;
          min-height: 210px;
          padding: 40px 2px 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .bc-spine {
          position: relative;
          height: 196px;
          flex: 0 0 auto;
          border: 0;
          border-radius: 2px 2px 1px 1px;
          color: #eef3f4;
          cursor: pointer;
          box-shadow: inset -7px 0 13px rgba(0, 0, 0, 0.3), inset 4px 0 6px rgba(255, 255, 255, 0.1);
          transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-origin: bottom center;
        }
        .bc-spine:hover {
          transform: translateY(-22px);
          z-index: 5;
        }
        @media (max-width: 640px) {
          .bc-faceRow {
            gap: 20px;
          }
          .bc-case {
            padding: 22px 16px 0;
          }
          .bc-ledge {
            margin: 0 -16px;
          }
        }
        .bc-txt {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          writing-mode: vertical-rl;
          font-weight: 500;
          font-size: 13px;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          padding: 14px 0;
        }
        .bc-band {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 16px;
          height: 1.5px;
          background: rgba(255, 255, 255, 0.28);
        }
        .bc-band.top {
          bottom: auto;
          top: 16px;
        }
        .bc-tip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translate(-50%, 8px);
          margin-bottom: 10px;
          width: 210px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: rgba(23, 28, 31, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 11px;
          padding: 12px 13px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.28s, transform 0.28s;
          z-index: 9;
          color: var(--ink);
        }
        .bc-spine:hover .bc-tip {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .bc-tt {
          font-weight: 600;
          font-size: 14px;
        }
        .bc-ta {
          font-size: 11px;
          color: var(--dim);
        }
        .bc-trow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .bc-tq {
          font-size: 11.5px;
          color: var(--ink-2);
          margin-top: 4px;
          line-height: 1.45;
        }
      `}</style>
      <style jsx global>{`
        .bc-stars {
          font-size: 12px;
          color: var(--accent);
          letter-spacing: 1px;
          white-space: nowrap;
        }
        .bc-stars .off {
          color: var(--line-2);
        }
        .bc-avs {
          display: inline-flex;
        }
        .bc-av {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d1512;
          font-weight: 600;
          border: 1.5px solid var(--bg-2);
          margin-left: -5px;
        }
        .bc-av.chooser {
          box-shadow: 0 0 0 1.5px var(--accent);
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
