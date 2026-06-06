export interface LLMProvider {
  generate(input: string, context?: string): Promise<string>;
  embeddings(text: string): Promise<number[]>;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface ChunkingOptions {
  chunkSize: number;
  overlap: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
}

export interface HybridSearchOptions extends VectorSearchOptions {
  includeFullText?: boolean;
  weights?: {
    vector: number;
    fullText: number;
  };
}

export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'image';

export interface DocumentMetadata {
  filename: string;
  fileType: FileType;
  size: number;
  folder?: string;
  tags?: string[];
  uploadedAt: Date;
}