import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import type { KnowledgeBase } from '../types';

// ── List all knowledge bases ──────────────────────────────────────────────────
export const listKnowledgeBases = asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();

  const kbs = db.prepare(`
    SELECT
      kb.id, kb.name, kb.description, kb.created_at, kb.updated_at,
      COUNT(DISTINCT d.id)  AS document_count,
      SUM(d.chunk_count)    AS chunk_count
    FROM knowledge_bases kb
    LEFT JOIN documents d ON d.kb_id = kb.id
    GROUP BY kb.id
    ORDER BY kb.updated_at DESC
  `).all() as KnowledgeBase[];

  res.json({ data: kbs });
});

// ── Get single knowledge base ─────────────────────────────────────────────────
export const getKnowledgeBase = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const kb = db.prepare(`
    SELECT
      kb.id, kb.name, kb.description, kb.created_at, kb.updated_at,
      COUNT(DISTINCT d.id)  AS document_count,
      SUM(d.chunk_count)    AS chunk_count
    FROM knowledge_bases kb
    LEFT JOIN documents d ON d.kb_id = kb.id
    WHERE kb.id = ?
    GROUP BY kb.id
  `).get(id) as KnowledgeBase | undefined;

  if (!kb) throw new AppError(404, 'Knowledge base not found');

  const docs = db.prepare(
    `SELECT * FROM documents WHERE kb_id = ? ORDER BY created_at DESC`
  ).all(id);

  res.json({ data: { ...kb, documents: docs } });
});

// ── Create knowledge base ─────────────────────────────────────────────────────
export const createKnowledgeBase = asyncHandler(async (req: Request, res: Response) => {
  const { name, description = '' } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError(400, 'Knowledge base name is required');
  }

  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO knowledge_bases (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), description.trim(), now, now);

  const kb = db.prepare(`SELECT * FROM knowledge_bases WHERE id = ?`).get(id);
  res.status(201).json({ data: kb });
});

// ── Update knowledge base ─────────────────────────────────────────────────────
export const updateKnowledgeBase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(id);
  if (!existing) throw new AppError(404, 'Knowledge base not found');

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }

  if (updates.length === 0) throw new AppError(400, 'No valid fields to update');

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE knowledge_bases SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const kb = db.prepare(`SELECT * FROM knowledge_bases WHERE id = ?`).get(id);
  res.json({ data: kb });
});

// ── Delete knowledge base ─────────────────────────────────────────────────────
export const deleteKnowledgeBase = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const existing = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(id);
  if (!existing) throw new AppError(404, 'Knowledge base not found');

  db.prepare(`DELETE FROM knowledge_bases WHERE id = ?`).run(id);
  res.json({ message: 'Knowledge base deleted' });
});
