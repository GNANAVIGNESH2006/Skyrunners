import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { processDocument } from '../services/rag/pipeline';
import { getFileType } from '../services/document/extractor';

// ── List documents (optionally filter by kb_id) ───────────────────────────────
export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { kb_id, status } = req.query as { kb_id?: string; status?: string };

  let query = `SELECT * FROM documents`;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (kb_id) { conditions.push('kb_id = ?'); params.push(kb_id); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY created_at DESC`;

  const docs = db.prepare(query).all(...params);
  res.json({ data: docs });
});

// ── Get single document ───────────────────────────────────────────────────────
export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(req.params.id);

  if (!doc) throw new AppError(404, 'Document not found');
  res.json({ data: doc });
});

// ── Get document chunks ───────────────────────────────────────────────────────
export const getDocumentChunks = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();

  const doc = db.prepare(`SELECT id FROM documents WHERE id = ?`).get(req.params.id);
  if (!doc) throw new AppError(404, 'Document not found');

  const chunks = db.prepare(`
    SELECT id, chunk_index, content, page_number, token_count, created_at
    FROM document_chunks
    WHERE doc_id = ?
    ORDER BY chunk_index ASC
  `).all(req.params.id);

  res.json({ data: chunks });
});

// ── Upload a document ─────────────────────────────────────────────────────────
export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');

  const { kb_id } = req.body;
  if (!kb_id) throw new AppError(400, 'Knowledge base ID (kb_id) is required');

  const db = getDb();
  const kb = db.prepare(`SELECT id FROM knowledge_bases WHERE id = ?`).get(kb_id);
  if (!kb) throw new AppError(404, 'Knowledge base not found');

  const id = uuidv4();
  const now = new Date().toISOString();
  const fileType = getFileType(req.file.originalname);

  db.prepare(`
    INSERT INTO documents (id, kb_id, file_name, file_type, file_size, file_path, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)
  `).run(id, kb_id, req.file.originalname, fileType, req.file.size, req.file.path, now, now);

  const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);

  // Auto-process the document asynchronously (don't block the response)
  setImmediate(() => {
    processDocument(id).catch(err =>
      console.error(`Background processing failed for ${id}:`, err)
    );
  });

  res.status(201).json({
    data: doc,
    message: 'Document uploaded and processing started',
  });
});

// ── Re-process a document ─────────────────────────────────────────────────────
export const reprocessDocument = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  type DocRow = { id: string; file_path: string; status: string };
  const doc = db.prepare(`SELECT id, file_path, status FROM documents WHERE id = ?`).get(id) as DocRow | undefined;
  if (!doc) throw new AppError(404, 'Document not found');
  if (!doc.file_path || !fs.existsSync(doc.file_path)) {
    throw new AppError(400, 'Document file not found on disk. Please re-upload.');
  }

  // Reset status
  db.prepare(`UPDATE documents SET status='uploaded', error_message='', chunk_count=0, updated_at=? WHERE id=?`)
    .run(new Date().toISOString(), id);

  // Trigger async processing
  setImmediate(() => {
    processDocument(id).catch(err =>
      console.error(`Reprocessing failed for ${id}:`, err)
    );
  });

  res.json({ message: 'Document reprocessing started' });
});

// ── Delete a document ─────────────────────────────────────────────────────────
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  type DocRow = { id: string; file_path: string };
  const doc = db.prepare(`SELECT id, file_path FROM documents WHERE id = ?`).get(id) as DocRow | undefined;
  if (!doc) throw new AppError(404, 'Document not found');

  // Delete file from disk if it exists
  if (doc.file_path && fs.existsSync(doc.file_path)) {
    try { fs.unlinkSync(doc.file_path); } catch { /* ignore */ }
  }

  db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
  res.json({ message: 'Document deleted' });
});
