import { Request, Response } from 'express';
import { getDb } from '../db/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { generateEmbedding } from '../services/ai/embeddings';
import { searchSimilarChunks } from '../services/rag/vectorStore';

// ── Semantic search ───────────────────────────────────────────────────────────
export const semanticSearch = asyncHandler(async (req: Request, res: Response) => {
  const { kb_id, query, top_k } = req.body;

  if (!kb_id) throw new AppError(400, 'kb_id is required');
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new AppError(400, 'query is required');
  }

  const db = getDb();
  const kb = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(kb_id);
  if (!kb) throw new AppError(404, 'Knowledge base not found');

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query.trim());

  // Search
  const results = searchSimilarChunks({
    kbId: kb_id,
    queryEmbedding,
    topK: top_k ?? 10,
    threshold: 0.15, // Lower threshold for search (showing more results)
  });

  res.json({
    data: {
      query,
      results,
      total: results.length,
    },
  });
});
