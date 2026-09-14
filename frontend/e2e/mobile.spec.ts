import { expect, test, type Page } from "@playwright/test";

const PW = "secret1";
const WIDTHS = [320, 360, 375, 390, 393, 412, 430];

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Per-screen mobile checks:
 * - overflow: elements past the viewport (ignoring fixed + intermediate scroll containers)
 * - smallTouch: button/select/tab under 44px in either dimension
 * - smallFont: form controls under 16px (iOS focus zoom)
 */
async function audit(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const inScroll = (el: Element): boolean => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
        p = p.parentElement;
      }
      return false;
    };
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`;
    const overflow: string[] = [];
    const smallTouch: string[] = [];
    const smallFont: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (st.position !== "fixed" && !inScroll(el) && r.width > 0 && r.right > vw + 1) {
        overflow.push(`${name(el)} @${Math.round(r.right)}>${vw}`);
      }
      if (el.matches('button, select, [role="tab"]') && r.width > 0 && (r.width < 44 || r.height < 44)) {
        smallTouch.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      if (el.matches("input, select, textarea") && parseFloat(st.fontSize) < 16) {
        smallFont.push(`${name(el)} ${st.fontSize}`);
      }
    }
    return {
      overflow: [...new Set(overflow)],
      smallTouch: [...new Set(smallTouch)],
      smallFont: [...new Set(smallFont)],
    };
  });
}

test("mobile UX is clean across viewports (overflow / touch / font)", async ({ browser }) => {
  test.setTimeout(300_000); // 7 viewports x 8 screens is navigation-heavy
  const stamp = unique();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

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
    await page.getByLabel("저자").fill("아주 긴 저자 이름을 가진 어떤 작가님");
    await page.getByLabel("전체 페이지").fill("640");
    await page.getByRole("button", { name: "책 등록" }).click();
    await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  }
  await addBook(`완독한매우긴제목의책_${stamp}_입니다`);
  await addBook(`순환중인책_${stamp}`);

  await page.getByTestId("hero-book").last().click();
  await page.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await page.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await page.getByLabel("별점").selectOption("5");
  await page.getByLabel("한줄평").fill("정말 좋았던 책, 한줄평을 조금 길게 적어봅니다");
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
      const a = await audit(page);
      expect(a.overflow, `${label} @${width} overflow`).toEqual([]);
      expect(a.smallTouch, `${label} @${width} touch<44`).toEqual([]);
      expect(a.smallFont, `${label} @${width} font<16`).toEqual([]);
    }
  }

  await ctx.close();
});
