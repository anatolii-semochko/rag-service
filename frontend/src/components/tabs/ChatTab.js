// Chat Tab Component
import { BaseComponent } from '../common/BaseComponent.js';
import { chatService, collectionsService, categoriesService } from '../../api/services.js';
import { dateUtils, stringUtils } from '../../utils/helpers.js';
import { SessionManager, ChatSettings } from '../../utils/cookies.js';
import { Session } from '../../utils/Session.js';

export class ChatTab extends BaseComponent {
  constructor() {
    super();

    // Load settings from cookies
    const chatSettings = ChatSettings.load();

    this.state = {
      messages: [],
      loading: false,
      sessionId: SessionManager.getSessionId(),
      collections: [],
      categories: [],
      selectedCollections: chatSettings.selectedCategories,
      showSettings: false,
      temperature: chatSettings.temperature,
      context: chatSettings.context,
      currentMessage: '',
      useRAG: chatSettings.useRAG, // 'none', 'all', 'partial'
      selectedCategories: chatSettings.selectedCategories,
      strategies: chatSettings.strategies,
      loadingHistory: false,
      // New debug settings
      trace: chatSettings.trace,
      dryRun: chatSettings.dryRun
    };

    // Initialize session
    this.session = new Session();

    this.initializeData();
  }

  async initializeData() {
    try {
      // Load categories and collections
      const [categoriesResponse, collectionsResponse] = await Promise.all([
        categoriesService.getCategories(),
        collectionsService.getActiveCollections()
      ]);

      const categories = categoriesResponse.data || [];
      const collections = collectionsResponse.data || [];

      this.setState({
        categories,
        collections
      });

      // Load chat history
      await this.loadChatHistory();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async loadChatHistory() {
    try {
      // Load last session from cookies
      const storedSessionId = SessionManager.getSessionId();

      if (storedSessionId) {
        this.state.loadingHistory = true;
        this.updateHistoryLoadingState();

        const historyResponse = await chatService.getChatHistory(storedSessionId);
        const messages = historyResponse.data || [];

        // Check if session actually exists (has messages)
        if (messages.length > 0) {
          this.state.sessionId = storedSessionId;
          this.state.messages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.createdAt,
            context: msg.metadata?.contextSources ?
              msg.metadata.contextSources.map(source => ({ documentName: source, relevance: 0.8 })) : []
          }));
          this.state.loadingHistory = false;

          // Manually render all messages to DOM
          this.renderMessagesToDOM();
          this.scrollToBottom();
        } else {
          // Session is empty, clear it
          SessionManager.clearSession();
          this.state.loadingHistory = false;
          this.updateHistoryLoadingState();
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      SessionManager.clearSession();
      this.state.loadingHistory = false;
      this.updateHistoryLoadingState();
    }
  }

  updateHistoryLoadingState() {
    const messagesContainer = this.$('#chatMessages');
    if (!messagesContainer) return;

    if (this.state.loadingHistory) {
      messagesContainer.innerHTML = `
        <div class="chat-loading">
          <span class="loading-spinner"></span>
          Loading chat history...
        </div>
      `;
    } else if (this.state.messages.length === 0) {
      messagesContainer.innerHTML = this.renderEmptyState();
    }
  }

  renderMessagesToDOM() {
    const messagesContainer = this.$('#chatMessages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';
    this.state.messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `chat-message ${message.role}`;
      messageElement.innerHTML = `
        <div class="message-content">${this.escapeHtml(message.content)}</div>
        ${this.renderMessageSources(message)}
        ${message.timestamp ? `<div class="message-timestamp">${this.formatTimeAgo(message.timestamp)}</div>` : ''}
      `;
      messagesContainer.appendChild(messageElement);
    });
  }

  template() {
    return `
        <div class="container-header">
          <h2>💬 RAG Chat</h2>
          <div class="container-header-actions">
            <button
              class="btn btn-primary"
              onclick="window.app.startNewChat()"
              title="Start new chat session"
            >
              🆕 New Chat
            </button>
            <button
              class="btn btn-ghost"
              onclick="window.app.clearChat()"
              title="Clear current chat history"
              ${this.state.messages.length === 0 ? 'disabled' : ''}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <div class="chat-body" style="height: calc(100vh - 215px)">
          <div class="chat-main">
            <div class="chat-messages" id="chatMessages">
              ${this.renderMessages()}
            </div>
            <div class="chat-input-container">
              <form class="chat-input-form" onsubmit="window.app.sendMessage(event)">
                <textarea
                  id="messageInput"
                  class="chat-input"
                  placeholder="Ask me anything about your documents..."
                  rows="1"
                  ${this.state.loading ? 'disabled' : ''}
                ></textarea>
                <button
                  type="submit"
                  class="chat-send-button"
                  ${this.state.loading ? 'disabled' : ''}
                >
                  ${this.state.loading ? '⏳ Sending...' : '📤 Send'}
                </button>
              </form>
            </div>
          </div>

          <div class="chat-settings show" id="chatSettings">
            ${this.renderKnowledgeBaseSettings()}
          </div>
        </div>
    `;
  }

  renderMessages() {
    if (this.state.loadingHistory) {
      return `
        <div class="chat-loading">
          <span class="loading-spinner"></span>
          Loading chat history...
        </div>
      `;
    }

    if (this.state.loading && this.state.messages.length === 0) {
      return `
        <div class="chat-loading">
          <span class="loading-spinner"></span>
          Loading chat...
        </div>
      `;
    }

    if (this.state.messages.length === 0) {
      return `
        <div class="chat-empty">
          <div class="chat-empty-icon">💬</div>
          <div class="chat-empty-text">Start a conversation</div>
          <div class="chat-empty-subtext">
            I can help you find information from your uploaded documents.<br>
            Ask me anything about your documents...
          </div>
        </div>
      `;
    }

    return this.state.messages.map(message => `
      <div class="chat-message ${message.role}">
        <div class="message-content">${stringUtils.escapeHtml(message.content)}</div>
        ${this.renderMessageSources(message)}
        ${message.timestamp ? `<div class="message-timestamp">${dateUtils.formatTimeAgo(message.timestamp)}</div>` : ''}
      </div>
    `).join('');
  }

  renderMessageSources(message) {
    const sourcesHtml = this.renderSources(message);
    const traceHtml = this.renderTrace(message);

    if (!sourcesHtml && !traceHtml) {
      return '';
    }

    return `
      <div class="message-metadata">
        ${sourcesHtml}
        ${traceHtml}
      </div>
    `;
  }

  renderSources(message) {
    if (!message.context || message.context.length === 0) {
      return '';
    }

    return `
      <div class="message-sources">
        <div class="sources-header" onclick="window.app.toggleSources(this)">
          📚 Sources (${message.context.length})
          <span class="sources-toggle">▼</span>
        </div>
        <div class="sources-list" style="display: none;">
          ${message.context.map(source => `
            <div class="source-item">
              📄 ${stringUtils.escapeHtml(source.documentName)}
              <span class="source-relevance">${Math.round(source.relevance * 100)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderTrace(message) {
    if (!message.trace || !this.state.trace) {
      return '';
    }

    const trace = message.trace;
    if (!trace.steps || trace.steps.length === 0) {
      return '';
    }

    return `
      <div class="message-trace">
        <div class="trace-header" onclick="window.app.toggleTraceDisplay(this)">
          🔍 RAG Process Trace (${trace.steps.length} steps)
          <span class="trace-toggle">▼</span>
        </div>
        <div class="trace-content" style="display: none;">
          ${this.renderTraceSteps(trace)}
        </div>
      </div>
    `;
  }

  renderTraceSteps(trace) {
    const formatTime = (ms) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

    return `
      <div class="trace-summary">
        <div class="trace-item">
          <strong>Query:</strong> ${stringUtils.escapeHtml(trace.query)}
        </div>
        <div class="trace-item">
          <strong>Session ID:</strong> ${trace.sessionId}
        </div>
        <div class="trace-item">
          <strong>Total Time:</strong> ${formatTime(trace.totalTime)}
        </div>
        ${trace.error ? `<div class="trace-error">❌ Error: ${stringUtils.escapeHtml(trace.error)}</div>` : ''}
      </div>

      <div class="trace-steps">
        ${trace.steps.map((step, index) => `
          <div class="trace-step">
            <div class="trace-step-header">
              <span class="trace-step-number">${index + 1}</span>
              <span class="trace-step-name">${stringUtils.escapeHtml(step.step)}</span>
              ${step.timestamp ? `<span class="trace-step-time">${formatTime(step.timestamp - trace.startTime)}ms</span>` : ''}
            </div>
            <div class="trace-step-data">
              <pre>${stringUtils.escapeHtml(JSON.stringify(step.data, null, 2))}</pre>
            </div>
          </div>
        `).join('')}
      </div>

      ${trace.finalContext && trace.finalContext.length > 0 ? `
        <div class="trace-final-context">
          <h4>Retrieved Context (${trace.finalContext.length} chunks):</h4>
          ${trace.finalContext.map((ctx, idx) => `
            <div class="trace-context-item">
              <strong>Chunk ${idx + 1}:</strong> ${stringUtils.escapeHtml(ctx.documentName)}
              (Score: ${ctx.relevance ? Math.round(ctx.relevance * 100) : 'N/A'}%)
              <div class="trace-context-content">${stringUtils.escapeHtml(ctx.content.substring(0, 200))}...</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${trace.generatedPrompt ? `
        <div class="trace-prompt">
          <h4>Generated Prompt:</h4>
          <pre class="trace-prompt-content">${stringUtils.escapeHtml(trace.generatedPrompt.substring(0, 500))}...</pre>
        </div>
      ` : ''}

      ${trace.llmResponse ? `
        <div class="trace-llm-response">
          <h4>LLM Response:</h4>
          <div class="trace-response-content">${stringUtils.escapeHtml(trace.llmResponse.substring(0, 300))}...</div>
        </div>
      ` : ''}
    `;
  }

  renderKnowledgeBaseSettings() {
    return `
      <div class="settings-section">
        <h4><span class="settings-icon">🎛️</span> RAG Configuration</h4>

        <div class="form-group">
          <label class="form-label">Use RAG (Retrieval-Augmented Generation)</label>
          <div class="radio-group">
            <label class="radio-item">
              <input
                type="radio"
                name="useRAG"
                value="none"
                ${this.state.useRAG === 'none' ? 'checked' : ''}
                onchange="window.app.updateUseRAG('none')"
              >
              <div class="radio-help">Direct LLM without document retrieval</div>
            </label>
            <label class="radio-item">
              <input
                type="radio"
                name="useRAG"
                value="all"
                ${this.state.useRAG === 'all' ? 'checked' : ''}
                onchange="window.app.updateUseRAG('all')"
              >
              <div class="radio-help">Search across all active categories</div>
            </label>
            <label class="radio-item">
              <input
                type="radio"
                name="useRAG"
                value="partial"
                ${this.state.useRAG === 'partial' ? 'checked' : ''}
                onchange="window.app.updateUseRAG('partial')"
              >
              <div class="radio-help">Search only in selected categories</div>
            </label>
          </div>
        </div>

        ${this.state.useRAG === 'partial' ? this.renderCategoriesSelection() : ''}
      </div>

      ${this.state.useRAG !== 'none' ? `
        <div class="settings-section">
          <h4><span class="settings-icon">🔎</span> Search Strategies</h4>
          <div class="form-group">
            <div class="checkbox-group">
              ${this.renderStrategiesSelection()}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="settings-section">
        <h4><span class="settings-icon">🎛️</span> AI Parameters</h4>

        <div class="form-group">
          <label class="form-label">Temperature: ${this.state.temperature}</label>
          <input
            type="range"
            class="range-slider"
            min="0"
            max="1"
            step="0.1"
            value="${this.state.temperature}"
            onchange="window.app.updateTemperature(this.value)"
          >
          <div class="temperature-display">
            Lower = more focused, Higher = more creative
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Additional Context</label>
          <textarea
            class="form-control"
            placeholder="Provide specific instructions or context..."
            rows="3"
            onchange="window.app.updateContext(this.value)"
          >${this.state.context}</textarea>
          <div class="settings-help">
            Add specific instructions to guide the AI's responses
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4><span class="settings-icon">🔍</span> Debug Settings</h4>

        <div class="form-group">
          <div class="rag-setting">
            <span class="rag-label">Enable Trace (show RAG process steps)</span>
            <button
              class="toggle-switch ${this.state.trace ? 'active' : ''}"
              style="float: right"
              onclick="window.app.toggleTrace(!${this.state.trace})"
            >
              <span class="switch-slider"></span>
            </button>
          </div>
          <div class="settings-help">
            Shows detailed information about the RAG retrieval process
          </div>
        </div>

        <div class="form-group">
          <div class="rag-setting">
            <span class="rag-label">Dry Run (test without LLM call)</span>
            <button
              class="toggle-switch ${this.state.dryRun ? 'active' : ''}"
              style="float: right"
              onclick="window.app.toggleDryRun(!${this.state.dryRun})"
            >
              <span class="switch-slider"></span>
            </button>
          </div>
          <div class="settings-help">
            Tests RAG process without sending request to AI model (saves costs)
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h4><span class="settings-icon">📊</span> Session Info</h4>

        <div class="chat-session-info">
          <div><strong>Messages:</strong> ${this.state.messages.length}</div>
          <div><strong>Session History:</strong> ${this.session.size()} interactions</div>
          <div><strong>Use RAG:</strong> ${this.state.useRAG}</div>
          <div><strong>Selected Categories:</strong> ${this.state.selectedCategories.length}</div>
          <div><strong>Selected Strategies:</strong> ${this.state.strategies.join(', ')}</div>
          <div><strong>Available Categories:</strong> ${this.state.categories.length}</div>
          <div><strong>Session ID:</strong> ${this.state.sessionId || 'None'}</div>
          <div><strong>Session Saved:</strong> ${!this.session.isEmpty() ? 'Yes' : 'No'}</div>
          ${!this.session.isEmpty() ? '<div class="session-note">💾 Session context available for next requests</div>' : ''}
        </div>
      </div>
    `;
  }

  renderCategoriesSelection() {
    if (!this.state.categories || this.state.categories.length === 0) {
      return `
        <div class="categories-selection">
          <div class="no-categories">No categories available</div>
        </div>
      `;
    }

    return `
      <div class="categories-selection">
        <label class="form-label">Select Categories:</label>
        <div class="checkbox-group">
          ${this.state.categories.filter(cat => cat.isActive && cat.activeCollectionsCount > 0).map(category => `
            <label class="checkbox-item">
              <input
                type="checkbox"
                value="${category.id}"
                ${this.state.selectedCategories.includes(category.id) ? 'checked' : ''}
                onchange="window.app.toggleCategory('${category.id}', this.checked)"
              >
              <span class="checkbox-label">${stringUtils.escapeHtml(category.name)}</span>
              <span class="checkbox-count">(${category.activeCollectionsCount} collections)</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderStrategiesSelection() {
    const availableStrategies = [
      { id: 'vector', name: 'Vector Search', description: 'Semantic similarity search' },
      { id: 'hybrid', name: 'Hybrid Search', description: 'Vector + keyword search' },
      { id: 'graph', name: 'Graph Search', description: 'Relationship-based search' },
      { id: 'agent', name: 'Agent Search', description: 'AI-powered search agent' }
    ];

    return availableStrategies.map(strategy => `
      <label class="checkbox-item">
        <input
          type="checkbox"
          value="${strategy.id}"
          ${this.state.strategies.includes(strategy.id) ? 'checked' : ''}
          onchange="window.app.toggleStrategy('${strategy.id}', this.checked)"
        >
        <span class="checkbox-label">${strategy.name}</span>
        <div class="checkbox-help">${strategy.description}</div>
      </label>
    `).join('');
  }

  renderCollectionsList() {
    if (this.state.collections.length === 0) {
      return `
        <div class="no-collections">
          No collections available.<br>
          Please create collections in the Documents tab first.
        </div>
      `;
    }

    return this.state.collections.map(collection => {
      const isSelected = this.state.selectedCollections.includes(collection.id);
      return `
        <div class="collection-item ${isSelected ? 'selected' : ''}">
          <input
            type="checkbox"
            class="collection-checkbox"
            id="collection-${collection.id}"
            ${isSelected ? 'checked' : ''}
            onchange="window.app.toggleCollection('${collection.id}', this.checked)"
          >
          <label for="collection-${collection.id}" class="collection-label">
            📁 ${stringUtils.escapeHtml(collection.name)}
            <div class="collection-info">${collection.documentsCount || 0} files</div>
          </label>
        </div>
      `;
    }).join('');
  }

  // Event handlers (to be called from global scope)
  async sendMessage(event) {
    if (event) {
      event.preventDefault();
    }

    const messageInput = this.$('#messageInput');
    const message = messageInput.value.trim();

    if (!message || this.state.loading) {
      return;
    }

    if (this.state.useRAG && this.state.selectedCollections.length === 0) {
      alert('Please select at least one collection from the Knowledge Base settings');
      return;
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Update state without triggering re-render
    this.state.messages.push(userMessage);
    this.state.loading = true;

    // Manually add user message to DOM
    this.addMessageToDOM(userMessage);
    this.updateLoadingState();
    this.scrollToBottom();

    messageInput.value = '';
    messageInput.focus();

    try {
      const response = await chatService.sendMessage(message, {
        sessionId: this.state.sessionId,
        collectionIds: this.state.useRAG ? this.state.selectedCollections : [],
        context: this.state.context,
        temperature: this.state.temperature,
        useRAG: this.state.useRAG,
        trace: this.state.trace,
        dryRun: this.state.dryRun,
        session: this.session.get() // Add session history to request
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        context: response.context || [],
        trace: response.trace || null
      };

      const newSessionId = response.sessionId || this.state.sessionId;

      // Update state without triggering re-render
      this.state.messages.push(assistantMessage);
      this.state.sessionId = newSessionId;
      this.state.loading = false;

      // Add to session with summary from LLM response
      const summary = response.summary || `Assistant responded about: ${response.response.substring(0, 50)}${response.response.length > 50 ? '...' : ''}`;
      this.session.add(message, summary);

      // Save sessionId to cookies for session persistence
      SessionManager.setSessionId(newSessionId);

      // Manually add assistant message to DOM
      this.addMessageToDOM(assistantMessage);
      this.updateLoadingState();

      this.scrollToBottom();

      // Return focus to input field
      const messageInput = this.$('#messageInput');
      if (messageInput) {
        messageInput.focus();
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        context: []
      };

      // Update state without triggering re-render
      this.state.messages.push(errorMessage);
      this.state.loading = false;

      // Manually add error message to DOM
      this.addMessageToDOM(errorMessage);
      this.updateLoadingState();

      // Return focus to input field
      const messageInput = this.$('#messageInput');
      if (messageInput) {
        messageInput.focus();
      }
    }
  }

  addMessageToDOM(message) {
    const messagesContainer = this.$('#chatMessages');
    if (!messagesContainer) return;

    // Clear empty state if it exists
    const emptyState = messagesContainer.querySelector('.chat-empty');
    if (emptyState) {
      messagesContainer.innerHTML = '';
    }

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.role}`;
    messageElement.innerHTML = `
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      ${this.renderMessageSources(message)}
      ${message.timestamp ? `<div class="message-timestamp">${this.formatTimeAgo(message.timestamp)}</div>` : ''}
    `;

    messagesContainer.appendChild(messageElement);

    // Update session info after adding message
    this.updateSessionInfo();
  }

  updateLoadingState() {
    const sendButton = this.$('.chat-send-button');
    const messageInput = this.$('#messageInput');

    if (sendButton) {
      sendButton.textContent = this.state.loading ? '⏳ Sending...' : '📤 Send';
      sendButton.disabled = this.state.loading;
    }

    if (messageInput) {
      messageInput.disabled = this.state.loading;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now - time;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }

  toggleChatSettings() {
    this.setState({
      showSettings: !this.state.showSettings
    });
  }

  toggleCollection(collectionId, checked) {
    let selectedCollections = [...this.state.selectedCollections];

    if (checked && !selectedCollections.includes(collectionId)) {
      selectedCollections.push(collectionId);
    } else if (!checked && selectedCollections.includes(collectionId)) {
      selectedCollections = selectedCollections.filter(id => id !== collectionId);
    }

    this.setState({ selectedCollections });
  }

  updateTemperature(value) {
    this.state.temperature = parseFloat(value);
    this.updateTemperatureDisplay();
    // Save to cookies
    ChatSettings.update({ temperature: this.state.temperature });
  }

  updateTemperatureDisplay() {
    const temperatureGroup = this.$('.range-slider').closest('.form-group');
    if (temperatureGroup) {
      const temperatureLabel = temperatureGroup.querySelector('.form-label');
      const temperatureSlider = temperatureGroup.querySelector('.range-slider');
      if (temperatureLabel && temperatureSlider) {
        temperatureLabel.textContent = `Temperature: ${this.state.temperature}`;
        temperatureSlider.value = this.state.temperature;
      }
    }
  }

  updateContext(value) {
    this.state.context = value;
    // Save to cookies
    ChatSettings.update({ context: value });
  }

  updateUseRAG(mode) {
    this.state.useRAG = mode;
    ChatSettings.update({ useRAG: mode });
    this.render(); // Re-render to show/hide sections
  }

  toggleCategory(categoryId, checked) {
    let selectedCategories = [...this.state.selectedCategories];

    if (checked && !selectedCategories.includes(categoryId)) {
      selectedCategories.push(categoryId);
    } else if (!checked && selectedCategories.includes(categoryId)) {
      selectedCategories = selectedCategories.filter(id => id !== categoryId);
    }

    this.state.selectedCategories = selectedCategories;
    ChatSettings.update({ selectedCategories });
  }

  toggleStrategy(strategyId, checked) {
    let strategies = [...this.state.strategies];

    if (checked && !strategies.includes(strategyId)) {
      strategies.push(strategyId);
    } else if (!checked && strategies.includes(strategyId)) {
      strategies = strategies.filter(id => id !== strategyId);
    }

    // Ensure at least one strategy is selected
    if (strategies.length === 0) {
      strategies = ['hybrid'];
    }

    this.state.strategies = strategies;
    ChatSettings.update({ strategies });
  }

  updateToggleSwitch() {
    const toggleSwitches = this.$$('.toggle-switch');
    toggleSwitches.forEach(toggle => {
      const onclick = toggle.getAttribute('onclick');
      if (onclick && onclick.includes('toggleRAG')) {
        if (this.state.useRAG) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      } else if (onclick && onclick.includes('toggleTrace')) {
        if (this.state.trace) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      } else if (onclick && onclick.includes('toggleDryRun')) {
        if (this.state.dryRun) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      }
    });
  }

  toggleTrace(newValue) {
    this.state.trace = newValue;
    this.updateToggleSwitch();
    ChatSettings.update({ trace: newValue });
  }

  toggleDryRun(newValue) {
    this.state.dryRun = newValue;
    this.updateToggleSwitch();
    ChatSettings.update({ dryRun: newValue });
  }

  toggleSources(headerElement) {
    const sourcesList = headerElement.nextElementSibling;
    const toggle = headerElement.querySelector('.sources-toggle');

    if (sourcesList.style.display === 'none') {
      sourcesList.style.display = 'block';
      toggle.textContent = '▲';
    } else {
      sourcesList.style.display = 'none';
      toggle.textContent = '▼';
    }
  }

  toggleTraceDisplay(headerElement) {
    const traceContent = headerElement.nextElementSibling;
    const toggle = headerElement.querySelector('.trace-toggle');

    if (traceContent.style.display === 'none') {
      traceContent.style.display = 'block';
      toggle.textContent = '▲';
    } else {
      traceContent.style.display = 'none';
      toggle.textContent = '▼';
    }
  }

  handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const messagesContainer = this.$('#chatMessages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  onRender() {
    // Bind event listeners after render
    const messageInput = this.$('#messageInput');
    if (messageInput) {
      this.on(messageInput, 'keydown', this.handleKeydown.bind(this));
    }

    // Update UI elements after render
    this.updateClearButton();
    this.updateSessionInfo();
  }

  clearChat() {
    if (this.state.messages.length > 0) {
      if (confirm('Are you sure you want to clear the chat history?')) {
        SessionManager.clearSession();
        this.state.messages = [];
        this.state.sessionId = null;
        this.session.clear(); // Clear session

        // Clear DOM
        const messagesContainer = this.$('#chatMessages');
        if (messagesContainer) {
          messagesContainer.innerHTML = this.renderEmptyState();
        }

        // Update session info and disable clear button
        this.updateSessionInfo();
        this.updateClearButton();
      }
    }
  }

  startNewChat() {
    SessionManager.clearSession();
    this.state.messages = [];
    this.state.sessionId = null;
    this.session.clear(); // Clear session

    // Clear DOM
    const messagesContainer = this.$('#chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderEmptyState();
    }

    // Update session info and disable clear button
    this.updateSessionInfo();
    this.updateClearButton();
  }

  renderEmptyState() {
    return `
      <div class="chat-empty">
        <div class="chat-empty-icon">💬</div>
        <div class="chat-empty-text">Start a conversation</div>
        <div class="chat-empty-subtext">
          I can help you find information from your uploaded documents.<br>
          Ask me anything about your documents...
        </div>
      </div>
    `;
  }

  updateSessionInfo() {
    const sessionInfoContainer = this.$('.chat-session-info');
    if (!sessionInfoContainer) return;

    sessionInfoContainer.innerHTML = `
      <div><strong>Messages:</strong> ${this.state.messages.length}</div>
      <div><strong>Session History:</strong> ${this.session.size()} interactions</div>
      <div><strong>Use RAG:</strong> ${this.state.useRAG}</div>
      <div><strong>Selected Categories:</strong> ${this.state.selectedCategories.length}</div>
      <div><strong>Selected Strategies:</strong> ${this.state.strategies.join(', ')}</div>
      <div><strong>Available Categories:</strong> ${this.state.categories.length}</div>
      <div><strong>Session ID:</strong> ${this.state.sessionId || 'None'}</div>
      <div><strong>Session Saved:</strong> ${!this.session.isEmpty() ? 'Yes' : 'No'}</div>
      ${!this.session.isEmpty() ? '<div class="session-note">💾 Session context available for next requests</div>' : ''}
    `;
  }

  updateClearButton() {
    const clearButton = this.$('.container-header-actions button[onclick="window.app.clearChat()"]');
    if (clearButton) {
      if (this.state.messages.length === 0) {
        clearButton.disabled = true;
      } else {
        clearButton.disabled = false;
      }
    }
  }
}