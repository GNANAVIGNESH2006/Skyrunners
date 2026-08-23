import fs from 'fs';
import path from 'path';

export interface ExtractionResult {
  text: string;
  pageCount: number;
  method: string;
}

/**
 * Extracts text from a document file.
 * Supports: PDF, DOCX, TXT, MD
 */
export async function extractText(filePath: string, fileType: string): Promise<ExtractionResult> {
  const ext = fileType.toLowerCase().replace('.', '');

  switch (ext) {
    case 'pdf':
      return extractPdf(filePath);
    case 'docx':
      return extractDocx(filePath);
    case 'txt':
    case 'md':
      return extractPlainText(filePath);
    default:
      // Try plain text as fallback
      return extractPlainText(filePath);
  }
}

async function extractPdf(filePath: string): Promise<ExtractionResult> {
  // Dynamic import to handle commonjs module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');

  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  const text = data.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text,
    pageCount: data.numpages || 1,
    method: 'pdf-parse',
  };
}

async function extractDocx(filePath: string): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mammoth = require('mammoth');

  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Estimate page count (roughly 500 words per page)
  const wordCount = text.split(/\s+/).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));

  return {
    text,
    pageCount,
    method: 'mammoth',
  };
}

async function extractPlainText(filePath: string): Promise<ExtractionResult> {
  const text = fs.readFileSync(filePath, 'utf-8')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const wordCount = text.split(/\s+/).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));

  return {
    text,
    pageCount,
    method: 'plain-text',
  };
}

/**
 * Cleans and normalizes extracted text.
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')               // Normalize line endings
    .replace(/\t/g, ' ')                  // Tabs to spaces
    .replace(/[ ]{2,}/g, ' ')            // Multiple spaces to single
    .replace(/\n{3,}/g, '\n\n')          // Too many newlines
    .replace(/[^\x20-\x7E\n\u00C0-\u024F\u0400-\u04FF]/g, '') // Remove non-printable
    .trim();
}

/**
 * Gets the file extension from a filename.
 */
export function getFileType(fileName: string): string {
  return path.extname(fileName).toLowerCase().replace('.', '') || 'txt';
}
