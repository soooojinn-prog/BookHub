"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { login, register } from "@/lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isLogin) {
        await login(nickname, password);
      } else {
        await register(nickname, password);
      }
      router.push("/groups");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문제가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-[420px] flex-col justify-center px-6">
      <span
        className="font-en text-[11px] font-medium uppercase tracking-[0.3em]"
        style={{ color: "var(--accent)" }}
      >
        {isLogin ? "Welcome back" : "Join the circle"}
      </span>
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em]">
        {isLogin ? "책바퀴에 로그인" : "책바퀴 계정 만들기"}
      </h1>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
          닉네임
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
            required
            minLength={2}
            className="rounded-lg px-3 py-3 text-[15px] outline-none"
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--line-2)",
              color: "var(--ink)",
            }}
          />
        </label>
        <label className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--dim)" }}>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            className="rounded-lg px-3 py-3 text-[15px] outline-none"
            style={{
              background: "var(--bg-3)",
              border: "1px solid var(--line-2)",
              color: "var(--ink)",
            }}
          />
        </label>

        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "#e88" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-lg py-3 text-[15px] font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#0c1512" }}
        >
          {busy ? "처리 중…" : isLogin ? "로그인" : "가입하기"}
        </button>
      </form>

      <p className="mt-6 text-[13px]" style={{ color: "var(--dim)" }}>
        {isLogin ? "아직 계정이 없나요? " : "이미 계정이 있나요? "}
        <a
          href={isLogin ? "/register" : "/login"}
          style={{ color: "var(--accent)" }}
        >
          {isLogin ? "가입하기" : "로그인"}
        </a>
      </p>
    </div>
  );
}
