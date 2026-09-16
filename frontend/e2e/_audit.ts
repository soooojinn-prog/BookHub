import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared mobile audit helpers.
 *
 * Not a spec file (leading underscore + no `.spec.`), so Playwright's default
 * testMatch ignores it and the specs below import from it.
 */

export type Audit = {
  /** elements painted past the right viewport edge (excludes fixed + scroll containers) */
  overflow: string[];
  /** button/select/tab/link smaller than 44px in either dimension */
  smallTouch: string[];
  /** form controls under 16px — iOS focus auto-zoom */
  smallFont: string[];
  /** visible interactive elements cut off horizontally by the viewport */
  offscreenInteractive: string[];
  /** visible fixed/absolute elements escaping the viewport box */
  escapingLayer: string[];
  /** document itself scrolls horizontally */
  bodyScrollX: boolean;
  /** widest offender, for reporting */
  docScrollWidth: number;
  viewportWidth: number;
};

const INTERACTIVE = 'a[href], button, input, select, textarea, [role="tab"], [tabindex]:not([tabindex="-1"])';

/**
 * Collects every mobile layout defect class the stage-4 brief asks for in one
 * pass, so a screen is judged from a single real render rather than N reloads.
 */
export async function audit(page: Page): Promise<Audit> {
  return page.evaluate((INTERACTIVE) => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // An element inside a scroll container (or a clipped one) is allowed to sit
    // past the viewport: the bookshelf scrolls horizontally on purpose.
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
    const hidden = (el: Element, st: CSSStyleDeclaration) =>
      st.display === "none" ||
      st.visibility === "hidden" ||
      parseFloat(st.opacity) === 0 ||
      el.closest('[aria-hidden="true"]') !== null;

    const overflow: string[] = [];
    const smallTouch: string[] = [];
    const smallFont: string[] = [];
    const offscreenInteractive: string[] = [];
    const escapingLayer: string[] = [];

    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const st = getComputedStyle(el);
      if (hidden(el, st)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const scrolled = inScroll(el);

      if (st.position !== "fixed" && !scrolled && r.width > 0 && r.right > vw + 1) {
        overflow.push(`${name(el)} @${Math.round(r.right)}>${vw}`);
      }

      if (el.matches(INTERACTIVE)) {
        // WCAG 2.5.8 exempts a link that sits inside a sentence — its size is
        // set by the running text, and padding it to 44px would wreck the
        // paragraph. A link that stands on its own gets no such exemption.
        const inlineInSentence =
          el.tagName === "A" &&
          st.display.startsWith("inline") &&
          !!el.parentElement &&
          Array.from(el.parentElement.childNodes).some(
            (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0,
          );
        if (!inlineInSentence && r.width > 0 && (r.width < 44 || r.height < 44)) {
          smallTouch.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        // Cut off horizontally = the user cannot fully tap/read it. Elements in a
        // scroll container are reachable by scrolling that container.
        if (!scrolled && st.position !== "fixed" && (r.left < -1 || r.right > vw + 1)) {
          offscreenInteractive.push(`${name(el)} [${Math.round(r.left)},${Math.round(r.right)}] vw=${vw}`);
        }
      }

      if (el.matches("input, select, textarea") && parseFloat(st.fontSize) < 16) {
        smallFont.push(`${name(el)} ${st.fontSize}`);
      }

      // A visible fixed/absolute layer that leaves the viewport box is content
      // the mobile user can never reach (no scrolling brings a fixed layer back).
      if (st.position === "fixed" || st.position === "absolute") {
        if (!scrolled && (r.left < -1 || r.right > vw + 1 || (st.position === "fixed" && (r.top < -1 || r.bottom > vh + 1)))) {
          escapingLayer.push(`${name(el)} ${st.position} [${Math.round(r.left)},${Math.round(r.right)}]`);
        }
      }
    }

    return {
      overflow: [...new Set(overflow)],
      smallTouch: [...new Set(smallTouch)],
      smallFont: [...new Set(smallFont)],
      offscreenInteractive: [...new Set(offscreenInteractive)],
      escapingLayer: [...new Set(escapingLayer)],
      bodyScrollX: document.documentElement.scrollWidth > vw + 1,
      docScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: vw,
    };
  }, INTERACTIVE);
}

/** Asserts the whole audit at once so a failure names the screen and viewport. */
export function expectClean(a: Audit, where: string) {
  expect(a.overflow, `${where} · horizontal overflow`).toEqual([]);
  expect(a.smallTouch, `${where} · touch target <44px`).toEqual([]);
  expect(a.smallFont, `${where} · control font <16px (iOS zoom)`).toEqual([]);
  expect(a.offscreenInteractive, `${where} · interactive element off-viewport`).toEqual([]);
  expect(a.escapingLayer, `${where} · fixed/absolute layer escapes viewport`).toEqual([]);
  expect(
    a.bodyScrollX,
    `${where} · document scrolls horizontally (${a.docScrollWidth}>${a.viewportWidth})`,
  ).toBe(false);
}

/**
 * Distance (px) from the top of the page to an element, and how many screenfuls
 * down that is. The stage-4 brief asks whether the important button is findable
 * without hunting, which is a measurement, not an opinion.
 *
 * Takes a Locator rather than a CSS string so specs can point at elements the
 * same way they click them (`getByRole`, `:has-text`, …).
 */
export async function reach(target: Locator) {
  // count() does not auto-wait, so measuring right after a navigation silently
  // returned nothing. Wait briefly for the element instead of skipping it.
  try {
    await target.first().waitFor({ state: "attached", timeout: 5_000 });
  } catch {
    return null;
  }
  return target.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    return {
      top: Math.round(top),
      viewportHeight: window.innerHeight,
      screensDown: Math.round((top / window.innerHeight) * 100) / 100,
      pageHeight: document.documentElement.scrollHeight,
    };
  });
}

/**
 * Screenshot artifact under test-results/ (gitignored).
 *
 * Viewport-sized, not fullPage: capturing beyond the viewport makes Chromium
 * re-apply device metrics, and on a mobile context that restore drops touch
 * emulation mid-run (observed: maxTouchPoints 1 → 0 after a few captures).
 */
export async function shot(page: Page, label: string) {
  await page.screenshot({ path: `test-results/mobile/${label}.png` });
}
