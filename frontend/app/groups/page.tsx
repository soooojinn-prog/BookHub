"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Starfield from "@/components/Starfield";
import { logout, me } from "@/lib/auth";
import type { User } from "@/lib/types";

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then((u) => setUser(u))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-24" style={{ color: "var(--dim)" }}>
        불러오는 중…
      </main>
    );
  }

  return (
    <>
      <Starfield />
      <header className="relative z-10 border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-8 py-5">
          <span className="text-[18px] font-semibold tracking-[0.04em]">
            책<span style={{ color: "var(--accent)" }}>◔</span>바퀴
          </span>
          <span className="flex-1" />
          <span className="text-[13px]" style={{ color: "var(--dim)" }}>
            {user?.nickname}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full px-3 py-1.5 text-[12px]"
            style={{ border: "1px solid var(--line-2)", color: "var(--dim)" }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-16">
        <span
          className="font-en text-[11px] font-medium uppercase tracking-[0.3em]"
          style={{ color: "var(--accent)" }}
        >
          My circles
        </span>
        <h1 className="mt-4 text-[clamp(24px,3.4vw,36px)] font-semibold tracking-[-0.02em]">
          내 모임
        </h1>
        <p className="mt-4 text-[14.5px]" style={{ color: "var(--ink-2)" }}>
          {user?.nickname}님, 환영해요. 모임 목록·생성·가입은 다음 단계(Phase 2)에서 이어집니다.
        </p>
      </main>
    </>
  );
}
