import { expect, test, type Page } from "@playwright/test";

/**
 * Cover art: the three states a pasted cover_url can end in.
 *
 * A same-origin asset stands in for "a real cover that loads" — the suite must
 * not depend on an outside host being reachable.
 */

const PW = "secret1";

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function addBook(page: Page, groupUrl: string, title: string, coverUrl: string) {
  await page.goto(`${groupUrl}/books/new`);
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("저자").fill("작가");
  await page.getByLabel("전체 페이지").fill("200");
  if (coverUrl) await page.getByLabel("표지 URL").fill(coverUrl);
  await page.getByRole("button", { name: "책 등록" }).click();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
}

/** Opens the detail page of the book with this title from the hero list. */
async function openDetail(page: Page, groupUrl: string, title: string) {
  await page.goto(groupUrl);
  await page.getByTestId("hero-book").filter({ hasText: title }).click();
  await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
}

const coverBox = (page: Page) => page.getByTestId("detail-cover");
const coverArt = (page: Page) => page.getByTestId("detail-cover").locator("img");

test("cover art renders, falls back, and never shifts the layout", async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const stamp = unique();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto("/register");
  await page.getByLabel("닉네임").fill(`cv_${stamp}`);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "가입하기" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });
  await page.getByLabel("모임 이름").fill(`표지_${stamp}`);
  await page.getByLabel("독서기간").fill("14");
  await page.getByRole("button", { name: "만들기" }).click();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = page.url();

  const ok = `표지있음_${stamp}`;
  const broken = `표지깨짐_${stamp}`;
  const none = `표지없음_${stamp}`;
  // 500 chars is the column limit — the longest thing the UI ever has to hold
  const overlong = `${baseURL}/favicon.ico?${"x".repeat(440)}`;

  await addBook(page, groupUrl, ok, `${baseURL}/favicon.ico`);
  await addBook(page, groupUrl, broken, "https://cover.invalid/missing.jpg");
  await addBook(page, groupUrl, none, "");

  // ── a cover that loads ────────────────────────────────────────────────────
  await openDetail(page, groupUrl, ok);
  await expect(coverArt(page)).toHaveCount(1);
  const painted = await coverArt(page).evaluate(
    (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
  );
  expect(painted, "the cover image actually decoded").toBe(true);
  // the art must fill the box by cropping, not by distorting
  await expect(coverArt(page)).toHaveCSS("object-fit", "cover");

  // A fixed-height box with an absolutely positioned image cannot reflow: the
  // box measures the same before and after the image is there.
  const withArt = await coverBox(page).boundingBox();
  await openDetail(page, groupUrl, none);
  const withoutArt = await coverBox(page).boundingBox();
  expect(withArt!.height, "cover box height is independent of the image").toBe(
    withoutArt!.height,
  );

  // ── no URL: the gradient placeholder stays ────────────────────────────────
  await expect(coverArt(page)).toHaveCount(0);
  await expect(coverBox(page)).toBeVisible();

  // ── a URL that 404s / never resolves: fall back, no broken image ──────────
  await openDetail(page, groupUrl, broken);
  await expect(coverArt(page), "a failed load is removed, not left broken").toHaveCount(0);
  await expect(coverBox(page)).toBeVisible();
  const boxAfterFailure = await coverBox(page).boundingBox();
  expect(boxAfterFailure!.height).toBe(withoutArt!.height);

  // ── an overlong URL must not widen anything ───────────────────────────────
  await addBook(page, groupUrl, `표지긴주소_${stamp}`, overlong);
  await openDetail(page, groupUrl, `표지긴주소_${stamp}`);
  const docScrollsX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(docScrollsX, "a 500-char cover URL must not push the page sideways").toBe(false);

  await ctx.close();
});
