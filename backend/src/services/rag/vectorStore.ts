import { getDb } from '../../db/database';
import type { DocumentChunk, SearchResult } from '../../types';

/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;

  return dot / denom;
}

export interface VectorSearchOptions {
  kbId: string;
  queryEmbedding: number[];
  topK?: number;
  threshold?: number;
}

export interface VectorSearchResult {
  chunk: DocumentChunk;
  fileName: string;
  score: number;
}

/**
 * Performs semantic similarity search over all chunks in a knowledge base.
 *
 * 1. Loads all embedded chunks for the KB from SQLite.
 * 2. Computes cosine similarity with the query embedding.
 * 3. Filters by threshold and returns top-K.
 */
export function searchSimilarChunks(options: VectorSearchOptions): SearchResult[] {
  const {
    kbId,
    queryEmbedding,
    topK = parseInt(process.env.RAG_TOP_K || '5', 10),
    threshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.25'),
  } = options;

  const db = getDb();

  // Load all chunks with embeddings for this KB's documents
  type ChunkRow = {
    id: string;
    doc_id: string;
    chunk_index: number;
    content: string;
    page_number: number;
    token_count: number;
    embedding: string | null;
    file_name: string;
  };

  const rows = db.prepare(`
    SELECT
      dc.id, dc.doc_id, dc.chunk_index, dc.content,
      dc.page_number, dc.token_count, dc.embedding,
      d.file_name
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.doc_id
    WHERE d.kb_id = ? AND d.status = 'ready' AND dc.embedding IS NOT NULL
  `).all(kbId) as ChunkRow[];

  if (rows.length === 0) return [];

  // Compute similarity for each chunk
  const scored: Array<{ row: ChunkRow; score: number }> = [];

  for (const row of rows) {
    try {
      const chunkEmbedding: number[] = JSON.parse(row.embedding!);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);

      if (score >= threshold) {
        scored.push({ row, score });
      }
    } catch {
      // Skip chunks with malformed embeddings
    }
  }

  // Sort descending by score, take top-K
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  return top.map(({ row, score }) => ({
    chunk_id: row.id,
    doc_id: row.doc_id,
    file_name: row.file_name,
    content: row.content,
    page_number: row.page_number,
    similarity_score: score,
  }));
}

/**
 * Maps a similarity score to a human-readable relevance level.
 */
export function scoreToRelevanceLevel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.65) return 'high';
  if (score >= 0.40) return 'medium';
  if (score >= 0.25) return 'low';
  return 'none';
}

/**
 * Computes average similarity score for a set of results.
 */
export function averageScore(results: SearchResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((s, r) => s + r.similarity_score, 0) / results.length;
}
