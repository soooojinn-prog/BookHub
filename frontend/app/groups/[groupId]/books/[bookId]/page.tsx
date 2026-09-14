"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import HandoffPanel from "@/components/HandoffPanel";
import ReviewSection from "@/components/ReviewSection";
import Starfield from "@/components/Starfield";
import { ApiError } from "@/lib/api";
import { me } from "@/lib/auth";
import { coverGradient, getBook, type BookDetail } from "@/lib/books";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function nameOf(detail: BookDetail, id: number | null): string {
  if (id == null) return "";
  return detail.rotation_path.find((p) => p.user_id === id)?.nickname ?? `#${id}`;
}

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string; bookId: string }>();
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [meId, setMeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBook(params.bookId), me()])
      .then(([d, u]) => {
        setDetail(d);
        setMeId(u.id);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof ApiError ? err.message : "책을 불러오지 못했어요");
      });
  }, [params.bookId, router]);

  const isHolder = detail != null && meId != null && detail.current_holder_user_id === meId;
  const history = detail ? [...detail.history].reverse() : [];

  return (
    <>
      <Starfield />
      <AppHeader />
      <main className="relative z-10 mx-auto max-w-[1080px] px-8 py-14">
        <Link href={`/groups/${params.groupId}`} className="text-[13px]" style={{ color: "var(--dim)" }}>
          ← 모임으로
        </Link>
        {error && <p role="alert" className="mt-4" style={{ color: "#e88" }}>{error}</p>}
        {!error && !detail && <p className="mt-4" style={{ color: "var(--dim)" }}>불러오는 중…</p>}

        {detail && (
          <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
            {/* book */}
            <div>
              <div className="relative flex h-[320px] flex-col justify-end rounded-[3px_10px_10px_3px] p-5 text-[#eef3f4]"
                style={{ background: coverGradient(detail.id), borderLeft: "5px solid rgba(0,0,0,0.3)", boxShadow: "0 26px 44px rgba(0,0,0,0.5)" }}>
                <div className="text-[22px] font-semibold leading-tight">{detail.title}</div>
                <div className="mt-1.5 text-[12px] opacity-85">{detail.author}</div>
              </div>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-y-2 text-[13px]">
                <dt style={{ color: "var(--dim)" }}>장르&nbsp;&nbsp;</dt><dd className="text-right">{detail.genre || "—"}</dd>
                <dt style={{ color: "var(--dim)" }}>전체</dt><dd className="text-right">{detail.total_pages}쪽</dd>
                <dt style={{ color: "var(--dim)" }}>고른 사람</dt><dd className="text-right">{detail.chooser?.nickname ?? "—"}</dd>
                <dt style={{ color: "var(--dim)" }}>전달 예정</dt><dd className="text-right">{fmtDate(detail.due_date)}</dd>
              </dl>
            </div>

            {/* circulation */}
            <div className="flex flex-col gap-8">
              <div>
                <div className="flex items-baseline gap-3">
                  <span data-testid="percent" className="font-en text-[40px] font-semibold" style={{ color: "var(--ink)" }}>{detail.percent}%</span>
                  <span className="text-[13px]" style={{ color: "var(--dim)" }}>
                    <b style={{ color: "var(--ink-2)" }}>{detail.current_page}</b> / {detail.total_pages}쪽
                    {detail.current_holder && <> · 지금 <span data-testid="current-holder" style={{ color: "var(--ink)" }}>{detail.current_holder.nickname}</span></>}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-md" style={{ background: "var(--bg-3)", border: "1px solid var(--line-2)" }}>
                  <div className="h-full rounded-md" style={{ width: `${detail.percent}%`, background: "linear-gradient(90deg,var(--accent-dim),var(--accent))" }} />
                </div>
              </div>

              <div>
                <div className="mb-3 font-en text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "var(--faint)" }}>순환 경로</div>
                <div className="flex flex-wrap gap-2">
                  {detail.rotation_path.map((p) => {
                    const isCurrent = p.user_id === detail.current_holder_user_id;
                    const isNext = p.user_id === detail.next_user?.user_id;
                    return (
                      <div key={p.user_id} className="rounded-xl px-4 py-3 text-center"
                        style={{
                          background: isCurrent ? "rgba(99,209,163,0.06)" : "var(--bg-3)",
                          border: `1px solid ${isCurrent ? "var(--accent)" : "var(--line-2)"}`,
                          minWidth: 88,
                        }}>
                        <div className="text-[13px]">{p.nickname}</div>
                        <div className="font-en text-[9.5px] uppercase tracking-[0.14em]"
                          style={{ color: isCurrent ? "var(--accent)" : isNext ? "var(--ink-2)" : "var(--faint)" }}>
                          {isCurrent ? "reading" : isNext ? "next" : "·"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 font-en text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "var(--faint)" }}>전달</div>
                <HandoffPanel detail={detail} isHolder={isHolder} onChanged={setDetail} />
              </div>

              <div>
                <div className="mb-3 font-en text-[10.5px] uppercase tracking-[0.18em]" style={{ color: "var(--faint)" }}>이동 기록</div>
                <ol className="relative flex flex-col gap-1 pl-6" style={{ borderLeft: "0" }}>
                  {history.map((h, i) => (
                    <li key={i} data-testid="handoff-item" className="relative py-2">
                      <span className="absolute -left-6 top-3 h-3 w-3 rounded-full"
                        style={{ background: i === 0 ? "var(--accent)" : "var(--bg)", border: `2px solid ${i === 0 ? "var(--accent)" : "var(--accent-dim)"}` }} />
                      <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
                        {h.from_user_id != null ? (
                          <span style={{ color: "var(--ink-2)" }}>
                            {nameOf(detail, h.from_user_id)} <span style={{ color: "var(--accent)" }}>→</span> {nameOf(detail, h.to_user_id)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink)" }}>{nameOf(detail, h.to_user_id)} 시작</span>
                        )}
                        {h.is_manual && (
                          <span className="rounded-full px-2 py-0.5 text-[10.5px]" style={{ border: "1px solid var(--accent-dim)", color: "var(--accent)" }}>순서 변경</span>
                        )}
                        <span className="text-[12px]" style={{ color: "var(--dim)" }}>· {fmtDate(h.created_at)}</span>
                      </div>
                      {(h.page_at_handoff != null || h.note) && (
                        <div className="mt-0.5 text-[12px]" style={{ color: "var(--faint)" }}>
                          {h.page_at_handoff != null && <>{h.page_at_handoff}쪽까지 </>}{h.note}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <ReviewSection bookId={detail.id} meId={meId} completed={detail.status === "completed"} />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
