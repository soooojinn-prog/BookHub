import { expect, test, type Page } from "@playwright/test";

const PW = "secret1";
const WIDTHS = [320, 375, 390, 430];

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Returns class names of elements whose right edge exceeds the viewport,
 * ignoring fixed elements and anything inside an intermediate scroll container
 * (a legitimately horizontally-scrollable region such as the bookshelf).
 * `body`'s own overflow clamp is intentionally ignored so real overflow is still measured.
 */
async function horizontalOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad: string[] = [];
    const inScrollContainer = (el: Element): boolean => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
        p = p.parentElement;
      }
      return false;
    };
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const st = getComputedStyle(el);
      if (st.position === "fixed" || st.display === "none") continue;
      if (inScrollContainer(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1) {
        bad.push(`${(el.className || el.tagName).toString().slice(0, 40)} @${Math.round(r.right)}>${vw}`);
      }
    }
    return bad.slice(0, 6);
  });
}

test("no horizontal overflow on key screens at mobile widths", async ({ browser }) => {
  const stamp = unique();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // seed data: user, group, two books, complete one, one review
  await page.goto("/register");
  await page.getByLabel("닉네임").fill(`m_${stamp}`);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "가입하기" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });
  await page.getByLabel("모임 이름").fill(`모임_${stamp}`);
  await page.getByLabel("독서기간").fill("14");
  await page.getByRole("button", { name: "만들기" }).click();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = page.url();

  async function addBook(title: string) {
    await page.goto(`${groupUrl}/books/new`);
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("저자").fill("어떤 저자입니다 조금 긴 이름");
    await page.getByLabel("전체 페이지").fill("640");
    await page.getByRole("button", { name: "책 등록" }).click();
    await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  }
  await addBook(`완독한책_${stamp}`);
  await addBook(`돌고있는책_${stamp}`);

  // complete the first book (solo group => handoff returns to chooser => completed)
  await page.getByTestId("hero-book").last().click();
  await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await page.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await expect(page.getByText(/한 바퀴 완료/)).toBeVisible();
  await page.getByLabel("별점").selectOption("5");
  await page.getByLabel("한줄평").fill("정말 좋았던 책, 한줄평도 조금 길게 적어봅니다");
  await page.getByRole("button", { name: "남기기" }).click();
  const completedBookUrl = page.url();

  const circulatingBookUrl = await (async () => {
    await page.goto(groupUrl);
    await page.getByTestId("hero-book").first().click();
    await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
    return page.url();
  })();

  const urls: [string, string][] = [
    ["/login", "/login"],
    ["/register", "/register"],
    ["/groups", "/groups"],
    [groupUrl, "group home"],
    [circulatingBookUrl, "book detail (circulating)"],
    [completedBookUrl, "book detail (completed)"],
    [`${groupUrl}/stats`, "stats"],
    [`${groupUrl}/books/new`, "book new"],
  ];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });
    for (const [url, label] of urls) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const overflow = await horizontalOverflow(page);
      expect(overflow, `${label} @ ${width}px overflowing: ${overflow.join(", ")}`).toEqual([]);
    }
  }

  await ctx.close();
});
