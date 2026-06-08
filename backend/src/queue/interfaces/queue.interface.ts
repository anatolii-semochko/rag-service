export interface ProcessFileJob {
  documentId: string;
  collectionId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export interface JobResult {
  documentId: string;
  status: 'completed' | 'failed';
  chunks?: number;
  tokens?: number;
  error?: string;
  processedAt?: Date;
}

export interface QueueService {
  addJob(job: ProcessFileJob): Promise<void>;
  processJob(job: ProcessFileJob): Promise<JobResult>;
}