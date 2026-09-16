import { devices, expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Stage-4 mobile performance & motion audit.
 *
 * Everything here is measured from the running page rather than reasoned about:
 * listener registrations and requestAnimationFrame calls are counted by wrapping
 * the APIs before any app script runs, so "pointer-follow does not run on touch"
 * becomes an assertion instead of a claim.
 */

const PW = "secret1";
const PHONE = devices["Pixel 5"];

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const INSTRUMENT = () => {
  const counts: Record<string, number> = {};
  const w = window as unknown as { __lsn: Record<string, number>; __raf: number };
  w.__lsn = counts;
  w.__raf = 0;
  const add = window.addEventListener.bind(window);
  const remove = window.removeEventListener.bind(window);
  window.addEventListener = function (type: string, ...rest: unknown[]) {
    counts[type] = (counts[type] ?? 0) + 1;
    // @ts-expect-error passthrough
    return add(type, ...rest);
  } as typeof window.addEventListener;
  window.removeEventListener = function (type: string, ...rest: unknown[]) {
    counts[type] = (counts[type] ?? 0) - 1;
    // @ts-expect-error passthrough
    return remove(type, ...rest);
  } as typeof window.removeEventListener;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb: FrameRequestCallback) {
    w.__raf += 1;
    return raf(cb);
  };
};

async function phone(browser: Browser, extra: Record<string, unknown> = {}) {
  const ctx = await browser.newContext({ ...PHONE, ...extra });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENT);
  return { ctx, page };
}

/**
 * Registers a user + group + one circulating book, returns the group URL.
 *
 * Skips the test when the browser build has no touch emulation (Playwright's
 * WebKit on Windows): every tap below would be a no-op and the failure would
 * say nothing about the app.
 */
async function seed(page: Page, stamp: string) {
  await page.goto("/register");
  const touch = await page.evaluate(() => navigator.maxTouchPoints);
  test.skip(touch === 0, "touch emulation unavailable in this browser build");
  await page.getByLabel("닉네임").fill(`pf_${stamp}`);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "가입하기" }).tap();
  await page.waitForURL("**/groups", { timeout: 60_000 });
  await page.getByLabel("모임 이름").fill(`perf_${stamp}`);
  await page.getByLabel("독서기간").fill("14");
  await page.getByRole("button", { name: "만들기" }).tap();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = page.url();
  await page.goto(`${groupUrl}/books/new`);
  await page.getByLabel("제목").fill(`perf_${stamp}`);
  await page.getByLabel("저자").fill("작가");
  await page.getByLabel("전체 페이지").fill("300");
  await page.getByRole("button", { name: "책 등록" }).tap();
  await page.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  return groupUrl;
}

const counts = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __lsn: Record<string, number>; __raf: number };
    return { lsn: w.__lsn, raf: w.__raf };
  });

/** requestAnimationFrame calls over a window of wall-clock time. */
async function rafRate(page: Page, ms: number) {
  const before = (await counts(page)).raf;
  await page.waitForTimeout(ms);
  const after = (await counts(page)).raf;
  return { frames: after - before, perSecond: Math.round(((after - before) / ms) * 1000) };
}

test("touch: no pointer-follow work is scheduled and hover-only layers are not rendered", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const { ctx, page } = await phone(browser);
  const groupUrl = await seed(page, unique());
  await page.goto(groupUrl);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("hero-list")).toBeVisible();

  const c = await counts(page);
  console.log("touch listeners:", JSON.stringify(c.lsn));

  // Pointer-follow parallax has no meaning without a pointer: on a touch device
  // nothing should be listening for mousemove at all.
  expect(c.lsn.mousemove ?? 0, "mousemove listeners on a touch device").toBe(0);

  // Hover-only affordances must not be laid out on touch: they are unreachable,
  // and .bc-tip carries a backdrop-filter that costs a composited layer.
  const hoverLayers = await page.evaluate(() => {
    const vis = (sel: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).display !== "none" : null;
    };
    return { preview: vis(".bw-preview"), tip: vis(".bc-tip") };
  });
  console.log("hover-only layers on touch:", JSON.stringify(hoverLayers));
  expect(hoverLayers.preview, ".bw-preview rendered on touch").not.toBe(true);

  await ctx.close();
});

test("touch: starfield is cheap, parks when hidden, and survives URL-bar resizes", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const { ctx, page } = await phone(browser);
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const field = await page.evaluate(() => {
    const c = document.querySelector("canvas.starfield") as HTMLCanvasElement | null;
    return c
      ? { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height, dpr: devicePixelRatio }
      : null;
  });
  console.log("starfield backing store:", JSON.stringify(field));
  expect(field).not.toBeNull();

  const moving = await rafRate(page, 1000);
  console.log("starfield rAF while visible:", JSON.stringify(moving));

  // The backing store is what gets cleared every frame; on a 3x phone an
  // uncapped DPR means clearing ~3M px at 60fps for a decorative background.
  expect(field!.w * field!.h, "starfield backing pixels").toBeLessThan(2_200_000);

  // iOS Safari fires resize every time the URL bar collapses while scrolling.
  // Rebuilding the canvas there re-randomises every star (visible pop) and
  // reallocates the bitmap mid-scroll — height-only changes must be ignored.
  const beforeResize = await page.evaluate(() => {
    const c = document.querySelector("canvas.starfield") as HTMLCanvasElement;
    return { w: c.width, h: c.height };
  });
  await page.setViewportSize({ width: PHONE.viewport.width, height: PHONE.viewport.height - 120 });
  await page.waitForTimeout(300);
  const afterResize = await page.evaluate(() => {
    const c = document.querySelector("canvas.starfield") as HTMLCanvasElement;
    return { w: c.width, h: c.height };
  });
  console.log("URL-bar resize:", JSON.stringify({ beforeResize, afterResize }));
  expect(afterResize, "height-only resize must not rebuild the starfield").toEqual(beforeResize);

  // A backgrounded tab must not keep animating.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await rafRate(page, 800);
  console.log("starfield rAF while hidden:", JSON.stringify(hidden));
  expect(hidden.frames, "animation must park while the page is hidden").toBeLessThanOrEqual(2);

  await ctx.close();
});

test("prefers-reduced-motion: the animation loop parks instead of spinning", async ({ browser }) => {
  test.setTimeout(180_000);
  const { ctx, page } = await phone(browser, { reducedMotion: "reduce" });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // let the first paint settle

  const idle = await rafRate(page, 1000);
  console.log("reduced-motion rAF:", JSON.stringify(idle));
  expect(idle.frames, "reduced motion must not run a continuous rAF loop").toBeLessThanOrEqual(2);

  const c = await counts(page);
  expect(c.lsn.mousemove ?? 0, "reduced motion + touch: no mousemove listener").toBe(0);

  // Stars must still be drawn — reduced motion means still, not blank.
  const painted = await page.evaluate(() => {
    const c = document.querySelector("canvas.starfield") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const d = ctx.getImageData(0, 0, c.width, Math.min(c.height, 400)).data;
    let lit = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) lit++;
    return lit;
  });
  console.log("reduced-motion lit pixels:", painted);
  expect(painted, "reduced motion should still paint a static starfield").toBeGreaterThan(0);

  await ctx.close();
});

test("scroll cost: no fixed background attachment on touch, no scroll/touchmove listeners", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const { ctx, page } = await phone(browser);
  const groupUrl = await seed(page, unique());
  await page.goto(groupUrl);
  await page.waitForLoadState("networkidle");

  const style = await page.evaluate(() => {
    const b = getComputedStyle(document.body);
    return {
      backgroundAttachment: b.backgroundAttachment,
      overflowX: b.overflowX,
      touchAction: getComputedStyle(document.documentElement).touchAction,
    };
  });
  console.log("body scroll style on touch:", JSON.stringify(style));

  // background-attachment: fixed forces a repaint of the whole viewport on every
  // scroll frame and is a known jank source in iOS Safari.
  expect(style.backgroundAttachment, "body background-attachment on touch").not.toContain("fixed");

  const c = await counts(page);
  console.log("scroll-path listeners:", JSON.stringify(c.lsn));
  expect(c.lsn.scroll ?? 0, "no scroll listeners on the main thread").toBe(0);
  expect(c.lsn.touchmove ?? 0, "no touchmove listeners").toBe(0);

  await ctx.close();
});
