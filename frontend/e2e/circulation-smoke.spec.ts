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

async function loginAs(page: Page, nickname: string) {
  await page.goto("/login");
  await page.getByLabel("닉네임").fill(nickname);
  await page.getByLabel("비밀번호").fill(PW);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/groups", { timeout: 60_000 });
}

test("full MVP flow: circulation, completion, reviews, stats", async ({ browser }) => {
  const stamp = unique();
  const nickA = `a_${stamp}`;
  const nickB = `b_${stamp}`;
  const title = `아몬드_${stamp}`;

  // A: sign up + create group
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await register(pageA, nickA);
  await pageA.getByLabel("모임 이름").fill(`책바퀴_${stamp}`);
  await pageA.getByLabel("독서기간").fill("14");
  await pageA.getByRole("button", { name: "만들기" }).click();
  await pageA.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });
  const groupUrl = pageA.url();
  const code = (await pageA.getByTestId("invite-code").innerText()).trim();

  // B: sign up + join
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await register(pageB, nickB);
  await pageB.getByLabel("초대코드").fill(code);
  await pageB.getByRole("button", { name: "가입하기" }).click();
  await pageB.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });

  // A: register a book
  await pageA.goto(groupUrl);
  await pageA.getByRole("link", { name: "+ 책 등록" }).click();
  await pageA.waitForURL(/\/books\/new$/, { timeout: 60_000 });
  await pageA.getByLabel("제목").fill(title);
  await pageA.getByLabel("저자").fill("손원평");
  await pageA.getByLabel("전체 페이지").fill("220");
  await pageA.getByRole("button", { name: "책 등록" }).click();
  await pageA.waitForURL(/\/groups\/\d+$/, { timeout: 60_000 });

  // Hero shows circulating book
  await expect(pageA.getByTestId("hero-list").getByText(title)).toBeVisible();

  // A: open detail, set progress -> 50%
  await pageA.getByTestId("hero-book").first().click();
  await pageA.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  const bookUrl = pageA.url();
  await pageA.getByLabel("현재 페이지").fill("110");
  await pageA.getByRole("button", { name: "진도 저장" }).click();
  await expect(pageA.getByTestId("percent")).toHaveText("50%");

  // A -> B handoff
  await pageA.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await expect(pageA.getByTestId("current-holder")).toHaveText(nickB);
  await expect(pageA.getByTestId("handoff-item").first()).toContainText(nickA);
  await expect(pageA.getByTestId("handoff-item").first()).toContainText(nickB);
  await expect(pageA.getByRole("button", { name: "진도 저장" })).toHaveCount(0); // read-only for A

  // B: sees it as current reading, opens detail, updates progress, hands back to A -> completes
  await pageB.goto(groupUrl);
  await expect(pageB.getByTestId("hero-list").getByText(title)).toBeVisible();
  await expect(pageB.getByTestId("hero-book").first()).toContainText(nickB);
  await pageB.getByTestId("hero-book").first().click();
  await pageB.waitForURL(/\/books\/\d+$/, { timeout: 60_000 });
  await pageB.getByLabel("현재 페이지").fill("200");
  await pageB.getByRole("button", { name: "진도 저장" }).click();
  await expect(pageB.getByTestId("percent")).toHaveText("91%");
  await pageB.getByRole("button", { name: /다음 사람에게 전달/ }).click();
  await expect(pageB.getByText(/한 바퀴 완료/)).toBeVisible();

  // B: leave a review (rating 5) on the completed book
  await pageB.getByLabel("별점").selectOption("5");
  await pageB.getByLabel("한줄평").fill("성장의 밤");
  await pageB.getByRole("button", { name: "남기기" }).click();
  await expect(pageB.getByTestId("review-list")).toContainText(nickB);

  // A: leave a review (rating 3) -> average becomes 4
  await pageA.goto(bookUrl);
  await pageA.getByLabel("별점").selectOption("3");
  await pageA.getByLabel("한줄평").fill("무난했다");
  await pageA.getByRole("button", { name: "남기기" }).click();
  await expect(pageA.getByTestId("avg-rating")).toHaveText("4");

  // Hero no longer shows it; it moved into the completed 서재
  await pageA.goto(groupUrl);
  await expect(pageA.getByTestId("hero-list")).toHaveCount(0);
  await expect(pageA.getByTestId("cover-view").getByText(title)).toBeVisible();

  // Cover <-> Bookshelf toggle
  await pageA.getByRole("tab", { name: "Bookshelf" }).click();
  await expect(pageA.getByTestId("shelf-view")).toBeVisible();
  await pageA.getByRole("tab", { name: "Cover" }).click();
  await expect(pageA.getByTestId("cover-view")).toBeVisible();

  // Stats reflect the completed loop
  await pageA.goto(`${groupUrl}/stats`);
  await expect(pageA.getByTestId("stat-books")).toContainText("1");
  await expect(pageA.getByTestId("stat-pages")).toContainText("220");
  await expect(pageA.getByTestId("stat-loops")).toContainText("1");
  await expect(pageA.getByTestId("stat-avg")).toContainText("4");

  await ctxA.close();
  await ctxB.close();
});
