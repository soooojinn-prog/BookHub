"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import { handoff, updateProgress, type BookDetail } from "@/lib/books";

export default function HandoffPanel({
  detail,
  isHolder,
  onChanged,
}: {
  detail: BookDetail;
  isHolder: boolean;
  onChanged: (d: BookDetail) => void;
}) {
  const [page, setPage] = useState<number | "">(detail.current_page);
  const [manualTo, setManualTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const others = detail.rotation_path.filter((p) => p.user_id !== detail.current_holder_user_id);

  if (detail.status === "completed") {
    return (
      <div className="rounded-xl px-4 py-3 text-[13.5px]" style={{ background: "rgba(99,209,163,0.08)", border: "1px solid var(--accent-dim)", color: "var(--accent)" }}>
        한 바퀴 완료 — 이 책은 서재에 쌓였어요.
      </div>
    );
  }

  if (!isHolder) {
    return (
      <p className="text-[13px]" style={{ color: "var(--dim)" }}>
        지금은 <b style={{ color: "var(--ink)" }}>{detail.current_holder?.nickname}</b>님이 읽는 중이에요. 진도 입력·전달은 현재 독자만 할 수 있어요.
      </p>
    );
  }

  async function saveProgress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const d = await updateProgress(detail.id, Number(page || 0));
      onChanged(d);
      setOk(`진도 저장됨 · ${d.percent}%`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "진도 저장에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function doHandoff() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const body = manualTo ? { manual_to_user_id: Number(manualTo) } : {};
      const d = await handoff(detail.id, body);
      setManualTo("");
      onChanged(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "전달에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { background: "var(--bg-3)", border: "1px solid var(--line-2)", color: "var(--ink)" } as const;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={saveProgress} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
          현재 페이지
          <input aria-label="현재 페이지" type="number" min={0} max={detail.total_pages} value={page}
            onChange={(e) => setPage(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-28 rounded-lg px-3 py-2.5 text-right text-[14px] outline-none" style={inputStyle} />
        </label>
        <span className="pb-3 text-[13px]" style={{ color: "var(--faint)" }}>/ {detail.total_pages}쪽</span>
        <button type="submit" disabled={busy}
          className="rounded-lg px-4 py-3 text-[13px] disabled:opacity-60"
          style={{ border: "1px solid var(--line-2)", color: "var(--ink-2)" }}>
          진도 저장
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={doHandoff} disabled={busy}
          className="rounded-lg px-5 py-3 text-[14px] font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#0c1512" }}>
          다음 사람에게 전달 →
        </button>
        <select aria-label="다음 독자 바꾸기" value={manualTo} onChange={(e) => setManualTo(e.target.value)}
          className="w-full min-w-0 max-w-full rounded-lg px-3 py-3 text-[13px] outline-none sm:w-auto" style={inputStyle}>
          <option value="">다음 독자: 기본 순서 ({detail.next_user?.nickname ?? "—"})</option>
          {others.map((p) => (
            <option key={p.user_id} value={p.user_id}>다음 독자 바꾸기 → {p.nickname}</option>
          ))}
        </select>
      </div>

      {ok && <p className="text-[13px]" style={{ color: "var(--accent)" }}>{ok}</p>}
      {error && <p role="alert" className="text-[13px]" style={{ color: "#e88" }}>{error}</p>}
    </div>
  );
}
