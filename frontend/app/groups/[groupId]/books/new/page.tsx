"use client";

import { useParams } from "next/navigation";

import AppHeader from "@/components/AppHeader";
import BookForm from "@/components/BookForm";
import Starfield from "@/components/Starfield";

export default function NewBookPage() {
  const params = useParams<{ groupId: string }>();
  return (
    <>
      <Starfield />
      <AppHeader />
      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-16">
        <span className="font-en text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          Add a book
        </span>
        <h1 className="mt-4 text-[clamp(24px,3.4vw,34px)] font-semibold tracking-[-0.02em]">
          새 책을 순환에 올리기
        </h1>
        <p className="mt-3 text-[13.5px]" style={{ color: "var(--dim)" }}>
          등록하면 당신이 <b style={{ color: "var(--ink)" }}>고른 사람</b>이자 첫 독자가 되고, 순환이 시작됩니다.
        </p>
        <BookForm groupId={params.groupId} />
      </main>
    </>
  );
}
