import { api } from '../api/client';

export type GameQuestionType = 'MC' | 'TF';
export type Game = {
  id: string;
  book_id: string;
  book: { id: string; title: string; author?: string | null; cover_url?: string | null };
  question_type: GameQuestionType;
  title: string;
  name: string;
  description?: string | null;
  question_count: number;
  available_question_count: number;
  is_available: boolean;
  reward_cups: number;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
};
export type GameQuestion = {
  id: string;
  type: GameQuestionType;
  content: string;
  point: number;
  options: { id: string; label: string; position: number }[];
};
export type GameSession = {
  sessionId: string;
  game: Game;
  questions: GameQuestion[];
  completedAt?: string | null;
  result?: GameResult | null;
};
export type GameResult = {
  id: string;
  game_id: string;
  game_title: string;
  question_type: GameQuestionType;
  reward_cups: number;
  cup_earned: boolean;
  cup_awarded: boolean;
  score: number;
  total_points: number;
  correct_count: number;
  answered_count: number;
  total_questions: number;
  started_at: string;
  completed_at: string | null;
  achievementEvents?: {
    unlocked?: { code: string; name: string; condition_text: string; exp_reward: number }[];
    previousLevel?: number;
    currentLevel?: number;
    leveledUp?: boolean;
  };
  answers: {
    question_id: string;
    position: number;
    is_correct: boolean | null;
    points_awarded: number;
    selected_answer: string | null;
    content: string;
    answer_explanation?: string | null;
  }[];
};

export const gamesApi = {
  list: () => api.get<{ items: Game[] }>('/games'),
  questionBankBooks: (search = '') =>
    api.get<{
      items: {
        id: string;
        title: string;
        author?: string | null;
        cover_url?: string | null;
        question_count: number;
        mc_count: number;
        tf_count: number;
      }[];
    }>('/games/question-bank-books', { params: { search } }),
  detail: (id: string) => api.get<{ data: Game }>(`/games/${id}`),
  create: (data: {
    bookId: string;
    questionType: GameQuestionType;
    title: string;
    description?: string;
    questionCount: number;
    cupReward: number;
  }) => api.post<{ data: Game }>('/games', data),
  update: (
    id: string,
    data: { title: string; description?: string; questionCount: number; cupReward: number },
  ) => api.patch<{ data: Game }>(`/games/${id}`, data),
  remove: (id: string) => api.delete(`/games/${id}`),
  start: (id: string) => api.post<{ data: GameSession }>(`/games/${id}/start`),
  session: (id: string) => api.get<{ data: GameSession }>(`/games/sessions/${id}`),
  answer: (sessionId: string, questionId: string, selectedAnswer: string | boolean) =>
    api.post<{
      data: {
        questionId: string;
        isCorrect: boolean;
        pointsAwarded: number;
        explanation?: string | null;
      };
    }>(`/games/sessions/${sessionId}/answer`, { questionId, selectedAnswer }),
  complete: (sessionId: string) =>
    api.post<{ data: GameResult }>(`/games/sessions/${sessionId}/complete`),
  result: (sessionId: string) =>
    api.get<{ data: GameResult }>(`/games/sessions/${sessionId}/result`),
};
