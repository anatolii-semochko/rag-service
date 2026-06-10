import { RetrievalResult } from './retrieval-result.interface';
import { RetrievalOptions } from './retrieval-context.interface';

export interface RetrievalStrategy {
  retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievalResult>;

  getName(): string;
}