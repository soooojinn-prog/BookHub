import Starfield from "@/components/Starfield";

export default function Home() {
  return (
    <>
      <Starfield />
      <header
        className="relative z-10 border-b"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-8 py-5">
          <span className="text-[18px] font-semibold tracking-[0.04em]">
            책<span style={{ color: "var(--accent)" }}>◔</span>바퀴
          </span>
          <span className="text-[12.5px]" style={{ color: "var(--dim)" }}>
            책을 돌려 마음을 잇다
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1120px] px-8 py-24">
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
          웹서비스입니다. 곧 로그인·모임·순환 기능이 여기에 들어옵니다.
        </p>
      </main>
    </>
  );
}
