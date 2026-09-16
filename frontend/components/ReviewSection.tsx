"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { listReviews, upsertReview, type Review } from "@/lib/reviews";

function Stars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`별점 ${value}점`} style={{ color: "var(--accent)", letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= value ? "var(--accent)" : "var(--line-2)" }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewSection({
  bookId,
  meId,
  completed,
}: {
  bookId: number;
  meId: number | null;
  completed: boolean;
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(5);
  const [oneLiner, setOneLiner] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listReviews(bookId)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [bookId]);

  const mine = reviews?.find((r) => r.user_id === meId);
  const avg =
    reviews && reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setOneLiner(mine.one_liner);
    }
  }, [mine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await upsertReview(bookId, rating, oneLiner.trim());
      setReviews(await listReviews(bookId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "리뷰 저장에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { background: "var(--bg-3)", border: "1px solid var(--line-2)", color: "var(--ink)" } as const;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-en text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "var(--faint)" }}>
          별점 · 한줄평
        </span>
        {avg != null && (
          <span className="text-[12.5px]" style={{ color: "var(--dim)" }}>
            평균 <b data-testid="avg-rating" style={{ color: "var(--accent)" }}>{avg}</b> · {reviews?.length}명
          </span>
        )}
      </div>

      {reviews === null ? (
        <p className="text-[13px]" style={{ color: "var(--dim)" }}>불러오는 중…</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="review-list">
          {reviews.length === 0 && (
            <li className="text-[13px]" style={{ color: "var(--faint)" }}>아직 남긴 한줄평이 없어요. 첫 감상을 남겨보세요.</li>
          )}
          {reviews.map((r) => (
            <li key={r.user_id} className="rounded-xl px-4 py-3" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-medium">{r.nickname}</span>
                <Stars value={r.rating} />
              </div>
              {r.one_liner && <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink-2)" }}>{r.one_liner}</p>}
            </li>
          ))}
        </ul>
      )}

      {meId != null && !completed && (
        <p className="mt-4 text-[12.5px]" style={{ color: "var(--faint)" }}>
          완독(한 바퀴 완료) 후에 별점·한줄평을 남길 수 있어요.
        </p>
      )}

      {meId != null && completed && (
        <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
            별점
            <select aria-label="별점" value={rating} onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg px-3 py-2.5 text-[14px] outline-none" style={inputStyle}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n}점</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)", minWidth: 200 }}>
            한줄평
            <input aria-label="한줄평" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} maxLength={280}
              className="rounded-lg px-3 py-2.5 text-[14px] outline-none" style={inputStyle} />
          </label>
          <button type="submit" disabled={busy}
            className="rounded-lg px-4 py-3 text-[14px] font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "#0c1512" }}>
            {mine ? "수정" : "남기기"}
          </button>
          {error && <p role="alert" className="w-full text-[13px]" style={{ color: "#e88" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
