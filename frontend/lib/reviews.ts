import { apiFetch } from "./api";

export type Review = {
  user_id: number;
  nickname: string;
  rating: number;
  one_liner: string;
  created_at: string;
};

export function listReviews(bookId: number | string): Promise<Review[]> {
  return apiFetch<Review[]>(`/books/${bookId}/reviews`);
}

export function upsertReview(
  bookId: number | string,
  rating: number,
  oneLiner: string,
): Promise<Review> {
  return apiFetch<Review>(`/books/${bookId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, one_liner: oneLiner }),
  });
}
