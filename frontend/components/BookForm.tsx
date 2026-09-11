"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { createBook } from "@/lib/books";

const inputStyle = {
  background: "var(--bg-3)",
  border: "1px solid var(--line-2)",
  color: "var(--ink)",
} as const;

export default function BookForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [totalPages, setTotalPages] = useState<number | "">("");
  const [coverUrl, setCoverUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !author.trim()) {
      setError("제목과 저자를 입력해 주세요.");
      return;
    }
    if (!totalPages || totalPages <= 0) {
      setError("전체 페이지 수를 1 이상으로 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await createBook(groupId, {
        title: title.trim(),
        author: author.trim(),
        genre: genre.trim(),
        total_pages: Number(totalPages),
        cover_url: coverUrl.trim() || null,
      });
      router.push(`/groups/${groupId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "책 등록에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-[520px] flex-col gap-4">
      <label className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
        제목
        <input aria-label="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          className="rounded-lg px-3 py-3 text-[15px] outline-none" style={inputStyle} />
      </label>
      <label className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
        저자
        <input aria-label="저자" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120}
          className="rounded-lg px-3 py-3 text-[15px] outline-none" style={inputStyle} />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
          장르
          <input aria-label="장르" value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={60}
            className="rounded-lg px-3 py-3 text-[15px] outline-none" style={inputStyle} />
        </label>
        <label className="flex w-40 flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
          전체 페이지
          <input aria-label="전체 페이지" type="number" min={1} max={10000} value={totalPages}
            onChange={(e) => setTotalPages(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg px-3 py-3 text-[15px] outline-none" style={inputStyle} />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
        표지 URL (선택)
        <input aria-label="표지 URL" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} maxLength={500}
          placeholder="https://…" className="rounded-lg px-3 py-3 text-[15px] outline-none" style={inputStyle} />
      </label>

      {error && (
        <p role="alert" className="text-[13px]" style={{ color: "#e88" }}>
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-3">
        <button type="submit" disabled={busy}
          className="rounded-lg px-5 py-3 text-[15px] font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#0c1512" }}>
          {busy ? "등록 중…" : "책 등록"}
        </button>
        <button type="button" onClick={() => router.push(`/groups/${groupId}`)}
          className="rounded-lg px-5 py-3 text-[15px]" style={{ border: "1px solid var(--line-2)", color: "var(--dim)" }}>
          취소
        </button>
      </div>
    </form>
  );
}
