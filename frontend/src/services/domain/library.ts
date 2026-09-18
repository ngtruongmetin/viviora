import { api } from '../api/client';
import type { Book, LibraryCollection, LibraryImportPreview, PaginatedCollections } from '../../types/models';

export type CollectionDetailResponse = {
  collection: LibraryCollection;
  books: Book[];
  categories: { category: string; total: number }[];
  pagination: { page: number; limit: number; total: number };
};

export const libraryApi = {
  searchBooks: (search: string) => api.get<{ items: Book[] }>('/library/books', { params: { search, limit: 12 } }),
  trendingBooks: (limit = 3) => api.get<{ items: { id: string; title: string; author?: string | null }[] }>('/library/trending-books', { params: { limit } }),
  collections: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<PaginatedCollections>('/library/collections', { params }),
  collection: (id: string, params: { page?: number; limit?: number; search?: string; category?: string } = {}) =>
    api.get<CollectionDetailResponse>(`/library/collections/${id}`, { params }),
  book: (id: string) => api.get<{ book: Book }>(`/library/books/${id}`),
  recordView: (id: string) => api.post<{ data: { achievementEvents?: import('../../components/achievements/AchievementCelebrationProvider').AchievementEventPayload } }>(`/library/books/${id}/view`),
  adminCollections: (params: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<PaginatedCollections>('/admin/library/collections', { params }),
  previewImport: (name: string, description: string, file: File) => {
    const form = new FormData();
    form.set('name', name);
    form.set('description', description);
    form.set('file', file);
    return api.post<{ data: LibraryImportPreview }>('/library/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirmImport: (temporaryImportId: string) =>
    api.post<{ data: { collection: LibraryCollection } }>('/library/import/confirm', { temporaryImportId }),
  cancelImport: (temporaryImportId: string) => api.delete(`/library/import/${temporaryImportId}`),
  createCollection: (data: { name: string; description?: string }) => api.post<{ data: { collection: LibraryCollection } }>('/library/collections', data),
  updateCollection: (id: string, data: { name: string; description?: string }) => api.patch<{ data: { collection: LibraryCollection } }>(`/library/collections/${id}`, data),
  deleteCollection: (id: string) => api.delete(`/library/collections/${id}`),
  createBook: (collectionId: string, data: BookInput) => api.post<{ data: { book: Book } }>(`/library/collections/${collectionId}/books`, data),
  updateBook: (bookId: string, data: BookInput) => api.patch<{ data: { book: Book } }>(`/library/books/${bookId}`, data),
  deleteBook: (bookId: string) => api.delete(`/library/books/${bookId}`),
  uploadBookCover: (bookId: string, cover: File) => {
    const form = new FormData();
    form.set('cover', cover);
    return api.post<{ data: { book: Book } }>(`/library/books/${bookId}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  removeBookCover: (bookId: string) => api.delete<{ data: { book: Book } }>(`/library/books/${bookId}/cover`),
};

export type BookInput = {
  title: string;
  author?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  price?: number | null;
  category?: string | null;
  cutter?: string | null;
  coverUrl?: string | null;
};
