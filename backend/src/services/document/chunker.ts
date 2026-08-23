export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number;
  tokenCount: number;
}

/**
 * Splits text into overlapping chunks for RAG.
 *
 * Strategy:
 * 1. Split on paragraph boundaries first (double newlines)
 * 2. If a paragraph is too long, split on sentence boundaries
 * 3. Combine small paragraphs into chunks up to targetTokens
 * 4. Add overlap between consecutive chunks
 */
export function chunkText(
  text: string,
  targetTokens = 1000,
  overlapTokens = 150,
  totalPages = 1
): TextChunk[] {
  // Rough token estimator: ~4 chars per token (English avg)
  const charPerToken = 4;
  const targetChars = targetTokens * charPerToken;
  const overlapChars = overlapTokens * charPerToken;

  // Split into paragraphs
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  // Estimate chars-per-page for page number tracking
  const totalChars = text.length;
  const charsPerPage = totalChars / Math.max(totalPages, 1);

  let charOffset = 0; // Track our position in the full text

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    // If a single paragraph exceeds target size, split it on sentences
    if (paragraph.length > targetChars) {
      const sentences = splitSentences(paragraph);
      for (const sentence of sentences) {
        if ((currentChunk + '\n\n' + sentence).length > targetChars && currentChunk.length > 0) {
          // Finalize current chunk
          const pageNumber = Math.min(
            totalPages,
            Math.ceil((charOffset - currentChunk.length / 2) / charsPerPage) + 1
          );
          chunks.push({
            content: currentChunk.trim(),
            chunkIndex,
            pageNumber: Math.max(1, pageNumber),
            tokenCount: Math.ceil(currentChunk.length / charPerToken),
          });
          chunkIndex++;
          // Start new chunk with overlap from previous
          currentChunk = getOverlap(currentChunk, overlapChars) + '\n\n' + sentence;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n\n' + sentence : sentence;
        }
        charOffset += sentence.length;
      }
    } else {
      if ((currentChunk + '\n\n' + paragraph).length > targetChars && currentChunk.length > 0) {
        // Finalize current chunk
        const pageNumber = Math.min(
          totalPages,
          Math.ceil((charOffset - currentChunk.length / 2) / charsPerPage) + 1
        );
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex,
          pageNumber: Math.max(1, pageNumber),
          tokenCount: Math.ceil(currentChunk.length / charPerToken),
        });
        chunkIndex++;
        // Overlap from previous chunk
        currentChunk = getOverlap(currentChunk, overlapChars) + '\n\n' + paragraph;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      }
      charOffset += paragraph.length;
    }
  }

  // Add the final chunk
  if (currentChunk.trim().length > 0) {
    const pageNumber = Math.min(
      totalPages,
      Math.ceil((totalChars - currentChunk.length / 2) / charsPerPage) + 1
    );
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex,
      pageNumber: Math.max(1, pageNumber),
      tokenCount: Math.ceil(currentChunk.length / charPerToken),
    });
  }

  // Filter out very short chunks (likely noise)
  return chunks.filter(c => c.tokenCount >= 10);
}

/**
 * Returns the last `maxChars` characters of text to use as overlap.
 */
function getOverlap(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  // Try to start at sentence boundary
  const tail = text.slice(-maxChars);
  const sentenceStart = tail.search(/[A-Z]/);
  if (sentenceStart > 0 && sentenceStart < maxChars / 2) {
    return tail.slice(sentenceStart);
  }
  return tail;
}

/**
 * Splits text into sentences using simple regex.
 */
function splitSentences(text: string): string[] {
  // Split on '. ', '! ', '? ', but keep the punctuation
  const sentences: string[] = [];
  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let current = '';

  for (const part of raw) {
    if ((current + ' ' + part).length < 600) {
      current = current ? current + ' ' + part : part;
    } else {
      if (current) sentences.push(current);
      current = part;
    }
  }
  if (current) sentences.push(current);

  return sentences.filter(s => s.trim().length > 0);
}
