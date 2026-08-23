import { Router } from 'express';
import { upload } from '../middleware/upload';

// Controllers
import {
  listKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '../controllers/knowledgeBases';

import {
  listDocuments,
  getDocument,
  getDocumentChunks,
  uploadDocument,
  reprocessDocument,
  deleteDocument,
} from '../controllers/documents';

import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  sendChatMessage,
} from '../controllers/chat';

import { semanticSearch } from '../controllers/search';
import { getAnalytics, getDashboardStats } from '../controllers/analytics';

const router = Router();

// ── Knowledge Bases ───────────────────────────────────────────────────────────
router.get('/knowledge-bases',           listKnowledgeBases);
router.post('/knowledge-bases',          createKnowledgeBase);
router.get('/knowledge-bases/:id',       getKnowledgeBase);
router.put('/knowledge-bases/:id',       updateKnowledgeBase);
router.delete('/knowledge-bases/:id',    deleteKnowledgeBase);

// ── Documents ─────────────────────────────────────────────────────────────────
router.get('/documents',                 listDocuments);
router.post('/documents/upload',         upload.single('file'), uploadDocument);
router.get('/documents/:id',             getDocument);
router.get('/documents/:id/chunks',      getDocumentChunks);
router.post('/documents/:id/reprocess',  reprocessDocument);
router.delete('/documents/:id',          deleteDocument);

// ── Chat / Conversations ──────────────────────────────────────────────────────
router.post('/chat',                     sendChatMessage);
router.get('/conversations',             listConversations);
router.post('/conversations',            createConversation);
router.get('/conversations/:id',         getConversation);
router.delete('/conversations/:id',      deleteConversation);

// ── Search ────────────────────────────────────────────────────────────────────
router.post('/search',                   semanticSearch);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics',                 getAnalytics);
router.get('/dashboard',                 getDashboardStats);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
  });
});

export default router;
