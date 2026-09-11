"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import BookUnveilList from "@/components/BookUnveilList";
import Starfield from "@/components/Starfield";
import { ApiError } from "@/lib/api";
import { listBooks, type BookFeed } from "@/lib/books";
import { getGroup } from "@/lib/groups";
import type { GroupDetail } from "@/lib/types";

const memberColors = ["#5f8298", "#4f9d82", "#6f7bb2", "#8a6f9c"];

export default function GroupHomePage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [books, setBooks] = useState<BookFeed[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGroup(params.groupId), listBooks(params.groupId, "circulating")])
      .then(([g, b]) => {
        setGroup(g);
        setBooks(b);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof ApiError ? err.message : "모임을 불러오지 못했어요");
      });
  }, [params.groupId, router]);

  return (
    <>
      <Starfield />
      <AppHeader />
      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-14">
        {error && <p role="alert" style={{ color: "#e88" }}>{error}</p>}
        {!error && !group && <p style={{ color: "var(--dim)" }}>불러오는 중…</p>}
        {group && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-en text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                  Reading circle
                </span>
                <h1 className="mt-3 text-[clamp(26px,3.6vw,40px)] font-semibold tracking-[-0.02em]">{group.name}</h1>
                <p className="mt-2 text-[13px]" style={{ color: "var(--dim)" }}>
                  독서기간 {group.reading_period_days}일 · 초대코드{" "}
                  <span data-testid="invite-code" className="font-en tracking-[0.14em]" style={{ color: "var(--accent)" }}>{group.invite_code}</span>
                </p>
              </div>
              <Link href={`/groups/${group.id}/books/new`}
                className="rounded-lg px-4 py-2.5 text-[14px] font-medium"
                style={{ background: "var(--accent)", color: "#0c1512" }}>
                + 책 등록
              </Link>
            </div>

            <section className="mt-12">
              <h2 className="mb-2 font-en text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "var(--faint)" }}>
                지금 돌고 있는 책 · {books.length}
              </h2>
              {books.length === 0 ? (
                <p className="mt-4 text-[14px]" style={{ color: "var(--ink-2)" }}>
                  아직 순환 중인 책이 없어요. <Link href={`/groups/${group.id}/books/new`} style={{ color: "var(--accent)" }}>첫 책을 등록</Link>해 순환을 시작해 보세요.
                </p>
              ) : (
                <BookUnveilList books={books} groupId={String(group.id)} />
              )}
            </section>

            <section className="mt-14">
              <h2 className="mb-4 font-en text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: "var(--faint)" }}>
                멤버 · 순환 순서
              </h2>
              <ol className="flex flex-wrap gap-3">
                {[...group.members].sort((a, b) => a.rotation_position - b.rotation_position).map((m, i) => (
                  <li key={m.user_id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold"
                      style={{ background: memberColors[i % memberColors.length], color: "#0d1512" }}>
                      {m.nickname.charAt(0)}
                    </span>
                    <span className="text-[14px]">{m.nickname}</span>
                    {m.role === "owner" && (
                      <span className="font-en text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>owner</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </main>
    </>
  );
}
