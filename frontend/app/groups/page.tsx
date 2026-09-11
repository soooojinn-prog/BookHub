"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import GroupCreateJoin from "@/components/GroupCreateJoin";
import Starfield from "@/components/Starfield";
import { me } from "@/lib/auth";
import { myGroups } from "@/lib/groups";
import type { Group, User } from "@/lib/types";

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => myGroups().then(setGroups), []);

  useEffect(() => {
    me()
      .then((u) => {
        setUser(u);
        return refresh();
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router, refresh]);

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
      <AppHeader nickname={user?.nickname} />
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

        {groups.length === 0 ? (
          <p className="mt-4 text-[14.5px]" style={{ color: "var(--ink-2)" }}>
            아직 속한 모임이 없어요. 아래에서 새 모임을 만들거나 초대코드로 가입해 보세요.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="block rounded-2xl p-5 transition-colors"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}
                >
                  <div className="text-[17px] font-medium">{g.name}</div>
                  <div className="mt-2 text-[12px]" style={{ color: "var(--dim)" }}>
                    독서기간 {g.reading_period_days}일 · 코드{" "}
                    <span className="font-en tracking-[0.12em]" style={{ color: "var(--accent)" }}>
                      {g.invite_code}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12">
          <h2 className="mb-4 font-en text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "var(--faint)" }}>
            모임 만들기 · 가입
          </h2>
          <GroupCreateJoin
            onChanged={(g) => {
              refresh().then(() => router.push(`/groups/${g.id}`));
            }}
          />
        </div>
      </main>
    </>
  );
}
