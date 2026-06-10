import { Injectable } from '@nestjs/common';
import { ChunkData } from '../interfaces/llm-provider.interface';

@Injectable()
export class ChunkingService {
  private readonly maxTokensPerChunk: number = 500;
  private readonly overlapTokens: number = 50; // Overlap between chunks

  /**
   * Splits text into chunks with a specified number of tokens
   */
  chunkText(text: string): ChunkData[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks: ChunkData[] = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let currentTokens = 0;
    let startIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.estimateTokens(sentence);

      // If adding sentence exceeds limit, save current chunk
      if (currentTokens + sentenceTokens > this.maxTokensPerChunk && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
          startIndex,
          endIndex: text.indexOf(currentChunk) + currentChunk.length
        });

        // Create overlap for the next chunk
        const overlapText = this.createOverlap(currentChunk);
        currentChunk = overlapText + sentence;
        currentTokens = this.estimateTokens(currentChunk);
        startIndex = text.indexOf(currentChunk);
      } else {
        // Add sentence to current chunk
        if (currentChunk.length === 0) {
          currentChunk = sentence;
          startIndex = text.indexOf(sentence);
        } else {
          currentChunk += ' ' + sentence;
        }
        currentTokens += sentenceTokens;
      }

      // If sentence itself exceeds limit, split it
      if (sentenceTokens > this.maxTokensPerChunk) {
        const wordChunks = this.chunkByWords(sentence);
        for (const wordChunk of wordChunks) {
          chunks.push({
            text: wordChunk.text,
            tokens: wordChunk.tokens,
            startIndex: text.indexOf(wordChunk.text),
            endIndex: text.indexOf(wordChunk.text) + wordChunk.text.length
          });
        }
        currentChunk = '';
        currentTokens = 0;
      }
    }

    // Add last chunk if it's not empty
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens,
        startIndex,
        endIndex: startIndex + currentChunk.length
      });
    }

    return chunks;
  }

  /**
   * Splits text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence split by period, question mark and exclamation mark
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Estimates the number of tokens in text
   * Approximate formula: 1 token ≈ 0.75 words ≈ 4 characters
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;

    // Count words
    const words = text.split(/\s+/).filter(word => word.length > 0);

    // 1 token ≈ 0.75 words
    return Math.ceil(words.length / 0.75);
  }

  /**
   * Creates overlap for the next chunk
   */
  private createOverlap(chunk: string): string {
    const words = chunk.split(/\s+/);
    const overlapWords = Math.min(this.overlapTokens, Math.floor(words.length * 0.2)); // 20% overlap

    if (overlapWords === 0) return '';

    return words.slice(-overlapWords).join(' ') + ' ';
  }

  /**
   * Splits long sentence into chunks by words
   */
  private chunkByWords(sentence: string): ChunkData[] {
    const words = sentence.split(/\s+/);
    const chunks: ChunkData[] = [];

    let currentChunk = '';
    let currentTokens = 0;

    for (const word of words) {
      const wordTokens = this.estimateTokens(word);

      if (currentTokens + wordTokens > this.maxTokensPerChunk && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
          startIndex: 0, // Will be recalculated later
          endIndex: 0
        });

        currentChunk = word;
        currentTokens = wordTokens;
      } else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
        currentTokens += wordTokens;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens,
        startIndex: 0,
        endIndex: 0
      });
    }

    return chunks;
  }

  /**
   * Extracts text from different file types
   */
  extractTextFromFile(fileBuffer: Buffer, mimeType: string, filename: string): string {
    try {
      switch (mimeType) {
        case 'text/plain':
        case 'text/markdown':
        case 'application/json':
          return fileBuffer.toString('utf-8');

        case 'application/pdf':
          // TODO: Implement PDF parsing when we add pdf-parse
          return '[PDF parsing not implemented yet]';

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          // TODO: Implement DOCX parsing
          return '[DOCX parsing not implemented yet]';

        default:
          if (mimeType.startsWith('text/')) {
            return fileBuffer.toString('utf-8');
          }
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error);
      throw new Error(`Failed to extract text from file: ${error.message}`);
    }
  }
}