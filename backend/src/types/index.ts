// Shared TypeScript types for backend
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  chunk_count?: number;
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
}

export interface DocumentChunk {
  id: string;
  doc_id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  token_count: number;
  embedding: string | null; // JSON array
  created_at: string;
}

export interface Conversation {
  id: string;
  kb_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
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

export interface SourceReference {
  id: string;
  message_id: string;
  doc_id: string;
  chunk_id: string;
  similarity_score: number;
  created_at: string;
  // Joined fields
  file_name?: string;
  chunk_content?: string;
  page_number?: number;
}

export interface ChatRequest {
  kb_id: string;
  question: string;
  conversation_id?: string;
  top_k?: number;
}

export interface SearchRequest {
  kb_id: string;
  query: string;
  top_k?: number;
}

export interface SearchResult {
  chunk_id: string;
  doc_id: string;
  file_name: string;
  content: string;
  page_number: number;
  similarity_score: number;
}

export interface RagResult {
  answer: string;
  answered: boolean;
  sources: SearchResult[];
  avg_score: number;
  relevance_level: 'high' | 'medium' | 'low' | 'none';
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
