import { apiFetch } from "./api";

export type MonthCount = { month: string; count: number };
export type GenreCount = { genre: string; count: number };
export type StarCount = { rating: number; count: number };
export type MemberStat = {
  user_id: number;
  nickname: string;
  picks: number;
  pages_read: number;
  avg_given: number | null;
};

export type GroupStats = {
  books_completed: number;
  pages_total: number;
  avg_rating: number | null;
  loops: number;
  by_month: MonthCount[];
  by_genre: GenreCount[];
  star_distribution: StarCount[];
  members: MemberStat[];
};

export function getStats(gid: number | string): Promise<GroupStats> {
  return apiFetch<GroupStats>(`/groups/${gid}/stats`);
}
