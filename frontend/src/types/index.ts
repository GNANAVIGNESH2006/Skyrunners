// Shared TypeScript types for frontend

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  chunk_count?: number;
  documents?: Document[];
}

export interface Document {
  id: string;
  kb_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  error_message: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  kb_name?: string;
}

export interface DocumentChunk {
  id: string;
  doc_id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  token_count: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  kb_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: Message[];
}

export interface SourceReference {
  id: string;
  message_id: string;
  doc_id: string;
  chunk_id: string;
  similarity_score: number;
  created_at: string;
  file_name: string;
  chunk_content: string;
  page_number: number;
}

export interface Message {
  id: string;
  conv_id: string;
  role: 'user' | 'assistant';
  content: string;
  answered: number;
  avg_score: number;
  created_at: string;
  sources?: SourceReference[];
}

export interface ChatResponse {
  conversation_id: string;
  user_message_id: string;
  assistant_message_id: string;
  answer: string;
  answered: boolean;
  avg_score: number;
  relevance_level: 'high' | 'medium' | 'low' | 'none';
  sources: SourceReference[];
}

export interface SearchResult {
  chunk_id: string;
  doc_id: string;
  file_name: string;
  content: string;
  page_number: number;
  similarity_score: number;
}

export interface AnalyticsData {
  total_questions: number;
  answered_questions: number;
  unanswered_questions: number;
  avg_relevance: number;
  daily_counts: Array<{ date: string; count: number; answered: number }>;
  top_documents: Array<{ file_name: string; query_count: number }>;
  relevance_distribution: { high: number; medium: number; low: number };
}

export interface DashboardStats {
  total_kbs: number;
  total_docs: number;
  total_chunks: number;
  total_questions: number;
  answered_questions: number;
  unanswered_questions: number;
}
