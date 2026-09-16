import { devices, expect, test, type Locator, type Page } from "@playwright/test";

import { audit, expectClean, reach, shot } from "./_audit";

/**
 * Stage-4 mobile QA: the whole A↔B journey driven on an emulated phone with
 * real touch input (tap, not click), auditing every screen it lands on.
 *
 * The earlier mobile specs resize a desktop browser, so `(hover: hover)` still
 * matches and `.tap()` is unavailable — hover-only affordances and touch-only
 * regressions cannot show up there. This spec uses a device descriptor
 * (hasTouch + isMobile + mobile UA), which is what makes it a different test
 * and not a duplicate of mobile.spec.ts.
 */

const PW = "secret1";
const PHONE = devices["Pixel 5"]; // 393x851, hasTouch, isMobile

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Reachability measurements collected across the run, printed at the end. */
const reachLog: string[] = [];

async function measure(target: Locator, label: string) {
  const r = await reach(target);
  if (r) {
    reachLog.push(
      `${label}: top=${r.top}px  ${r.screensDown} screens down  (viewport ${r.viewportHeight}px, page ${r.pageHeight}px)`,
    );
  }
  return r;
}

async function step(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  // Touch emulation silently degrades if the harness loses it (it did once when
  // both phones shared a browser process), and every touch-only assertion below
  // would then pass for the wrong reason. Fail loudly instead.
  const media = await page.evaluate(() => ({
    hoverNone: matchMedia("(hover: none)").matches,
    coarse: matchMedia("(pointer: coarse)").matches,
    touch: navigator.maxTouchPoints,
    w: innerWidth,
  }));
  expect(media, `${label} · touch emulation lost`).toMatchObject({ hoverNone: true, coarse: true });
  const a = await audit(page);
  expectClean(a, `${label} @${PHONE.viewport.width}`);
  await shot(page, label);
}

test("mobile journey: A and B complete a loop end to end on a phone", async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  const stamp = unique();
  const nickA = `pa_${stamp}`;
  const nickB = `pb_${stamp}`;
  const title = `한 손으로 읽는 밤의 도서관_${stamp}`;

  // Two phones, two browser processes. Sharing one browser makes Chromium drop
  // touch emulation from the first context once the second one is driven, which
  // quietly turns this into a desktop run.
  const browserB = await browser.browserType().launch();
  const ctxA = await browser.newContext({ ...PHONE });
  const ctxB = await browserB.newContext({ ...PHONE });
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();

  // ── A: 회원가입 ────────────────────────────────────────────────────────────
  await A.goto("/register");

  // Touch emulation must actually be on, or every tap below silently degrades
  // to a mouse event and the point of this spec is lost. Playwright's WebKit on
  // Windows has none, so there the journey is skipped rather than failed.
  const touch = await A.evaluate(() => navigator.maxTouchPoints);
  if (touch === 0) {
    await ctxA.close();
    await ctxB.close();
    await browserB.close();
    test.skip(true, "touch emulation unavailable in this browser build");
  }
  expect(await A.evaluate(() => window.matchMedia("(hover: none)").matches)).toBe(true);
  await step(A, "01-register");
  await A.getByLabel("닉네임").fill(nickA);
  await A.getByLabel("비밀번호").fill(PW);
  await A.getByRole("button", { name: "가입하기" }).tap();
  await A.waitForURL("**/groups", { timeout: 60_000 });
  await step(A, "02-groups-empty");

  // ── A: 모임 생성 → 초대코드 확인 ───────────────────────────────────────────
  await A.getByLabel("모임 이름").fill(`모바일_${stamp}`);
  await A.getByLabel("독서기간").fill("14");
  await A.getByRole("button", { name: "만들기" }).tap();
  await A.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = A.url();
  const code = (await A.getByTestId("invite-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6,10}$/);
  await step(A, "03-group-home-empty");
  // 화면 전환 후 상태 이해: 모임 이름·초대코드·다음 행동이 한 화면에 보이는가
  await expect(A.getByTestId("invite-code")).toBeInViewport();
  await measure(A.getByRole("link", { name: "+ 책 등록" }), "group-home · 책 등록 CTA");
  await expect(A.getByRole("link", { name: "+ 책 등록" })).toBeInViewport();

  // ── B: 가입 후 초대코드로 참여 ─────────────────────────────────────────────
  await B.goto("/register");
  await B.getByLabel("닉네임").fill(nickB);
  await B.getByLabel("비밀번호").fill(PW);
  await B.getByRole("button", { name: "가입하기" }).tap();
  await B.waitForURL("**/groups", { timeout: 60_000 });
  await B.getByLabel("초대코드").fill(code);
  await B.getByRole("button", { name: "가입하기" }).tap();
  await B.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  await step(B, "04-b-joined");

  // ── A: 책 등록 ─────────────────────────────────────────────────────────────
  await A.getByRole("link", { name: "+ 책 등록" }).tap();
  await A.waitForURL(/\/books\/new$/, { timeout: 60_000 });
  await step(A, "05-book-new");
  await A.getByLabel("제목").fill(title);
  await A.getByLabel("저자").fill("아주 긴 이름을 가진 어느 작가님");
  await A.getByLabel("전체 페이지").fill("320");
  // a same-origin asset stands in for a real cover, so the shelf below exercises
  // the image path without depending on an outside host
  await A.getByLabel("표지 URL").fill(`${baseURL}/favicon.ico`);
  await A.getByRole("button", { name: "책 등록" }).tap();
  await A.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });

  // ── A: Hero 확인 ───────────────────────────────────────────────────────────
  await expect(A.getByTestId("hero-list").getByText(title)).toBeVisible();
  await step(A, "06-hero");
  // 터치 환경에서 hover 전용 미리보기는 렌더되지 않아야 한다(모바일에서 죽은 레이어).
  const preview = await A.evaluate(() => {
    const el = document.querySelector(".bw-preview");
    return {
      found: !!el,
      display: el ? getComputedStyle(el).display : null,
      hoverNone: matchMedia("(hover: none)").matches,
      pointerCoarse: matchMedia("(pointer: coarse)").matches,
      rect: el ? Math.round(el.getBoundingClientRect().width) : null,
    };
  });
  console.log("hero preview state:", JSON.stringify(preview));
  expect(preview.display, "hover preview must not render on touch").toBe("none");

  // ── A: 상세 진입 → 진행률 수정 ─────────────────────────────────────────────
  await A.getByTestId("hero-book").first().tap();
  await A.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  const bookUrl = A.url();
  await step(A, "07-book-detail-holder");
  await measure(A.getByLabel("현재 페이지"), "book-detail · 진도 입력");
  await measure(A.getByRole("button", { name: /다음 사람에게 전달/ }), "book-detail · 전달 CTA");

  await A.getByLabel("현재 페이지").fill("160");
  await A.getByRole("button", { name: "진도 저장" }).tap();
  await expect(A.getByTestId("percent")).toHaveText("50%");
  // 저장 결과가 눈에 보이는 위치에서 확인되는가
  await expect(A.getByText(/진도 저장됨/)).toBeVisible();
  await step(A, "08-progress-saved");

  // ── A → B 전달 ─────────────────────────────────────────────────────────────
  await A.getByRole("button", { name: /다음 사람에게 전달/ }).tap();
  await expect(A.getByTestId("current-holder")).toHaveText(nickB);
  // 전환 후 상태 이해: A는 더 이상 편집할 수 없고, 그 이유가 화면에 있어야 한다
  await expect(A.getByRole("button", { name: "진도 저장" })).toHaveCount(0);
  await expect(A.getByText(/현재 독자만 할 수 있어요/)).toBeVisible();
  await step(A, "09-after-handoff-readonly");

  // ── B: 모임 진입 → 전달받은 책 확인 ────────────────────────────────────────
  await B.goto(groupUrl);
  await expect(B.getByTestId("hero-book").first()).toContainText(nickB);
  await step(B, "10-b-group-home");
  await B.getByTestId("hero-book").first().tap();
  await B.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await step(B, "11-b-book-detail");

  // ── B: 진행률 수정 → A에게 전달 → 자동 완료 ────────────────────────────────
  await B.getByLabel("현재 페이지").fill("310");
  await B.getByRole("button", { name: "진도 저장" }).tap();
  await expect(B.getByTestId("percent")).toHaveText("97%");
  await B.getByRole("button", { name: /다음 사람에게 전달/ }).tap();
  await expect(B.getByText(/한 바퀴 완료/)).toBeVisible();
  await step(B, "12-completed");

  // ── B: 리뷰 작성 ───────────────────────────────────────────────────────────
  await measure(B.getByLabel("한줄평"), "completed-detail · 리뷰 입력");
  await B.getByLabel("별점", { exact: true }).selectOption("5");
  await B.getByLabel("한줄평").fill("밤에 읽기 좋은 책, 한줄평을 조금 길게 적어봅니다");
  await B.getByRole("button", { name: "남기기" }).tap();
  await expect(B.getByTestId("review-list")).toContainText(nickB);
  await step(B, "13-review-written");

  // ── A: 완료 서재 ───────────────────────────────────────────────────────────
  await A.goto(groupUrl);
  await expect(A.getByTestId("hero-list")).toHaveCount(0);
  await expect(A.getByTestId("cover-view").getByText(title)).toBeVisible();
  // 완료 서재 Cover View also paints the real cover art
  await expect(A.getByTestId("cover-book").first().locator("img")).toHaveCount(1);
  await step(A, "14-shelf-cover");
  await measure(A.getByRole("tab", { name: "Bookshelf" }), "서재 · Cover/Bookshelf 토글");

  // Cover ↔ Bookshelf 전환 (터치)
  await A.getByRole("tab", { name: "Bookshelf" }).tap();
  await expect(A.getByTestId("shelf-view")).toBeVisible();
  await step(A, "15-shelf-bookshelf");
  // 가로 스크롤은 책장 안에서만: 문서는 가로로 움직이지 않아야 한다
  const shelfScroll = await A.evaluate(() => {
    const el = document.querySelector('[data-testid="shelf-view"]') as HTMLElement | null;
    return {
      docScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      shelfScrollable: !!el && el.scrollWidth > el.clientWidth,
      overscrollX: el ? getComputedStyle(el).overscrollBehaviorX : null,
    };
  });
  expect(shelfScroll.docScrollsX, "bookshelf must not push the document sideways").toBe(false);

  await A.getByRole("tab", { name: "Cover" }).tap();
  await expect(A.getByTestId("cover-view")).toBeVisible();

  // ── A: 리뷰 확인/작성 ──────────────────────────────────────────────────────
  await A.goto(bookUrl);
  await expect(A.getByTestId("review-list")).toContainText(nickB);
  await A.getByLabel("별점", { exact: true }).selectOption("3");
  await A.getByLabel("한줄평").fill("무난했다");
  await A.getByRole("button", { name: "남기기" }).tap();
  await expect(A.getByTestId("avg-rating")).toHaveText("4");
  await step(A, "16-a-review");

  // ── A: 통계 확인 ───────────────────────────────────────────────────────────
  await A.goto(`${groupUrl}/stats`);
  await expect(A.getByTestId("stat-books")).toContainText("1");
  await expect(A.getByTestId("stat-avg")).toContainText("4");
  await step(A, "17-stats");

  console.log("\n── mobile reachability ──\n" + reachLog.join("\n") + "\n");
  console.log("shelf scroll:", JSON.stringify(shelfScroll));

  await ctxA.close();
  await ctxB.close();
  await browserB.close();
});
