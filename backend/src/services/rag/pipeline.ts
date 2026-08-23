import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/database';
import { extractText, cleanText } from '../document/extractor';
import { chunkText } from '../document/chunker';
import { generateEmbeddingBatch } from '../ai/embeddings';
import { generateGroundedAnswer } from '../ai/llm';
import { searchSimilarChunks, averageScore, scoreToRelevanceLevel } from './vectorStore';
import type { RagResult, SearchResult, Message } from '../../types';

/**
 * Processes a document through the full RAG pipeline:
 * Extract → Clean → Chunk → Embed → Store
 */
export async function processDocument(docId: string): Promise<void> {
  const db = getDb();

  // Get document record
  type DocRow = {
    id: string; file_path: string; file_type: string; file_name: string; kb_id: string;
  };
  const doc = db.prepare(
    `SELECT id, file_path, file_type, file_name, kb_id FROM documents WHERE id = ?`
  ).get(docId) as DocRow | undefined;

  if (!doc) throw new Error(`Document ${docId} not found`);
  if (!doc.file_path) throw new Error(`Document ${docId} has no file path`);

  // Mark as processing
  db.prepare(`UPDATE documents SET status='processing', updated_at=? WHERE id=?`)
    .run(new Date().toISOString(), docId);

  try {
    // ── STEP 1: Extract text ──────────────────────────────────────────────────
    console.log(`  [1/4] Extracting text from ${doc.file_name}...`);
    const extracted = await extractText(doc.file_path, doc.file_type);
    const cleanedText = cleanText(extracted.text);

    if (cleanedText.length < 50) {
      throw new Error('Extracted text is too short or empty. The document may be scanned/image-based.');
    }

    // ── STEP 2: Chunk text ────────────────────────────────────────────────────
    console.log(`  [2/4] Chunking text...`);
    const chunkSize = parseInt(process.env.CHUNK_SIZE || '1000', 10);
    const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '150', 10);
    const textChunks = chunkText(cleanedText, chunkSize, chunkOverlap, extracted.pageCount);

    if (textChunks.length === 0) throw new Error('No chunks produced from document.');

    // ── STEP 3: Generate embeddings ───────────────────────────────────────────
    console.log(`  [3/4] Generating embeddings for ${textChunks.length} chunks...`);
    const embeddings = await generateEmbeddingBatch(textChunks.map(c => c.content));

    // ── STEP 4: Store chunks and embeddings ───────────────────────────────────
    console.log(`  [4/4] Storing ${textChunks.length} chunks...`);

    // Delete any existing chunks for this document
    db.prepare(`DELETE FROM document_chunks WHERE doc_id = ?`).run(docId);

    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (id, doc_id, chunk_index, content, page_number, token_count, embedding, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const storeAll = db.transaction(() => {
      const now = new Date().toISOString();
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = embeddings[i];
        insertChunk.run(
          uuidv4(),
          docId,
          chunk.chunkIndex,
          chunk.content,
          chunk.pageNumber,
          chunk.tokenCount,
          JSON.stringify(embedding),
          now
        );
      }
    });

    storeAll();

    // Update document record
    db.prepare(`
      UPDATE documents
      SET status='ready', page_count=?, chunk_count=?, error_message='', updated_at=?
      WHERE id=?
    `).run(extracted.pageCount, textChunks.length, new Date().toISOString(), docId);

    console.log(`✓ Document ${doc.file_name} processed: ${textChunks.length} chunks`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE documents SET status='failed', error_message=?, updated_at=? WHERE id=?
    `).run(msg, new Date().toISOString(), docId);
    throw err;
  }
}

/**
 * Core RAG query pipeline:
 * Query Embed → Vector Search → Filter → Grounded LLM → Return
 */
export async function ragQuery(
  kbId: string,
  question: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  topK?: number
): Promise<RagResult> {
  const { generateEmbedding } = await import('../ai/embeddings');

  // Step 1: Embed the question
  const queryEmbedding = await generateEmbedding(question);

  // Step 2: Vector similarity search
  const sources = searchSimilarChunks({
    kbId,
    queryEmbedding,
    topK: topK ?? parseInt(process.env.RAG_TOP_K || '5', 10),
    threshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.25'),
  });

  const avgScore = averageScore(sources);
  const relevanceLevel = scoreToRelevanceLevel(avgScore);

  // Step 3: If no relevant chunks found, return "not found"
  if (sources.length === 0) {
    return {
      answer: "I couldn't find this information in the provided documents.",
      answered: false,
      sources: [],
      avg_score: 0,
      relevance_level: 'none',
    };
  }

  // Step 4: Generate grounded answer
  const llmResult = await generateGroundedAnswer(question, sources, conversationHistory);

  return {
    answer: llmResult.answer,
    answered: llmResult.answered,
    sources,
    avg_score: avgScore,
    relevance_level: relevanceLevel,
  };
}

/**
 * Saves a completed RAG exchange (question + answer + sources) to the DB.
 */
export function saveRagExchange(
  convId: string,
  question: string,
  result: RagResult
): { userMsgId: string; assistantMsgId: string } {
  const db = getDb();
  const now = new Date().toISOString();

  const userMsgId = uuidv4();
  const assistantMsgId = uuidv4();

  const saveExchange = db.transaction(() => {
    // Save user message
    db.prepare(`
      INSERT INTO messages (id, conv_id, role, content, answered, avg_score, created_at)
      VALUES (?, ?, 'user', ?, 1, 0, ?)
    `).run(userMsgId, convId, question, now);

    // Save assistant message
    db.prepare(`
      INSERT INTO messages (id, conv_id, role, content, answered, avg_score, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?)
    `).run(
      assistantMsgId,
      convId,
      result.answer,
      result.answered ? 1 : 0,
      result.avg_score,
      now
    );

    // Save source references
    for (const source of result.sources) {
      db.prepare(`
        INSERT INTO source_references (id, message_id, doc_id, chunk_id, similarity_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), assistantMsgId, source.doc_id, source.chunk_id, source.similarity_score, now);
    }

    // Update conversation timestamp and title
    db.prepare(`
      UPDATE conversations SET updated_at = ? WHERE id = ?
    `).run(now, convId);
  });

  saveExchange();
  return { userMsgId, assistantMsgId };
}
