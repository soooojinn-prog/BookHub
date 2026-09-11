import { apiFetch } from "./api";
import type { Group, GroupDetail } from "./types";

export function myGroups(): Promise<Group[]> {
  return apiFetch<Group[]>("/groups");
}

export function createGroup(name: string, readingPeriodDays: number): Promise<Group> {
  return apiFetch<Group>("/groups", {
    method: "POST",
    body: JSON.stringify({ name, reading_period_days: readingPeriodDays }),
  });
}

export function joinGroup(inviteCode: string): Promise<Group> {
  return apiFetch<Group>("/groups/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export function getGroup(id: number | string): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/groups/${id}`);
}
