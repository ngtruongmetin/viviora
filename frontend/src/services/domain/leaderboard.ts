import { api } from '../api/client';

export type LeaderboardEntry = {
  id: string;
  name: string;
  username: string;
  avatar_url?: string | null;
  cups: number;
  level: number;
  book_reviews: number;
  regular_posts: number;
  rank: number;
};

export const leaderboardApi = {
  list: (limit = 100, week: string | 'current' = 'current') =>
    api.get<{ items: LeaderboardEntry[] }>('/leaderboard', { params: { limit, week } }),
  weeks: () => api.get<{ items: { week_start: string; week_end: string }[] }>('/leaderboard/weeks'),
};
