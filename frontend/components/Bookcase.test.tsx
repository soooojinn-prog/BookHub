import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BookFeed } from "@/lib/books";
import Bookcase from "./Bookcase";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const book: BookFeed = {
  id: 1,
  group_id: 1,
  title: "데미안",
  author: "헤세",
  genre: "소설",
  cover_url: null,
  total_pages: 220,
  status: "completed",
  current_page: 0,
  current_holder_user_id: null,
  chooser_user_id: 1,
  due_date: null,
  completed_at: "2026-09-01T00:00:00Z",
  percent: 100,
  current_holder: null,
  next_user: null,
  avg_rating: 4.5,
  review_count: 2,
  recent_review: { nickname: "민재", one_liner: "성장의 밤" },
  readers: [{ user_id: 1, nickname: "민재" }],
};

describe("Bookcase", () => {
  it("toggles between Cover and Bookshelf views", async () => {
    render(<Bookcase books={[book]} groupId="1" />);
    expect(screen.getByTestId("cover-view")).toBeInTheDocument();
    expect(screen.queryByTestId("shelf-view")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Bookshelf" }));
    expect(screen.getByTestId("shelf-view")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-view")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Cover" }));
    expect(screen.getByTestId("cover-view")).toBeInTheDocument();
  });
});
