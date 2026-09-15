import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [320, 375, 390, 430];
const seedPath = path.join(__dirname, "extreme-seed.json");

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
    const nm = (el: Element) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`;
    const overflow: string[] = [];
    const smallTouch: string[] = [];
    const smallFont: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (st.position !== "fixed" && !inScroll(el) && r.width > 0 && r.right > vw + 1) overflow.push(`${nm(el)} @${Math.round(r.right)}`);
      if (el.matches('button, select, [role="tab"]') && r.width > 0 && (r.width < 44 || r.height < 44)) smallTouch.push(`${nm(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (el.matches("input, select, textarea") && parseFloat(st.fontSize) < 16) smallFont.push(`${nm(el)} ${st.fontSize}`);
    }
    const bodyScrolls = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { overflow: [...new Set(overflow)], smallTouch: [...new Set(smallTouch)], smallFont: [...new Set(smallFont)], bodyScrolls };
  });
}

test("extreme data stays clean on mobile (shelf / reviews / stats)", async ({ browser }) => {
  test.skip(!fs.existsSync(seedPath), "extreme-seed.json missing — run: backend/.venv/Scripts/python -m scripts.seed_extreme");
  test.setTimeout(240_000);
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as { nickname: string; password: string; groupId: number };
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto("/login");
  await page.getByLabel("닉네임").fill(seed.nickname);
  await page.getByLabel("비밀번호").fill(seed.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });

  const groupUrl = `/groups/${seed.groupId}`;

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 820 });

    // group home (Cover default) — Hero(12) + 서재(24) + members(12)
    await page.goto(groupUrl);
    await page.waitForLoadState("networkidle");
    let a = await audit(page);
    expect(a.overflow, `home @${width}: ${a.overflow.join(", ")}`).toEqual([]);
    expect(a.smallTouch, `home touch @${width}: ${a.smallTouch.join(", ")}`).toEqual([]);
    expect(a.bodyScrolls, `home body-scroll @${width}`).toBe(false);

    // Bookshelf view — internal scroll only, body must not scroll
    await page.getByRole("tab", { name: "Bookshelf" }).click();
    await expect(page.getByTestId("shelf-view")).toBeVisible();
    a = await audit(page);
    expect(a.overflow, `shelf @${width}: ${a.overflow.join(", ")}`).toEqual([]);
    expect(a.bodyScrolls, `shelf body-scroll @${width}`).toBe(false);
    const shelfScrolls = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="shelf-view"]') as HTMLElement | null;
      return el ? el.scrollWidth > el.clientWidth : false;
    });
    expect(shelfScrolls, `shelf internal-scroll @${width}`).toBe(true);

    // stats
    await page.goto(`${groupUrl}/stats`);
    await page.waitForLoadState("networkidle");
    a = await audit(page);
    expect(a.overflow, `stats @${width}: ${a.overflow.join(", ")}`).toEqual([]);
    expect(a.bodyScrolls, `stats body-scroll @${width}`).toBe(false);
  }

  // completed book detail (long reviews) at 320
  await page.setViewportSize({ width: 320, height: 820 });
  const feed = await page.request.get(`http://localhost:8000/groups/${seed.groupId}/books?status=completed`);
  const completedBooks = (await feed.json()) as Array<{ id: number }>;
  expect(completedBooks.length).toBeGreaterThan(0);
  await page.goto(`${groupUrl}/books/${completedBooks[0].id}`);
  await page.waitForLoadState("networkidle");
  const a = await audit(page);
  expect(a.overflow, `completed-detail @320: ${a.overflow.join(", ")}`).toEqual([]);
  expect(a.smallTouch, `completed-detail touch @320: ${a.smallTouch.join(", ")}`).toEqual([]);
  expect(a.smallFont, `completed-detail font @320: ${a.smallFont.join(", ")}`).toEqual([]);
  await expect(page.getByTestId("review-list")).toBeVisible();

  await ctx.close();
});
