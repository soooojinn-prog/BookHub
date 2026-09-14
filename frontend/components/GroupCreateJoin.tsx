"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import { createGroup, joinGroup } from "@/lib/groups";
import type { Group } from "@/lib/types";

const inputStyle = {
  background: "var(--bg-3)",
  border: "1px solid var(--line-2)",
  color: "var(--ink)",
} as const;

export default function GroupCreateJoin({ onChanged }: { onChanged: (g: Group) => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState(14);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const g = await createGroup(name, days);
      setName("");
      onChanged(g);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "모임 생성에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const g = await joinGroup(code.trim());
      setCode("");
      onChanged(g);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form
        onSubmit={onCreate}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}
      >
        <h3 className="text-[15px] font-medium">새 모임 만들기</h3>
        <label className="mt-4 flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
          모임 이름
          <input
            aria-label="모임 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="rounded-lg px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
        </label>
        <label className="mt-3 flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
          독서기간 (일)
          <input
            aria-label="독서기간"
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
            className="w-28 rounded-lg px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg px-4 py-3 text-[14px] font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#0c1512" }}
        >
          만들기
        </button>
      </form>

      <form
        onSubmit={onJoin}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}
      >
        <h3 className="text-[15px] font-medium">초대코드로 가입</h3>
        <label className="mt-4 flex flex-col gap-2 text-[12.5px]" style={{ color: "var(--dim)" }}>
          초대코드
          <input
            aria-label="초대코드"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            minLength={4}
            maxLength={16}
            className="rounded-lg px-3 py-2.5 font-en text-[14px] tracking-[0.15em] outline-none"
            style={inputStyle}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg px-4 py-3 text-[14px] font-medium disabled:opacity-60"
          style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
        >
          가입하기
        </button>
      </form>

      {error && (
        <p role="alert" className="text-[13px] md:col-span-2" style={{ color: "#e88" }}>
          {error}
        </p>
      )}
    </div>
  );
}
