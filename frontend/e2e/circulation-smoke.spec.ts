import { expect, test, type Page } from "@playwright/test";

const PW = "secret1";

function unique() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function register(page: Page, nickname: string) {
  await page.goto("/register");
  await page.getByLabel("닉네임").fill(nickname);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "가입하기" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });
}

test("core circulation flow across two users", async ({ browser }) => {
  const stamp = unique();
  const nickA = `a_${stamp}`;
  const nickB = `b_${stamp}`;
  const title = `아몬드_${stamp}`;

  // --- User A: sign up + create group ---
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await register(pageA, nickA);

  await pageA.getByLabel("모임 이름").fill(`책바퀴_${stamp}`);
  await pageA.getByLabel("독서기간").fill("14");
  await pageA.getByRole("button", { name: "만들기" }).click();
  await pageA.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = pageA.url();
  const code = (await pageA.getByTestId("invite-code").innerText()).trim();
  expect(code.length).toBeGreaterThanOrEqual(4);

  // --- User B: sign up + join by invite code ---
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await register(pageB, nickB);
  await pageB.getByLabel("초대코드").fill(code);
  await pageB.getByRole("button", { name: "가입하기" }).click();
  await pageB.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });

  // --- User A: register a book ---
  await pageA.goto(groupUrl);
  await pageA.getByRole("link", { name: "+ 책 등록" }).click();
  await pageA.waitForURL(/\/books\/new$/, { timeout: 60_000 });
  await pageA.getByLabel("제목").fill(title);
  await pageA.getByLabel("저자").fill("손원평");
  await pageA.getByLabel("전체 페이지").fill("220");
  await pageA.getByRole("button", { name: "책 등록" }).click();
  await pageA.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });

  // 5) Hero shows the new circulating book
  await expect(pageA.getByTestId("hero-list").getByText(title)).toBeVisible();

  // 6) open detail
  await pageA.getByTestId("hero-book").first().click();
  await pageA.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });

  // 7-8) progress input -> percent updates
  await pageA.getByLabel("현재 페이지").fill("110");
  await pageA.getByRole("button", { name: "진도 저장" }).click();
  await expect(pageA.getByTestId("percent")).toHaveText("50%");

  // 9-10) basic handoff to B -> current holder becomes B
  await pageA.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await expect(pageA.getByTestId("current-holder")).toHaveText(nickB);

  // 11) history shows A -> B
  await expect(pageA.getByTestId("handoff-item").first()).toContainText(nickA);
  await expect(pageA.getByTestId("handoff-item").first()).toContainText(nickB);

  // 12) A now sees read-only controls
  await expect(pageA.getByRole("button", { name: "진도 저장" })).toHaveCount(0);
  await expect(pageA.getByText(/읽는 중/)).toBeVisible();

  // 13) B sees the book as currently reading (holder = B) in the Hero
  await pageB.goto(groupUrl);
  await expect(pageB.getByTestId("hero-list").getByText(title)).toBeVisible();
  await expect(pageB.getByTestId("hero-book").first()).toContainText(nickB);

  // --- Completion: B hands off back to chooser A -> completed ---
  await pageB.getByTestId("hero-book").first().click();
  await pageB.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await pageB.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await expect(pageB.getByText(/한 바퀴 완료/)).toBeVisible();

  // book leaves the circulating Hero and moves into the completed 서재
  await pageB.goto(groupUrl);
  await expect(pageB.getByTestId("hero-list")).toHaveCount(0);
  await expect(pageB.getByTestId("cover-view").getByText(title)).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
