import axios from 'axios';
import type {
  KnowledgeBase, Document, Conversation, ChatResponse,
  SearchResult, AnalyticsData, DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Knowledge Bases ──────────────────────────────────────────────────────────
export const kbApi = {
  list: () => api.get<{ data: KnowledgeBase[] }>('/knowledge-bases').then(r => r.data.data),
  get:  (id: string) => api.get<{ data: KnowledgeBase }>(`/knowledge-bases/${id}`).then(r => r.data.data),
  create: (name: string, description: string) =>
    api.post<{ data: KnowledgeBase }>('/knowledge-bases', { name, description }).then(r => r.data.data),
  update: (id: string, data: Partial<KnowledgeBase>) =>
    api.put<{ data: KnowledgeBase }>(`/knowledge-bases/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/knowledge-bases/${id}`),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const docApi = {
  list: (kb_id?: string) =>
    api.get<{ data: Document[] }>('/documents', { params: { kb_id } }).then(r => r.data.data),
  get: (id: string) => api.get<{ data: Document }>(`/documents/${id}`).then(r => r.data.data),
  upload: (file: File, kb_id: string, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    form.append('kb_id', kb_id);
    return api.post<{ data: Document }>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }).then(r => r.data.data);
  },
  reprocess: (id: string) => api.post(`/documents/${id}/reprocess`),
  delete: (id: string) => api.delete(`/documents/${id}`),
  getChunks: (id: string) => api.get(`/documents/${id}/chunks`).then(r => r.data.data),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (kb_id: string, question: string, conversation_id?: string, top_k?: number) =>
    api.post<{ data: ChatResponse }>('/chat', { kb_id, question, conversation_id, top_k })
       .then(r => r.data.data),
  listConversations: (kb_id?: string) =>
    api.get<{ data: Conversation[] }>('/conversations', { params: { kb_id } }).then(r => r.data.data),
  getConversation: (id: string) =>
    api.get<{ data: Conversation }>(`/conversations/${id}`).then(r => r.data.data),
  createConversation: (kb_id: string, title?: string) =>
    api.post<{ data: Conversation }>('/conversations', { kb_id, title }).then(r => r.data.data),
  deleteConversation: (id: string) => api.delete(`/conversations/${id}`),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (kb_id: string, query: string, top_k = 10) =>
    api.post<{ data: { query: string; results: SearchResult[]; total: number } }>('/search', {
      kb_id, query, top_k,
    }).then(r => r.data.data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: (kb_id?: string) =>
    api.get<{ data: AnalyticsData }>('/analytics', { params: { kb_id } }).then(r => r.data.data),
  dashboard: () =>
    api.get<{ data: { stats: DashboardStats; recentDocs: Document[]; recentQuestions: any[] } }>('/dashboard')
       .then(r => r.data.data),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get<{ status: string; openai: boolean }>('/health').then(r => r.data),
};

export default api;
