import { api } from '../api/client';
import type { FeedPost } from '../../types/models';

export const feedApi = {
  list: (cursor?: string) =>
    api.get<{ items: FeedPost[]; nextCursor: string | null }>('/feed', {
      params: { limit: 5, cursor },
    }),
  react: (postId: string) => api.post<{ liked: boolean; reactionCount: number; achievementEvents?: { unlocked?: { code: string; name: string; condition_text: string; exp_reward: number }[]; previousLevel?: number; currentLevel?: number; leveledUp?: boolean } }>(`/posts/${postId}/reactions`),
  createPost: (data: { type: string; content: string; title?: string; bookId?: string | null }) => api.post<{ data: { id: string; status: string; workflowStatus: 'PUBLISHED' | 'PENDING'; post: FeedPost | null; achievementEvents?: import('../../components/achievements/AchievementCelebrationProvider').AchievementEventPayload } }>('/posts', data),
  comments: (postId: string) => api.get(`/posts/${postId}/comments`),
  comment: (postId: string, content: string) => api.post(`/posts/${postId}/comments`, { content }),
  remove: (postId: string) => api.delete(`/posts/${postId}`),
};
