import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookDetail } from "@/lib/books";
import HandoffPanel from "./HandoffPanel";

const updateProgress = vi.fn().mockResolvedValue({});
const handoff = vi.fn().mockResolvedValue({});
vi.mock("@/lib/books", () => ({
  updateProgress: (...a: unknown[]) => updateProgress(...a),
  handoff: (...a: unknown[]) => handoff(...a),
}));

const base: BookDetail = {
  id: 9,
  group_id: 1,
  title: "아몬드",
  author: "손원평",
  genre: "",
  cover_url: null,
  total_pages: 220,
  status: "circulating",
  current_page: 100,
  current_holder_user_id: 1,
  chooser_user_id: 1,
  due_date: null,
  completed_at: null,
  percent: 45,
  chooser: { user_id: 1, nickname: "민재" },
  current_holder: { user_id: 1, nickname: "민재" },
  next_user: { user_id: 2, nickname: "수진" },
  rotation_path: [
    { user_id: 1, nickname: "민재" },
    { user_id: 2, nickname: "수진" },
    { user_id: 3, nickname: "지아" },
  ],
  history: [],
};

describe("HandoffPanel", () => {
  beforeEach(() => {
    updateProgress.mockClear();
    handoff.mockClear();
  });

  it("saves progress for the current holder", async () => {
    render(<HandoffPanel detail={base} isHolder onChanged={vi.fn()} />);
    const input = screen.getByLabelText("현재 페이지");
    await userEvent.clear(input);
    await userEvent.type(input, "150");
    await userEvent.click(screen.getByRole("button", { name: "진도 저장" }));
    expect(updateProgress).toHaveBeenCalledWith(9, 150);
  });

  it("hands off with default order and with manual override", async () => {
    render(<HandoffPanel detail={base} isHolder onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /다음 사람에게 전달/ }));
    expect(handoff).toHaveBeenCalledWith(9, {});

    await userEvent.selectOptions(screen.getByLabelText("다음 독자 바꾸기"), "3");
    await userEvent.click(screen.getByRole("button", { name: /다음 사람에게 전달/ }));
    expect(handoff).toHaveBeenLastCalledWith(9, { manual_to_user_id: 3 });
  });

  it("shows a read-only note when not the current holder", () => {
    render(<HandoffPanel detail={base} isHolder={false} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "진도 저장" })).not.toBeInTheDocument();
    expect(screen.getByText(/읽는 중/)).toBeInTheDocument();
  });
});
