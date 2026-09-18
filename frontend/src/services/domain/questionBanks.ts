import { api } from '../api/client';

export type QuestionType = 'MC' | 'TF';
export type QuestionOption = { id?: string; label: string; position?: number; is_correct?: boolean; isCorrect?: boolean };
export type Question = {
  id: string;
  question_bank_id: string;
  type: QuestionType;
  content: string;
  answer_explanation?: string | null;
  correct_answer?: boolean;
  options: QuestionOption[];
};
export type QuestionBank = {
  id: string;
  book: { id: string; title: string; author?: string | null; cover_url?: string | null };
  statistics: { total: number; mc: number; tf: number };
  created_at: string;
  updated_at: string;
};
export type QuestionInput = {
  type: QuestionType;
  content: string;
  answerExplanation?: string | null;
  options?: { label: string; isCorrect: boolean }[];
  correctAnswer?: boolean;
};

export type QuestionImportRow = { rowNumber: number; type: QuestionType | string; question: string; point?: number; valid: boolean; errors: string[] };
export type QuestionImportPreview = {
  temporaryImportId: string;
  expiresAt: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  statistics: { total: number; mc: number; tf: number };
  rows: QuestionImportRow[];
  errors: { row: number; messages: string[] }[];
};

export const questionBanksApi = {
  list: () => api.get<{ items: QuestionBank[] }>('/question-banks'),
  byBook: (bookId: string) => api.get<{ data: QuestionBank }>(`/question-banks/by-book/${bookId}`),
  createForBook: (bookId: string) => api.post<{ data: QuestionBank }>(`/question-banks/by-book/${bookId}`),
  detail: (id: string) => api.get<{ data: QuestionBank }>(`/question-banks/${id}`),
  remove: (id: string) => api.delete(`/question-banks/${id}`),
  questions: (id: string, type?: QuestionType) => api.get<{ items: Question[] }>(`/question-banks/${id}/questions`, { params: type ? { type } : undefined }),
  createQuestion: (id: string, data: QuestionInput) => api.post<{ data: Question }>(`/question-banks/${id}/questions`, data),
  updateQuestion: (id: string, data: QuestionInput) => api.patch<{ data: Question }>(`/questions/${id}`, data),
  removeQuestion: (id: string) => api.delete(`/questions/${id}`),
  previewImport: (bankId: string, file: File) => {
    const form = new FormData();
    form.set('file', file);
    return api.post<{ data: QuestionImportPreview }>(`/question-banks/${bankId}/questions/import/preview`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  confirmImport: (bankId: string, temporaryImportId: string) => api.post<{ data: { imported: number } }>(`/question-banks/${bankId}/questions/import/confirm`, { temporaryImportId }),
  cancelImport: (bankId: string, temporaryImportId: string) => api.delete(`/question-banks/${bankId}/questions/import/${temporaryImportId}`),
};
