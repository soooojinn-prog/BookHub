import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BookForm from "./BookForm";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const createBook = vi.fn().mockResolvedValue({ id: 5 });
vi.mock("@/lib/books", () => ({
  createBook: (...a: unknown[]) => createBook(...a),
}));

describe("BookForm", () => {
  beforeEach(() => {
    createBook.mockClear();
    push.mockClear();
  });

  it("submits a new book to the group", async () => {
    render(<BookForm groupId="3" />);
    await userEvent.type(screen.getByLabelText("제목"), "아몬드");
    await userEvent.type(screen.getByLabelText("저자"), "손원평");
    await userEvent.type(screen.getByLabelText("전체 페이지"), "220");
    await userEvent.click(screen.getByRole("button", { name: "책 등록" }));
    expect(createBook).toHaveBeenCalledWith("3", {
      title: "아몬드",
      author: "손원평",
      genre: "",
      total_pages: 220,
      cover_url: null,
    });
    expect(push).toHaveBeenCalledWith("/groups/3");
  });

  it("shows validation error and does not submit when required fields missing", async () => {
    render(<BookForm groupId="3" />);
    await userEvent.type(screen.getByLabelText("제목"), "아몬드");
    await userEvent.click(screen.getByRole("button", { name: "책 등록" }));
    expect(createBook).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
