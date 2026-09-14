"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import StatsDashboard from "@/components/StatsDashboard";
import Starfield from "@/components/Starfield";
import { ApiError } from "@/lib/api";
import { getStats, type GroupStats } from "@/lib/stats";

export default function StatsPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats(params.groupId)
      .then(setStats)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof ApiError ? err.message : "통계를 불러오지 못했어요");
      });
  }, [params.groupId, router]);

  return (
    <>
      <Starfield />
      <AppHeader />
      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-14">
        <Link href={`/groups/${params.groupId}`} className="text-[13px]" style={{ color: "var(--dim)" }}>
          ← 모임으로
        </Link>
        <h1 className="mt-4 text-[clamp(24px,3.4vw,36px)] font-semibold tracking-[-0.02em]">
          우리 모임이 함께 돌린 기록
        </h1>
        {error && <p role="alert" className="mt-4" style={{ color: "#e88" }}>{error}</p>}
        {!error && !stats && <p className="mt-4" style={{ color: "var(--dim)" }}>불러오는 중…</p>}
        {stats && <div className="mt-8"><StatsDashboard stats={stats} /></div>}
      </main>
    </>
  );
}
