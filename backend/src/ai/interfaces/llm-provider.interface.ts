export interface LLMProvider {
  generate(input: string): Promise<string>;
  embeddings(text: string): Promise<number[]>;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface ChunkData {
  text: string;
  tokens: number;
  startIndex: number;
  endIndex: number;
}

export interface ProcessingResult {
  chunks: ChunkData[];
  embeddings: EmbeddingResult[];
  totalTokens: number;
  status: 'completed' | 'failed' | 'processing';
  error?: string;
}