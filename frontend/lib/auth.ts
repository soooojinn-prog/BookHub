import { apiFetch } from "./api";
import type { User } from "./types";

export function register(nickname: string, password: string): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nickname, password }),
  });
}

export function login(nickname: string, password: string): Promise<User> {
  return apiFetch<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ nickname, password }),
  });
}

export function me(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
