import { apiFetch } from "./api";

export type BookSummary = {
  id: number;
  group_id: number;
  title: string;
  author: string;
  genre: string;
  cover_url: string | null;
  total_pages: number;
  status: "circulating" | "completed";
  current_page: number;
  current_holder_user_id: number | null;
  chooser_user_id: number;
  due_date: string | null;
  completed_at: string | null;
};

export type Person = { user_id: number; nickname: string };

export type HandoffEvent = {
  from_user_id: number | null;
  to_user_id: number;
  page_at_handoff: number | null;
  is_manual: boolean;
  note: string | null;
  created_at: string;
};

export type ReviewBrief = { nickname: string; one_liner: string };

export type BookFeed = BookSummary & {
  percent: number;
  current_holder: Person | null;
  next_user: Person | null;
  avg_rating: number | null;
  review_count: number;
  recent_review: ReviewBrief | null;
  readers: Person[];
};

export type BookDetail = BookSummary & {
  percent: number;
  chooser: Person | null;
  current_holder: Person | null;
  next_user: Person | null;
  rotation_path: Person[];
  history: HandoffEvent[];
};

export type BookCreateInput = {
  title: string;
  author: string;
  genre: string;
  total_pages: number;
  cover_url?: string | null;
};

export function listBooks(gid: number | string, status?: "circulating" | "completed"): Promise<BookFeed[]> {
  const q = status ? `?status=${status}` : "";
  return apiFetch<BookFeed[]>(`/groups/${gid}/books${q}`);
}

export function createBook(gid: number | string, data: BookCreateInput): Promise<BookSummary> {
  return apiFetch<BookSummary>(`/groups/${gid}/books`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getBook(id: number | string): Promise<BookDetail> {
  return apiFetch<BookDetail>(`/books/${id}`);
}

export function updateProgress(id: number | string, currentPage: number): Promise<BookDetail> {
  return apiFetch<BookDetail>(`/books/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ current_page: currentPage }),
  });
}

export function handoff(
  id: number | string,
  body: { manual_to_user_id?: number; note?: string } = {},
): Promise<BookDetail> {
  return apiFetch<BookDetail>(`/books/${id}/handoff`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * A cover URL we are willing to put in an <img src>, or null.
 *
 * cover_url is free text a member pasted, so it can be empty, whitespace, a
 * broken string, or a non-http scheme. Anything that is not an absolute
 * http(s) URL falls back to the gradient rather than producing a broken image.
 */
export function coverSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Deterministic cool gradient per book (steel/aurora family), no external image. */
export function coverGradient(seed: number): string {
  const palettes = [
    ["#5f8298", "#2c4655"],
    ["#4f9d82", "#25493f"],
    ["#6f7bb2", "#373f6b"],
    ["#8a6f9c", "#453552"],
    ["#4d7f95", "#284c59"],
    ["#5a5a83", "#343455"],
  ];
  const [a, b] = palettes[seed % palettes.length];
  return `linear-gradient(158deg, ${a}, ${b})`;
}
