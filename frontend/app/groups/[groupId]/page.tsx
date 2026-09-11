"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import Starfield from "@/components/Starfield";
import { ApiError } from "@/lib/api";
import { getGroup } from "@/lib/groups";
import type { GroupDetail } from "@/lib/types";

const memberColors = ["#5f8298", "#4f9d82", "#6f7bb2", "#8a6f9c"];

export default function GroupHomePage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGroup(params.groupId)
      .then(setGroup)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setError(err instanceof ApiError ? err.message : "모임을 불러오지 못했어요");
        }
      });
  }, [params.groupId, router]);

  return (
    <>
      <Starfield />
      <AppHeader />
      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-16">
        {error && (
          <p role="alert" className="text-[14px]" style={{ color: "#e88" }}>
            {error}
          </p>
        )}
        {!error && !group && (
          <p style={{ color: "var(--dim)" }}>불러오는 중…</p>
        )}
        {group && (
          <>
            <span
              className="font-en text-[11px] font-medium uppercase tracking-[0.3em]"
              style={{ color: "var(--accent)" }}
            >
              Reading circle
            </span>
            <h1 className="mt-4 text-[clamp(26px,3.6vw,40px)] font-semibold tracking-[-0.02em]">
              {group.name}
            </h1>
            <p className="mt-3 text-[13.5px]" style={{ color: "var(--dim)" }}>
              독서기간 {group.reading_period_days}일 · 초대코드{" "}
              <span className="font-en tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                {group.invite_code}
              </span>
            </p>

            <section className="mt-10">
              <h2 className="mb-4 font-en text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "var(--faint)" }}>
                멤버 · 순환 순서
              </h2>
              <ol className="flex flex-wrap gap-3">
                {group.members.map((m, i) => (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold"
                      style={{ background: memberColors[i % memberColors.length], color: "#0d1512" }}
                    >
                      {m.nickname.charAt(0)}
                    </span>
                    <span className="text-[14px]">{m.nickname}</span>
                    {m.role === "owner" && (
                      <span
                        className="font-en text-[9px] uppercase tracking-[0.14em]"
                        style={{ color: "var(--accent)" }}
                      >
                        owner
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <p className="mt-10 text-[13.5px]" style={{ color: "var(--ink-2)" }}>
              지금 돌고 있는 책과 완료된 책 서재는 다음 단계(Phase 3–4)에서 이 화면에 들어옵니다.
            </p>
          </>
        )}
      </main>
    </>
  );
}
