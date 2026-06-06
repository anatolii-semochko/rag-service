export interface Collection {
  id: string;
  name: string;
  description?: string;
  documentsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'image';
  size: number;
  status: 'processing' | 'completed' | 'error';
  metadata?: {
    folder?: string;
    tags?: string[];
    [key: string]: any;
  };
  collectionId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  context?: Array<{
    documentId: string;
    chunk: string;
    similarity: number;
  }>;
}

export interface SearchResult {
  id: string;
  content: string;
  documentId: string;
  documentName: string;
  similarity: number;
  metadata: Record<string, any>;
}

export interface APIResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}