import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import type { SearchResult } from '../../types';

dotenv.config();

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }

  return geminiClient;
}

export function isLLMConfigured(): boolean {
  return getGemini() !== null;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are KnowBase AI, a document-grounded knowledge assistant.

Your ONLY job is to answer questions using the document excerpts provided to you in the context.

STRICT RULES YOU MUST FOLLOW:

1. Answer ONLY using information explicitly present in the provided context excerpts.
2. Do NOT use your general knowledge, training data, or any external information.
3. Do NOT fabricate, infer, or extrapolate facts, numbers, dates, names, policies, or procedures.
4. If the answer is not clearly supported by the context, respond EXACTLY:
"I couldn't find this information in the provided documents."
5. When answering, cite which source document the information came from.
6. Keep your answer focused, accurate, and concise.
7. If only partial information is available, share what you found and clearly state what is missing.
8. Never make assumptions about policies not mentioned in the documents.

FORMAT:

- Give a clear, direct answer.
- At the end of your answer, mention the source document(s).
- If multiple documents provide relevant information, combine them coherently.

Remember:
It is BETTER to say "I don't know" than to guess incorrectly.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LLMResponse {
  answer: string;
  answered: boolean;
  mode: 'gemini' | 'fallback';
}

// ─── Generate Grounded Answer ─────────────────────────────────────────────────

export async function generateGroundedAnswer(
  question: string,
  sources: SearchResult[],
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }> = []
): Promise<LLMResponse> {

  // No retrieved sources = don't call Gemini
  if (!sources || sources.length === 0) {
    return {
      answer:
        "I couldn't find this information in the provided documents.",
      answered: false,
      mode: 'fallback',
    };
  }

  const client = getGemini();

  // Gemini API key not configured
  if (!client) {
    return generateFallbackAnswer(question, sources);
  }

  // ─── Build retrieved context ────────────────────────────────────────────────

  const contextBlock = sources
    .map(
      (source, index) =>
        `[Source ${index + 1}]
Document: ${source.file_name}
Page: ${source.page_number}

${source.content}`
    )
    .join('\n\n--------------------------------\n\n');

  // ─── Build conversation history ─────────────────────────────────────────────

  const historyBlock = conversationHistory
    .slice(-12)
    .map(
      (message) =>
        `${message.role === 'user' ? 'USER' : 'ASSISTANT'}: ${message.content}`
    )
    .join('\n\n');

  // ─── Build final prompt ─────────────────────────────────────────────────────

  const userMessage = `
${SYSTEM_PROMPT}

CONVERSATION HISTORY:
${historyBlock || 'No previous conversation.'}

==================================================
KNOWLEDGE BASE CONTEXT
==================================================

${contextBlock}

==================================================
CURRENT USER QUESTION
==================================================

${question}

==================================================

Answer the current question using ONLY the knowledge-base context above.

If the context does not contain enough information, respond exactly:

"I couldn't find this information in the provided documents."
`;

  try {
    const model =
      process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    console.log('🤖 Sending request to Gemini...');
    console.log('Model:', model);
    console.log('Sources:', sources.length);

    const response = await client.models.generateContent({
      model,
      contents: userMessage,
      config: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      },
    });

    const answer = response.text?.trim() || '';

    console.log('✅ Gemini response received');

    // Gemini returned nothing
    if (!answer) {
      console.error('❌ Gemini returned an empty response.');

      return {
        answer:
          "I couldn't generate an answer from the provided documents.",
        answered: false,
        mode: 'fallback',
      };
    }

    const lowerAnswer = answer.toLowerCase();

    const answered =
      !lowerAnswer.includes("couldn't find") &&
      !lowerAnswer.includes('not found') &&
      !lowerAnswer.includes('not available') &&
      !lowerAnswer.includes('no information');

    return {
      answer,
      answered,
      mode: 'gemini',
    };

  } catch (error: any) {

    // ─── IMPORTANT: Show the REAL Gemini error ────────────────────────────────

    console.error('❌ Gemini LLM error:', error);

    const errorMessage =
      error?.message ||
      error?.error?.message ||
      String(error) ||
      'Unknown Gemini API error';

    console.error('❌ Gemini error message:', errorMessage);

    return {
      answer:
        `⚠️ Gemini API error:\n\n${errorMessage}\n\n` +
        `The document retrieval system is working, but Gemini could not generate the final answer.`,
      answered: false,
      mode: 'fallback',
    };
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function generateFallbackAnswer(
  _question: string,
  sources: SearchResult[]
): LLMResponse {

  if (!sources || sources.length === 0) {
    return {
      answer:
        "I couldn't find this information in the provided documents.",
      answered: false,
      mode: 'fallback',
    };
  }

  const parts = sources.slice(0, 3).map(
    (source) =>
      `**From ${source.file_name} (Page ${source.page_number}):**\n\n` +
      `${source.content.slice(0, 600)}` +
      `${source.content.length > 600 ? '...' : ''}`
  );

  const answer =
    `⚠️ *Gemini is not configured. Showing raw retrieved passages:*\n\n` +
    parts.join('\n\n---\n\n');

  return {
    answer,
    answered: true,
    mode: 'fallback',
  };
}