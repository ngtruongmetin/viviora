import { api } from '../api/client';
import type { FeedPost, Role } from '../../types/models';

export type ModerationSubmission = {
  id: string;
  title?: string | null;
  content: string;
  name: string;
  author_id: string;
  role: Role;
  class_name?: string | null;
  specialization?: string | null;
  avatar_url?: string | null;
  created_at: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderation_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  type: FeedPost['type'];
  media?: FeedPost['media'];
  book_id?: string | null;
  book_title?: string | null;
  book_author?: string | null;
  book_cover_url?: string | null;
  book_category?: string | null;
};

export type ModerationStats = { pending: number; approved: number; rejected: number };

export const moderationApi = {
  list: (status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'PENDING') => api.get<{ items: ModerationSubmission[]; stats: ModerationStats }>('/moderation', { params: { status } }),
  decide: (postId: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch(`/moderation/${postId}`, { status }),
};

export function toFeedPost(item: ModerationSubmission): FeedPost {
  return {
    id: item.id,
    type: item.type,
    title: item.title || undefined,
    content: item.content,
    created_at: item.created_at,
    roleLabel: item.role,
    role: item.role,
    liked: false,
    reactionCount: 0,
    commentCount: 0,
    authorId: item.author_id,
    name: item.name,
    avatarUrl: item.avatar_url,
    className: item.class_name || undefined,
    specialization: item.specialization,
    media: item.media,
    book:
      item.book_id && item.book_title
        ? {
            book: {
              id: item.book_id,
              title: item.book_title,
              author: item.book_author,
              cover_url: item.book_cover_url,
              category: item.book_category,
            },
          }
        : undefined,
  };
}
