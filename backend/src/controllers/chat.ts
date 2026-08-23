import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ragQuery, saveRagExchange } from '../services/rag/pipeline';
import type { Message } from '../types';

// ── List conversations ────────────────────────────────────────────────────────
export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { kb_id } = req.query as { kb_id?: string };

  let query = `
    SELECT c.*, COUNT(m.id) AS message_count
    FROM conversations c
    LEFT JOIN messages m ON m.conv_id = c.id
  `;
  const params: unknown[] = [];

  if (kb_id) {
    query += ` WHERE c.kb_id = ?`;
    params.push(kb_id);
  }

  query += ` GROUP BY c.id ORDER BY c.updated_at DESC`;

  const convs = db.prepare(query).all(...params);
  res.json({ data: convs });
});

// ── Get single conversation with messages ─────────────────────────────────────
export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const conv = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
  if (!conv) throw new AppError(404, 'Conversation not found');

  const messages = db.prepare(`
    SELECT * FROM messages WHERE conv_id = ? ORDER BY created_at ASC
  `).all(id) as Message[];

  // Attach source references to assistant messages
  const msgIds = messages.filter(m => m.role === 'assistant').map(m => m.id);
  type SrcRow = {
    id: string; message_id: string; doc_id: string; chunk_id: string;
    similarity_score: number; created_at: string; file_name: string;
    chunk_content: string; page_number: number;
  };
  const allSources = msgIds.length > 0
    ? db.prepare(`
        SELECT
          sr.id, sr.message_id, sr.doc_id, sr.chunk_id, sr.similarity_score, sr.created_at,
          d.file_name,
          dc.content AS chunk_content,
          dc.page_number
        FROM source_references sr
        JOIN documents d ON d.id = sr.doc_id
        JOIN document_chunks dc ON dc.id = sr.chunk_id
        WHERE sr.message_id IN (${msgIds.map(() => '?').join(',')})
        ORDER BY sr.similarity_score DESC
      `).all(...msgIds) as SrcRow[]
    : [];

  const sourcesByMsg: Record<string, SrcRow[]> = {};
  for (const src of allSources) {
    if (!sourcesByMsg[src.message_id]) sourcesByMsg[src.message_id] = [];
    sourcesByMsg[src.message_id].push(src);
  }

  const messagesWithSources = messages.map(m => ({
    ...m,
    sources: sourcesByMsg[m.id] || [],
  }));

  res.json({ data: { ...conv, messages: messagesWithSources } });
});

// ── Create a new conversation ─────────────────────────────────────────────────
export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const { kb_id, title = 'New Conversation' } = req.body;
  if (!kb_id) throw new AppError(400, 'kb_id is required');

  const db = getDb();
  const kb = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(kb_id);
  if (!kb) throw new AppError(404, 'Knowledge base not found');

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO conversations (id, kb_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
  `).run(id, kb_id, title, now, now);

  res.status(201).json({ data: db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id) });
});

// ── Delete a conversation ─────────────────────────────────────────────────────
export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  if (!db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(id)) {
    throw new AppError(404, 'Conversation not found');
  }

  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  res.json({ message: 'Conversation deleted' });
});

// ── Send a chat message (main RAG endpoint) ───────────────────────────────────
export const sendChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const { kb_id, question, conversation_id, top_k } = req.body;

  if (!kb_id) throw new AppError(400, 'kb_id is required');
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new AppError(400, 'question is required');
  }

  const db = getDb();

  // Check knowledge base exists and has ready documents
  const kb = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(kb_id);
  if (!kb) throw new AppError(404, 'Knowledge base not found');

  type CountRow = { count: number };
  const readyDocs = db.prepare(
    `SELECT COUNT(*) AS count FROM documents WHERE kb_id = ? AND status = 'ready'`
  ).get(kb_id) as CountRow;

  if (readyDocs.count === 0) {
    throw new AppError(400, 'No ready documents in this knowledge base. Please upload and process documents first.');
  }

  // Get or create conversation
  let convId = conversation_id;
  if (!convId) {
    convId = uuidv4();
    const now = new Date().toISOString();
    const title = question.slice(0, 60) + (question.length > 60 ? '...' : '');
    db.prepare(`
      INSERT INTO conversations (id, kb_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    `).run(convId, kb_id, title, now, now);
  } else {
    const conv = db.prepare(`SELECT id FROM conversations WHERE id = ?`).get(convId);
    if (!conv) throw new AppError(404, 'Conversation not found');
  }

  // Load recent conversation history for context
  const history = db.prepare(`
    SELECT role, content FROM messages
    WHERE conv_id = ?
    ORDER BY created_at DESC
    LIMIT 12
  `).all(convId).reverse() as Array<{ role: 'user' | 'assistant'; content: string }>;

  // Execute RAG pipeline
  const result = await ragQuery(kb_id, question.trim(), history, top_k);

  // Save to database
  const { userMsgId, assistantMsgId } = saveRagExchange(convId, question.trim(), result);

  // Load the saved messages with sources to return
  type SrcRow2 = {
    id: string; message_id: string; doc_id: string; chunk_id: string;
    similarity_score: number; created_at: string; file_name: string;
    chunk_content: string; page_number: number;
  };
  const sources = db.prepare(`
    SELECT
      sr.id, sr.message_id, sr.doc_id, sr.chunk_id, sr.similarity_score, sr.created_at,
      d.file_name,
      dc.content AS chunk_content,
      dc.page_number
    FROM source_references sr
    JOIN documents d ON d.id = sr.doc_id
    JOIN document_chunks dc ON dc.id = sr.chunk_id
    WHERE sr.message_id = ?
    ORDER BY sr.similarity_score DESC
  `).all(assistantMsgId) as SrcRow2[];

  res.json({
    data: {
      conversation_id: convId,
      user_message_id: userMsgId,
      assistant_message_id: assistantMsgId,
      answer: result.answer,
      answered: result.answered,
      avg_score: result.avg_score,
      relevance_level: result.relevance_level,
      sources,
    },
  });
});
