// API Configuration
export class ApiConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      api: {
        host: 'localhost',
        port: '3001',
        basePath: '/api',
        protocol: 'http'
      }
    };

    const envConfig = this.loadFromEnv();
    const windowConfig = this.loadFromWindow();

    return this.mergeConfig(defaults, envConfig, windowConfig);
  }

  loadFromEnv() {
    try {
      return {
        api: {
          host: process.env.API_HOST || undefined,
          port: process.env.API_PORT || undefined,
          basePath: process.env.API_BASE_PATH || undefined,
          protocol: process.env.API_PROTOCOL || undefined,
          baseUrl: process.env.FRONTEND_API_URL || undefined
        }
      };
    } catch (error) {
      console.warn('Environment variables not available, using defaults');
      return {};
    }
  }

  loadFromWindow() {
    try {
      return window.__APP_CONFIG__ || {};
    } catch (error) {
      return {};
    }
  }

  mergeConfig(defaults, env, window) {
    const merged = { ...defaults };

    if (env.api) {
      merged.api = { ...merged.api, ...env.api };
    }

    if (window.api) {
      merged.api = { ...merged.api, ...window.api };
    }

    return merged;
  }

  getApiBaseUrl() {
    const api = this.config.api;

    if (api.baseUrl) {
      return api.baseUrl.endsWith('/') ? api.baseUrl.slice(0, -1) : api.baseUrl;
    }

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
}

export const apiConfig = new ApiConfig();