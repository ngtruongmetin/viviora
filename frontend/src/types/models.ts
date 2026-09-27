export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: Role;
  class_name?: string | null;
  gender?: string | null;
  specialization?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  is_active?: boolean;
  trophy_count?: number;
  current_week_cups?: number;
  exp?: number;
  level?: number;
  current_level_exp?: number;
  next_level_exp?: number | null;
  achievements?: {
    code: string;
    name: string;
    condition_text: string;
    exp_reward: number;
    is_supported?: boolean;
    unlocked?: boolean;
    unlocked_at?: string | null;
    progress_current?: number | null;
    progress_target?: number | null;
    progress_percent?: number | null;
  }[];
  activities?: UserActivity[];
  game_progress?: {
    game_id: string;
    game_title: string;
    reward_cups: number;
    score: number;
    total_points: number;
    answered_count: number;
    completed: boolean;
    cup_earned: number;
  }[];
}

export interface UserActivity {
  id: string;
  type:
    | 'POST_CREATED'
    | 'COMMENT_CREATED'
    | 'PROFILE_UPDATED'
    | 'PASSWORD_CHANGED'
    | 'MODERATION_REVIEWED';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PublicUserProfile extends CurrentUser {
  bookshelf?: Book[];
  roleLabel: string;
  posts: FeedPost[];
}

export type Specialization =
  | 'Toán'
  | 'Ngữ Văn'
  | 'Tiếng Anh'
  | 'Khoa học tự nhiên - Công nghệ'
  | 'Lịch sử - Địa lí'
  | 'Giáo dục công dân'
  | 'Nghệ thuật - Giáo dục thể chất'
  | 'Văn phòng';

export interface ManagedUser extends CurrentUser {
  is_active: boolean;
}

export interface ManagedUserListResponse {
  items: ManagedUser[];
  pagination: { page: number; limit: number; total: number };
  statistics: { total: number; active: number; students: number; teachers: number; admins: number };
}

export interface FeedPost {
  id: string;
  type: 'TEXT' | 'BOOK_REVIEW' | 'VIDEO_REVIEW' | 'POLL' | 'ACHIEVEMENT';
  title?: string;
  content: string;
  created_at: string;
  roleLabel: string;
  role: Role;
  liked: boolean;
  reactionCount: number;
  commentCount: number;
  authorId: string;
  name: string;
  avatarUrl?: string | null;
  className?: string;
  specialization?: string | null;
  media?: { id: string; url: string; kind: string; alt?: string | null }[];
  book?: {
    book: {
      id: string;
      title: string;
      author?: string | null;
      category?: string | null;
      cover_url?: string | null;
    };
  };
  poll?: { question: string; options: { id: string; label: string; votes: { id: string }[] }[] };
}

export interface LibraryCollection {
  id: string;
  name: string;
  description?: string | null;
  imported_file_name: string;
  total_books: number;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  author_count: number;
}

export interface Book {
  id: string;
  collection_id: string;
  title: string;
  author?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  price?: string | number | null;
  category?: string | null;
  cutter?: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
  collection_name?: string;
  collection_description?: string | null;
  is_favorite?: boolean;
  is_bookmarked?: boolean;
  reading_status?: 'WANT_TO_READ' | 'READING' | 'COMPLETED' | null;
  progress?: number;
  minutes?: number;
}

export interface LibraryImportPreview {
  temporaryImportId: string;
  expiresAt: string;
  collection: { name: string; description: string };
  summary: {
    totalRows: number;
    validBooks: number;
    errorRows: number;
    authorCount: number;
    yearRange: { min: number; max: number } | null;
    categories: string[];
  };
  errors: { row: number; messages: string[] }[];
  books: Array<{
    row: number;
    title: string;
    author?: string | null;
    publisher?: string | null;
    publication_year?: number | null;
    price?: string | number | null;
    category?: string | null;
    cutter?: string | null;
    issues: string[];
  }>;
}

export interface PaginatedCollections {
  items: LibraryCollection[];
  pagination: { page: number; limit: number; total: number };
  statistics?: {
    collection_count: number;
    book_count: number;
    author_count: number;
    last_updated_at?: string | null;
  };
}
