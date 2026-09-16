import { expect, test } from "@playwright/test";

import { audit, expectClean, shot } from "./_audit";

/**
 * Per-screen mobile layout audit across the viewport matrix.
 *
 * Checks (all measured from a real render, see e2e/_audit.ts):
 *  - horizontal overflow past the viewport
 *  - the document itself scrolling sideways
 *  - interactive elements cut off by the viewport edge
 *  - fixed/absolute layers escaping the viewport box
 *  - touch targets under 44px, form controls under 16px (iOS focus zoom)
 *
 * The fixture is deliberately long-text (100-char title, long author/genre,
 * 20-char nickname) and is seeded by the spec itself, so this runs anywhere —
 * unlike mobile-extreme.spec.ts, which needs a pre-seeded database.
 */

const PW = "secret1";
const WIDTHS = [320, 360, 375, 390, 393, 412, 430];
/** Screenshot artifacts at the boundary widths only — enough to eyeball, cheap to produce. */
const SHOT_WIDTHS = new Set([320, 430]);

const LONG_TITLE =
  "아주 긴 제목을 가진 책 — 한 문장으로 끝나지 않고 계속 이어지는 부제까지 달고 있는 어느 밤의 도서관 이야기 완전판";
const LONG_AUTHOR = "아주 긴 이름을 가진 어느 작가님과 공동 저자들";
const LONG_GENRE = "장편소설·에세이·회고록";

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

test("mobile layout is clean across viewports (overflow / touch / font / off-viewport)", async ({
  browser,
}) => {
  test.setTimeout(420_000); // 7 viewports x 8 screens is navigation-heavy
  const stamp = unique();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 20-char nickname — the longest the UI has to lay out in the header + rotation chips
  const nick = `길고긴닉네임테스트유저${stamp}`.slice(0, 20);
  await page.goto("/register");
  await page.getByLabel("닉네임").fill(nick);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "가입하기" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });
  await page.getByLabel("모임 이름").fill(`아주 긴 이름을 가진 독서모임_${stamp}`);
  await page.getByLabel("독서기간").fill("14");
  await page.getByRole("button", { name: "만들기" }).click();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = page.url();

  async function addBook(title: string) {
    await page.goto(`${groupUrl}/books/new`);
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("저자").fill(LONG_AUTHOR);
    await page.getByLabel("장르").fill(LONG_GENRE);
    await page.getByLabel("전체 페이지").fill("640");
    await page.getByRole("button", { name: "책 등록" }).click();
    await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  }
  await addBook(`${LONG_TITLE}_${stamp}`.slice(0, 100));
  await addBook(`순환중인책_${stamp}`);

  // Drive one book to completion so the 완료 서재 + 리뷰 UI are on the matrix too.
  await page.getByTestId("hero-book").last().click();
  await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await page.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await page.getByLabel("별점", { exact: true }).selectOption("5");
  await page
    .getByLabel("한줄평")
    .fill("정말 좋았던 책, 한줄평도 줄바꿈을 확인할 수 있을 만큼 길게 적어봅니다");
  await page.getByRole("button", { name: "남기기" }).click();
  const completedUrl = page.url();

  await page.goto(groupUrl);
  await page.getByTestId("hero-book").first().click();
  await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  const circulatingUrl = page.url();

  const screens: [string, string][] = [
    ["/login", "login"],
    ["/register", "register"],
    ["/groups", "groups-list"],
    [groupUrl, "group-home"],
    [`${groupUrl}/books/new`, "book-new"],
    [circulatingUrl, "book-detail-circulating"],
    [completedUrl, "book-detail-completed"],
    [`${groupUrl}/stats`, "stats"],
  ];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    for (const [url, label] of screens) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      expectClean(await audit(page), `${label} @${width}`);
      if (SHOT_WIDTHS.has(width)) await shot(page, `matrix/${width}-${label}`);
    }
  }

  // The bookshelf view scrolls horizontally on purpose — verify that stays
  // inside the shelf and never turns into a sideways page scroll.
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(groupUrl);
  await page.getByRole("tab", { name: "Bookshelf" }).click();
  await expect(page.getByTestId("shelf-view")).toBeVisible();
  expectClean(await audit(page), "group-home/bookshelf @320");
  await shot(page, "matrix/320-bookshelf");

  await ctx.close();
});
