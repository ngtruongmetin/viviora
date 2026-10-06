import { api } from '../api/client';
import type { Book } from '../../types/models';

export type AiConversation = { id: string; title: string; created_at: string; updated_at: string; preview?: string | null };
export type AiMessage = { id: string; role: 'user' | 'assistant'; content: string; recommended_book_ids: string[]; recommended_books?: Book[]; created_at: string };
export type AiConversationDetail = AiConversation & { messages: AiMessage[] };
export type AiConfig = { provider: string; baseUrl: string; model: string; temperature: number; maxTokens: number; systemPrompt: string; isEnabled: boolean; hasCredential: boolean; credentialHint: string; updatedAt: string };

const apiBase = import.meta.env.VITE_API_URL || '/api';
export const aiApi = {
  conversations: () => api.get<{ items: AiConversation[] }>('/ai/conversations'),
  conversation: (id: string) => api.get<{ data: AiConversationDetail }>(`/ai/conversations/${id}`),
  createConversation: () => api.post<{ data: AiConversationDetail }>('/ai/conversations'),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
  config: () => api.get<{ data: AiConfig }>('/ai/admin/config'),
  updateConfig: (data: Partial<AiConfig> & { apiKey?: string; clearCredential?: boolean }) => api.put<{ data: AiConfig }>('/ai/admin/config', data),
  stats: () => api.get<{ data: { book_count: number; collection_count: number; conversation_count: number; request_count: number } }>('/ai/admin/stats'),
  models: () => api.get<{ data: string[] }>('/ai/admin/models'),
  test: () => api.post<{ data: { ok: boolean; model: string } }>('/ai/admin/test'),
  async streamMessage(conversationId: string, content: string, onEvent: (type: string, data: unknown) => void) {
    const response = await fetch(`${apiBase}/ai/conversations/${conversationId}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!response.ok || !response.body) throw new Error('Không thể kết nối AI.');
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n'); buffer = blocks.pop() || '';
      for (const block of blocks) {
        const type = block.match(/^event:\s*(.+)$/m)?.[1]; const raw = block.match(/^data:\s*(.+)$/m)?.[1];
        if (type && raw) { try { onEvent(type, JSON.parse(raw)); } catch { /* ignore invalid event */ } }
      }
    }
  },
};
export type AiBooksEvent = { books: Book[] };
