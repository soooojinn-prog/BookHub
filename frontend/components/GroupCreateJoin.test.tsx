import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GroupCreateJoin from "./GroupCreateJoin";

const createGroup = vi.fn().mockResolvedValue({ id: 7, name: "책바퀴", invite_code: "ABCD1234", reading_period_days: 14 });
const joinGroup = vi.fn().mockResolvedValue({ id: 8, name: "g", invite_code: "WXYZ9999", reading_period_days: 14 });
vi.mock("@/lib/groups", () => ({
  createGroup: (...a: unknown[]) => createGroup(...a),
  joinGroup: (...a: unknown[]) => joinGroup(...a),
}));

describe("GroupCreateJoin", () => {
  beforeEach(() => {
    createGroup.mockClear();
    joinGroup.mockClear();
  });

  it("creates a group with name and reading period", async () => {
    const onChanged = vi.fn();
    render(<GroupCreateJoin onChanged={onChanged} />);
    await userEvent.type(screen.getByLabelText("모임 이름"), "책바퀴");
    await userEvent.click(screen.getByRole("button", { name: "만들기" }));
    expect(createGroup).toHaveBeenCalledWith("책바퀴", 14);
  });

  it("joins a group by invite code", async () => {
    const onChanged = vi.fn();
    render(<GroupCreateJoin onChanged={onChanged} />);
    await userEvent.type(screen.getByLabelText("초대코드"), "abcd1234");
    await userEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(joinGroup).toHaveBeenCalledWith("ABCD1234");
  });
});
