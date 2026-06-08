// Configuration management for the frontend application
class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Default configuration
    const defaults = {
      api: {
        host: 'localhost',
        port: '3001',
        basePath: '/api',
        protocol: 'http'
      }
    };

    // Try to load from environment variables (if available via build process)
    const envConfig = this.loadFromEnv();

    // Try to load from window configuration (if injected during build)
    const windowConfig = this.loadFromWindow();

    // Merge configurations with priority: window > env > defaults
    return this.mergeConfig(defaults, envConfig, windowConfig);
  }

  loadFromEnv() {
    // In a real production setup, these would be injected during build
    // For now, we'll use process.env if available (webpack/vite) or fallback
    try {
      return {
        api: {
          host: process.env.API_HOST || undefined,
          port: process.env.API_PORT || undefined,
          basePath: process.env.API_BASE_PATH || undefined,
          protocol: process.env.API_PROTOCOL || undefined,
          // Alternative: full URL override
          baseUrl: process.env.FRONTEND_API_URL || undefined
        }
      };
    } catch (error) {
      console.warn('Environment variables not available, using defaults');
      return {};
    }
  }

  loadFromWindow() {
    // Allow configuration injection via window object
    try {
      return window.__APP_CONFIG__ || {};
    } catch (error) {
      return {};
    }
  }

  mergeConfig(defaults, env, window) {
    const merged = { ...defaults };

    // Merge environment config
    if (env.api) {
      merged.api = { ...merged.api, ...env.api };
    }

    // Merge window config (highest priority)
    if (window.api) {
      merged.api = { ...merged.api, ...window.api };
    }

    return merged;
  }

  getApiBaseUrl() {
    const api = this.config.api;

    // If full baseUrl is provided, use it directly
    if (api.baseUrl) {
      return api.baseUrl.endsWith('/') ? api.baseUrl.slice(0, -1) : api.baseUrl;
    }

    // Otherwise, construct from components
    const protocol = api.protocol || 'http';
    const host = api.host || 'localhost';
    const port = api.port || '3001';
    const basePath = api.basePath || '/api';

    const baseUrl = `${protocol}://${host}:${port}${basePath}`;
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  buildApiUrl(endpoint) {
    const baseUrl = this.getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  // Convenience methods for common API endpoints
  getCategoriesUrl() {
    return this.buildApiUrl('/categories');
  }

  getCategoryUrl(id) {
    return this.buildApiUrl(`/categories/${id}`);
  }

  getCategoryCollectionsUrl(categoryId) {
    return this.buildApiUrl(`/categories/${categoryId}/collections`);
  }

  getCollectionsUrl() {
    return this.buildApiUrl('/collections');
  }

  getCollectionUrl(id) {
    return this.buildApiUrl(`/collections/${id}`);
  }

  getCollectionDocumentsUrl(collectionId) {
    return this.buildApiUrl(`/documents/collection/${collectionId}`);
  }

  getDocumentUrl(id) {
    return this.buildApiUrl(`/documents/${id}`);
  }

  getDocumentContentUrl(id) {
    return this.buildApiUrl(`/documents/${id}/content`);
  }

  getDocumentUploadUrl() {
    return this.buildApiUrl('/documents/upload');
  }

  getDocumentReprocessUrl(id) {
    return this.buildApiUrl(`/documents/${id}/reprocess`);
  }

  getQueueStatusUrl(documentId) {
    return this.buildApiUrl(`/queue/status/${documentId}`);
  }

  getQueueStatsUrl() {
    return this.buildApiUrl('/queue/stats');
  }

  // Debug method to log current configuration
  debugConfig() {
    console.log('Current API Configuration:', {
      baseUrl: this.getApiBaseUrl(),
      config: this.config
    });
  }
}

// Create and export singleton instance
const config = new Config();

// Development helper - log config in development mode
if (config.config.api.host === 'localhost') {
  console.log('🔧 API Configuration loaded:', config.getApiBaseUrl());
}

export default config;