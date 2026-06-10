export interface RetrievalResult {
  chunks: RetrievalChunk[];
  totalScore: number;
  metadata?: {
    vectorResults?: number;
    keywordResults?: number;
    graphResults?: number;
    processingTime?: number;
    mode?: string;
    queryAnalysis?: any;
    queriesUsed?: number;
  };
}

export interface RetrievalChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  collectionId: string;
  collectionName: string;
  categoryId: string;
  categoryName?: string;
  content: string;
  score: number;
  page?: number;
  metadata?: {
    vectorScore?: number;
    keywordScore?: number;
    graphScore?: number;
    position?: number;
    length?: number;
    tokenCount?: number;
    aiRankingScore?: number;
    originalScore?: number;
    semanticScore?: number;
    termOverlapScore?: number;
    positionScore?: number;
    qualityScore?: number;
    hybridScore?: number;
    authorityScore?: number;
    freshnessScore?: number;
    termMatches?: number;
    agentScore?: number;
    strategiesUsed?: string[];
    diversityScore?: number;
  };
}