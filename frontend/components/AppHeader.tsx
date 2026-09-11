"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { logout } from "@/lib/auth";

export default function AppHeader({ nickname }: { nickname?: string }) {
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="relative z-10 border-b" style={{ borderColor: "var(--line)" }}>
      <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-8 py-5">
        <Link href="/groups" className="text-[18px] font-semibold tracking-[0.04em]">
          책<span style={{ color: "var(--accent)" }}>◔</span>바퀴
        </Link>
        <span className="flex-1" />
        {nickname && (
          <span className="text-[13px]" style={{ color: "var(--dim)" }}>
            {nickname}
          </span>
        )}
        <button
          onClick={onLogout}
          className="rounded-full px-3 py-1.5 text-[12px]"
          style={{ border: "1px solid var(--line-2)", color: "var(--dim)" }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
