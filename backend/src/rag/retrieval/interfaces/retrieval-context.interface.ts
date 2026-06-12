import { RetrievalMode } from '../enums/retrieval-mode.enum';

export interface RetrievalOptions {
  mode?: RetrievalMode;
  limit?: number;
  threshold?: number;
  collectionIds?: string[];
  vectorWeight?: number;
  keywordWeight?: number;
  graphWeight?: number;
  useReranking?: boolean;
  useQueryExpansion?: boolean;
  includeMetadata?: boolean;
  temperature?: number;
}