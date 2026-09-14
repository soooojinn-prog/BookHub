import Link from "next/link";

import Starfield from "@/components/Starfield";

export default function Home() {
  return (
    <>
      <Starfield />
      <header
        className="relative z-10 border-b"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-5 sm:px-8 py-5">
          <span className="text-[18px] font-semibold tracking-[0.04em]">
            책<span style={{ color: "var(--accent)" }}>◔</span>바퀴
          </span>
          <span className="hidden text-[12.5px] sm:inline" style={{ color: "var(--dim)" }}>
            책을 돌려 마음을 잇다
          </span>
          <span className="flex-1" />
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-[13px] font-medium"
            style={{ border: "1px solid var(--line-2)", color: "var(--ink)" }}
          >
            로그인
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1120px] px-5 sm:px-8 py-24">
        <span
          className="font-en text-[11px] font-medium uppercase tracking-[0.32em]"
          style={{ color: "var(--accent)" }}
        >
          Now in circulation
        </span>
        <h1 className="mt-5 text-[clamp(30px,5vw,58px)] font-semibold leading-[1.08] tracking-[-0.02em]">
          지금 우리 사이를
          <br />
          돌고 있는 <span style={{ color: "var(--dim)" }}>네 권.</span>
        </h1>
        <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.7]" style={{ color: "var(--ink-2)" }}>
          교환독서 모임 <b className="font-medium" style={{ color: "var(--ink)" }}>책바퀴</b>의
          웹서비스입니다. 책을 돌려 함께 읽고, 우리의 기록을 서재에 쌓아요.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center rounded-lg px-6 py-3 text-[15px] font-medium"
            style={{ background: "var(--accent)", color: "#0c1512" }}
          >
            책바퀴 시작하기 →
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[44px] items-center rounded-lg px-6 py-3 text-[15px]"
            style={{ border: "1px solid var(--line-2)", color: "var(--ink-2)" }}
          >
            로그인
          </Link>
        </div>
      </main>
    </>
  );
}
