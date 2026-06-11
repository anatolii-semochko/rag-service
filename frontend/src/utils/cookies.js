// Cookie Management Utilities

export class CookieManager {
  static set(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
  }

  static get(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        try {
          return JSON.parse(c.substring(nameEQ.length, c.length));
        } catch (e) {
          return c.substring(nameEQ.length, c.length);
        }
      }
    }
    return null;
  }

  static remove(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
  }

  static exists(name) {
    return this.get(name) !== null;
  }
}

// Chat Settings specific utilities
export class ChatSettings {
  static settingsKey = 'rag_chat_settings';

  static defaults = {
    // RAG Configuration
    useRAG: 'all', // 'none', 'all', 'partial'
    selectedCategories: [], // for partial mode

    // Search Strategies (possible: vector, hybrid, graph, agent)
    strategies: ['hybrid'], // array of selected strategies

    // AI Parameters
    temperature: 0.7,
    context: '',

    // Debug Options
    trace: false,
    dryRun: false
  };

  static load() {
    const saved = CookieManager.get(this.settingsKey);
    return saved ? { ...this.defaults, ...saved } : this.defaults;
  }

  static save(settings) {
    CookieManager.set(this.settingsKey, settings);
  }

  static update(partialSettings) {
    const current = this.load();
    const updated = { ...current, ...partialSettings };
    this.save(updated);
    return updated;
  }

  static reset() {
    CookieManager.remove(this.settingsKey);
    return this.defaults;
  }
}

// Session management utilities
export class SessionManager {
  static sessionKey = 'rag_chat_session_id';
  static activeTabKey = 'rag_active_tab';

  // Chat session management
  static getSessionId() {
    return CookieManager.get(this.sessionKey);
  }

  static setSessionId(sessionId) {
    if (sessionId) {
      CookieManager.set(this.sessionKey, sessionId, 7); // Session valid for 7 days
    } else {
      CookieManager.remove(this.sessionKey);
    }
  }

  static clearSession() {
    CookieManager.remove(this.sessionKey);
  }

  // Active tab management
  static getActiveTab() {
    return CookieManager.get(this.activeTabKey) || 'documents';
  }

  static setActiveTab(tabName) {
    CookieManager.set(this.activeTabKey, tabName, 30); // Remember for 30 days
  }

  // Collection selection for current session
  static getSelectedCollections() {
    const settings = ChatSettings.load();
    return settings.selectedCollections || [];
  }

  static setSelectedCollections(collectionIds) {
    return ChatSettings.update({ selectedCollections: collectionIds });
  }
}

// Unified storage utilities (replaces localStorage usage)
export class AppStorage {
  // Migration helper to move data from localStorage to cookies
  static migrateFromLocalStorage() {
    try {
      // Migrate chat session ID
      const chatSessionId = localStorage.getItem('chatSessionId');
      if (chatSessionId) {
        SessionManager.setSessionId(chatSessionId);
        localStorage.removeItem('chatSessionId');
      }

      // Migrate other settings if they exist in localStorage
      const keys = ['rag_temperature', 'rag_context', 'rag_useRAG'];
      const migrationData = {};

      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          try {
            migrationData[key.replace('rag_', '')] = JSON.parse(value);
            localStorage.removeItem(key);
          } catch {
            migrationData[key.replace('rag_', '')] = value;
            localStorage.removeItem(key);
          }
        }
      });

      if (Object.keys(migrationData).length > 0) {
        ChatSettings.update(migrationData);
      }

    } catch (error) {
      console.warn('Failed to migrate from localStorage:', error);
    }
  }

  // Generic storage methods using cookies
  static set(key, value, days = 30) {
    CookieManager.set(key, value, days);
  }

  static get(key, defaultValue = null) {
    const value = CookieManager.get(key);
    return value !== null ? value : defaultValue;
  }

  static remove(key) {
    CookieManager.remove(key);
  }

  static clear() {
    // Clear all our app-specific cookies
    const appKeys = [
      ChatSettings.settingsKey,
      SessionManager.sessionKey,
      SessionManager.activeTabKey
    ];

    appKeys.forEach(key => {
      CookieManager.remove(key);
    });
  }
}