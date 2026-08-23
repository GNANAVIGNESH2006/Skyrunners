import OpenAI from 'openai';
import dotenv from 'dotenv';
import { generateKeywordEmbedding } from '../../db/seed';

dotenv.config();

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export function isOpenAIConfigured(): boolean {
  return getOpenAI() !== null;
}

/**
 * Generates an embedding vector for the given text.
 *
 * Uses OpenAI text-embedding-3-small if API key is configured.
 * Falls back to a keyword-based pseudo-embedding (128-dim) for demo mode.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();

  if (!client) {
    // Fallback: keyword-based embedding (works without API key)
    return generateKeywordEmbedding(text);
  }

  try {
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const response = await client.embeddings.create({
      model,
      input: text.slice(0, 8000), // Limit input size
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error('OpenAI embedding error, falling back to keyword embedding:', err);
    return generateKeywordEmbedding(text);
  }
}

/**
 * Generates embeddings for multiple texts in a single API call (batch).
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAI();

  if (!client) {
    return texts.map(t => generateKeywordEmbedding(t));
  }

  try {
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    // OpenAI allows up to 2048 inputs per batch
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 8000));
      const response = await client.embeddings.create({
        model,
        input: batch,
        encoding_format: 'float',
      });
      allEmbeddings.push(...response.data.map(d => d.embedding));
    }

    return allEmbeddings;
  } catch (err) {
    console.error('Batch embedding error, falling back to keyword embeddings:', err);
    return texts.map(t => generateKeywordEmbedding(t));
  }
}
