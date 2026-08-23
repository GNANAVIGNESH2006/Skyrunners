import { Request, Response } from 'express';
import { getDb } from '../db/database';
import { asyncHandler } from '../middleware/errorHandler';
import type { AnalyticsData } from '../types';

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { kb_id } = req.query as { kb_id?: string };

  // ── Base filters ─────────────────────────────────────────────────────────────
  const kbFilter = kb_id
    ? `AND c.kb_id = '${kb_id.replace(/'/g, "''")}'`
    : '';

  // ── Total questions / answered / unanswered ────────────────────────────────
  type TotalRow = { total: number; answered: number; unanswered: number; avg_score: number };
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN answered = 1 THEN 1 ELSE 0 END) AS answered,
      SUM(CASE WHEN answered = 0 THEN 1 ELSE 0 END) AS unanswered,
      AVG(avg_score) AS avg_score
    FROM messages m
    JOIN conversations c ON c.id = m.conv_id
    WHERE m.role = 'assistant'
    ${kbFilter}
  `).get() as TotalRow;

  // ── Daily counts (last 30 days) ────────────────────────────────────────────
  type DailyRow = { date: string; count: number; answered: number };
  const daily = db.prepare(`
    SELECT
      DATE(m.created_at) AS date,
      COUNT(*) AS count,
      SUM(CASE WHEN m.answered = 1 THEN 1 ELSE 0 END) AS answered
    FROM messages m
    JOIN conversations c ON c.id = m.conv_id
    WHERE m.role = 'assistant'
      AND m.created_at >= DATE('now', '-30 days')
      ${kbFilter}
    GROUP BY DATE(m.created_at)
    ORDER BY date ASC
  `).all() as DailyRow[];

  // ── Top documents by usage ────────────────────────────────────────────────
  type TopDocRow = { file_name: string; query_count: number };
  const topDocs = db.prepare(`
    SELECT
      d.file_name,
      COUNT(sr.id) AS query_count
    FROM source_references sr
    JOIN documents d ON d.id = sr.doc_id
    JOIN messages m ON m.id = sr.message_id
    JOIN conversations c ON c.id = m.conv_id
    WHERE 1=1 ${kbFilter}
    GROUP BY d.id
    ORDER BY query_count DESC
    LIMIT 10
  `).all() as TopDocRow[];

  // ── Relevance distribution ────────────────────────────────────────────────
  type RelRow = { high: number; medium: number; low: number };
  const relevance = db.prepare(`
    SELECT
      SUM(CASE WHEN avg_score >= 0.65 THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN avg_score >= 0.40 AND avg_score < 0.65 THEN 1 ELSE 0 END) AS medium,
      SUM(CASE WHEN avg_score > 0 AND avg_score < 0.40 THEN 1 ELSE 0 END) AS low
    FROM messages m
    JOIN conversations c ON c.id = m.conv_id
    WHERE m.role = 'assistant' AND m.answered = 1
    ${kbFilter}
  `).get() as RelRow;

  const analytics: AnalyticsData = {
    total_questions:    totals?.total || 0,
    answered_questions: totals?.answered || 0,
    unanswered_questions: totals?.unanswered || 0,
    avg_relevance:      Math.round((totals?.avg_score || 0) * 100) / 100,
    daily_counts:       daily,
    top_documents:      topDocs,
    relevance_distribution: {
      high:   relevance?.high   || 0,
      medium: relevance?.medium || 0,
      low:    relevance?.low    || 0,
    },
  };

  res.json({ data: analytics });
});

// ── Dashboard summary stats ────────────────────────────────────────────────────
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();

  type StatsRow = {
    total_kbs: number; total_docs: number; total_chunks: number;
    total_questions: number; answered_questions: number; unanswered_questions: number;
  };

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM knowledge_bases)   AS total_kbs,
      (SELECT COUNT(*) FROM documents)          AS total_docs,
      (SELECT COUNT(*) FROM document_chunks)    AS total_chunks,
      (SELECT COUNT(*) FROM messages WHERE role='assistant') AS total_questions,
      (SELECT COUNT(*) FROM messages WHERE role='assistant' AND answered=1) AS answered_questions,
      (SELECT COUNT(*) FROM messages WHERE role='assistant' AND answered=0) AS unanswered_questions
  `).get() as StatsRow;

  // Recent documents
  const recentDocs = db.prepare(`
    SELECT d.*, kb.name AS kb_name
    FROM documents d
    JOIN knowledge_bases kb ON kb.id = d.kb_id
    ORDER BY d.created_at DESC LIMIT 5
  `).all();

  // Recent questions
  type MsgRow = {
    id: string; content: string; answered: number; avg_score: number;
    created_at: string; conv_id: string; kb_name: string;
    source_count: number;
  };
  const recentQuestions = db.prepare(`
    SELECT
      m.id, m.content, m.answered, m.avg_score, m.created_at, m.conv_id,
      kb.name AS kb_name,
      COUNT(sr.id) AS source_count
    FROM messages m
    JOIN conversations c ON c.id = m.conv_id
    JOIN knowledge_bases kb ON kb.id = c.kb_id
    LEFT JOIN source_references sr ON sr.message_id = m.id
    WHERE m.role = 'assistant'
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT 5
  `).all() as MsgRow[];

  res.json({ data: { stats, recentDocs, recentQuestions } });
});
