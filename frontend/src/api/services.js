// API Services
import { ApiClient } from './client.js';
import { apiConfig } from './config.js';

class BaseService {
  constructor() {
    this.client = new ApiClient(apiConfig);
  }
}

// Categories Service
export class CategoriesService extends BaseService {
  async getCategories() {
    return this.client.get('/categories');
  }

  async getCategory(categoryId) {
    return this.client.get(`/categories/${categoryId}`);
  }

  async createCategory(categoryData) {
    return this.client.post('/categories', categoryData);
  }

  async updateCategory(id, categoryData) {
    return this.client.patch(`/categories/${id}`, categoryData);
  }

  async deleteCategory(id) {
    return this.client.delete(`/categories/${id}`);
  }

  async toggleCategory(id, isActive) {
    return this.client.patch(`/categories/${id}`, { isActive: !isActive });
  }
}

// Collections Service
export class CollectionsService extends BaseService {
  async getCollections(categoryId = null) {
    const endpoint = categoryId ? `/categories/${categoryId}/collections` : '/collections';
    return this.client.get(endpoint);
  }

  async getCollectionsByCategory(categoryId) {
    return this.client.get(`/categories/${categoryId}/collections`);
  }

  async getCollection(collectionId) {
    return this.client.get(`/collections/${collectionId}`);
  }

  async createCollection(collectionData) {
    return this.client.post('/collections', collectionData);
  }

  async updateCollection(id, collectionData) {
    return this.client.patch(`/collections/${id}`, collectionData);
  }

  async deleteCollection(id) {
    return this.client.delete(`/collections/${id}`);
  }

  async toggleCollection(id, isActive) {
    return this.client.patch(`/collections/${id}`, { isActive: !isActive });
  }

  async getActiveCollections() {
    return this.client.get('/collections/active');
  }
}

// Documents Service
export class DocumentsService extends BaseService {
  async getDocuments(collectionId = null) {
    if (!collectionId) {
      throw new Error('Collection ID is required to get documents');
    }
    return this.client.get(`/documents/collection/${collectionId}`);
  }

  async getDocumentsByCollection(collectionId) {
    return this.client.get(`/documents/collection/${collectionId}`);
  }

  async getDocument(id) {
    return this.client.get(`/documents/${id}`);
  }

  async getDocumentContent(id) {
    return this.client.get(`/documents/${id}/content`);
  }

  async uploadDocuments(collectionId, files, metadata = {}) {
    // Backend accepts only single file uploads, so upload files one by one
    const results = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('collectionId', collectionId);
      formData.append('file', file);

      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.description) formData.append('description', metadata.description);

      try {
        const result = await this.client.upload('/documents/upload', formData);
        results.push(result);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return { data: results, uploadedCount: results.length };
  }

  async deleteDocument(id) {
    return this.client.delete(`/documents/${id}`);
  }

  async reprocessDocument(id) {
    return this.client.post(`/documents/${id}/reprocess`);
  }

  async toggleDocument(id, isActive) {
    return this.client.patch(`/documents/${id}/toggle-active`, { isActive: !isActive });
  }
}

// Chat Service
export class ChatService extends BaseService {
  async sendMessage(message, options = {}) {
    const payload = {
      message,
      sessionId: options.sessionId || null,
      collectionIds: options.collectionIds || [],
      context: options.context || '',
      temperature: options.temperature || 0.7,
      useRAG: options.useRAG !== undefined ? options.useRAG : true,
      retrievalMode: options.retrievalMode || 'hybrid',
      vectorWeight: options.vectorWeight || 0.7,
      keywordWeight: options.keywordWeight || 0.3
    };

    return this.client.post('/chat', payload);
  }

  async getChatSessions(userId = null) {
    const endpoint = userId ? `/chat/sessions?userId=${userId}` : '/chat/sessions';
    return this.client.get(endpoint);
  }

  async getChatHistory(sessionId) {
    return this.client.get(`/chat/sessions/${sessionId}/messages`);
  }
}

// Vector Service
export class VectorService extends BaseService {
  async search(query, limit = 5, threshold = 0.7) {
    return this.client.post('/vector/search', {
      query,
      limit,
      threshold
    });
  }

  async getStats() {
    return this.client.get('/vector/stats');
  }
}

// Queue Service
export class QueueService extends BaseService {
  async getQueueStats() {
    return this.client.get('/queue/stats');
  }

  async getDocumentStatus(documentId) {
    return this.client.get(`/queue/status/${documentId}`);
  }
}

// Export service instances
export const categoriesService = new CategoriesService();
export const collectionsService = new CollectionsService();
export const documentsService = new DocumentsService();
export const chatService = new ChatService();
export const vectorService = new VectorService();
export const queueService = new QueueService();