// HTTP Client for API requests
export class ApiClient {
  constructor(config) {
    this.config = config;
  }

  async request(endpoint, options = {}) {
    const url = this.config.buildApiUrl(endpoint);
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async patch(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async upload(endpoint, formData, options = {}) {
    const url = this.config.buildApiUrl(endpoint);
    const config = {
      method: 'POST',
      body: formData,
      ...options,
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (config.headers && config.headers['Content-Type']) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`Upload failed! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Upload failed: ${endpoint}`, error);
      throw error;
    }
  }
}