import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthForm from "./AuthForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const login = vi.fn().mockResolvedValue({ id: 1, nickname: "neo" });
const register = vi.fn().mockResolvedValue({ id: 2, nickname: "trin" });
vi.mock("@/lib/auth", () => ({
  login: (...args: unknown[]) => login(...args),
  register: (...args: unknown[]) => register(...args),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    login.mockClear();
    register.mockClear();
    push.mockClear();
  });

  it("calls login and redirects to /groups", async () => {
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText("닉네임"), "neo");
    await userEvent.type(screen.getByLabelText("비밀번호"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(login).toHaveBeenCalledWith("neo", "secret1");
    expect(push).toHaveBeenCalledWith("/groups");
  });

  it("calls register in register mode", async () => {
    render(<AuthForm mode="register" />);
    await userEvent.type(screen.getByLabelText("닉네임"), "trin");
    await userEvent.type(screen.getByLabelText("비밀번호"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(register).toHaveBeenCalledWith("trin", "secret1");
  });
});
