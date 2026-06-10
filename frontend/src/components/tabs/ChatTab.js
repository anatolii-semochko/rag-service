// Chat Tab Component
import { BaseComponent } from '../common/BaseComponent.js';
import { chatService, collectionsService } from '../../api/services.js';
import { dateUtils, stringUtils } from '../../utils/helpers.js';

export class ChatTab extends BaseComponent {
  constructor() {
    super();

    this.state = {
      messages: [],
      loading: false,
      sessionId: null,
      collections: [],
      selectedCollections: [],
      showSettings: false,
      temperature: 0.7,
      context: '',
      currentMessage: '',
      useRAG: true,
      loadingHistory: false
    };

    this.initializeData();
  }

  async initializeData() {
    try {
      // Завантажуємо тільки активні колекції з активних категорій
      const response = await collectionsService.getActiveCollections();
      const collections = response.data || [];

      // Автоматично обираємо всі активні колекції
      const selectedCollections = collections.map(collection => collection.id);

      this.setState({
        collections,
        selectedCollections
      });

      // Перевіряємо чи є sessionId в localStorage та завантажуємо історію
      await this.loadChatHistory();
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }

  async loadChatHistory() {
    try {
      // Спробуємо завантажити останню сесію з localStorage
      const storedSessionId = localStorage.getItem('chatSessionId');

      if (storedSessionId) {
        this.state.loadingHistory = true;
        this.updateHistoryLoadingState();

        const historyResponse = await chatService.getChatHistory(storedSessionId);
        const messages = historyResponse.data || [];

        // Перевіряємо чи сесія дійсно існує (чи є повідомлення)
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
          // Сесія порожня, видаляємо з localStorage
          localStorage.removeItem('chatSessionId');
          this.state.loadingHistory = false;
          this.updateHistoryLoadingState();
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      localStorage.removeItem('chatSessionId');
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
      <div class="chat-container">
        <div class="chat-header">
          <h3 class="chat-title">💬 RAG Chat</h3>
          <div class="chat-actions">
            <button
              class="btn-secondary btn-small"
              onclick="window.app.startNewChat()"
              title="Start new chat session"
            >
              🆕 New Chat
            </button>
            <button
              class="btn-secondary btn-small"
              onclick="window.app.clearChat()"
              title="Clear current chat history"
              ${this.state.messages.length === 0 ? 'disabled' : ''}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <div class="chat-body">
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

  renderKnowledgeBaseSettings() {
    return `

      <div class="settings-section">
        <h4><span class="settings-icon">🎛️</span> AI Settings</h4>

        <div class="form-group">
          <div class="rag-setting">
            <span class="rag-label">Use RAG (Retrieval-Augmented Generation)</span>
            <button
              class="toggle-switch ${this.state.useRAG ? 'active' : ''}"
              style="float: right"
              onclick="window.app.toggleRAG(!${this.state.useRAG})"
            >
              <span class="switch-slider"></span>
            </button>
          </div>
          <div class="settings-help">
            When enabled, AI will search through your documents to provide informed answers
          </div>
        </div>

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
        <h4><span class="settings-icon">📊</span> Session Info</h4>

        <div class="chat-session-info">
          <div><strong>Messages:</strong> ${this.state.messages.length}</div>
          <div><strong>Selected Collections:</strong> ${this.state.selectedCollections.length}</div>
          <div><strong>Available Collections:</strong> ${this.state.collections.length}</div>
          <div><strong>Session ID:</strong> ${this.state.sessionId || 'None'}</div>
          <div><strong>Session Saved:</strong> ${this.state.sessionId ? 'Yes' : 'No'}</div>
          ${this.state.sessionId ? '<div class="session-note">💾 Chat history will be restored on page reload</div>' : ''}
        </div>
      </div>
    `;
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
        useRAG: this.state.useRAG
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        context: response.context || []
      };

      const newSessionId = response.sessionId || this.state.sessionId;

      // Update state without triggering re-render
      this.state.messages.push(assistantMessage);
      this.state.sessionId = newSessionId;
      this.state.loading = false;

      // Зберігаємо sessionId в localStorage для збереження сесії
      if (newSessionId) {
        localStorage.setItem('chatSessionId', newSessionId);
      }

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

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.role}`;
    messageElement.innerHTML = `
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      ${this.renderMessageSources(message)}
      ${message.timestamp ? `<div class="message-timestamp">${this.formatTimeAgo(message.timestamp)}</div>` : ''}
    `;

    messagesContainer.appendChild(messageElement);
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
  }

  toggleRAG(newValue) {
    this.state.useRAG = newValue;
    this.updateToggleSwitch();
  }

  updateToggleSwitch() {
    const toggleSwitch = this.$('.toggle-switch');
    if (toggleSwitch) {
      if (this.state.useRAG) {
        toggleSwitch.classList.add('active');
      } else {
        toggleSwitch.classList.remove('active');
      }
      toggleSwitch.onclick = () => window.app.toggleRAG(!this.state.useRAG);
    }
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
  }

  clearChat() {
    if (this.state.messages.length > 0) {
      if (confirm('Are you sure you want to clear the chat history?')) {
        localStorage.removeItem('chatSessionId');
        this.state.messages = [];
        this.state.sessionId = null;

        // Clear DOM
        const messagesContainer = this.$('#chatMessages');
        if (messagesContainer) {
          messagesContainer.innerHTML = this.renderEmptyState();
        }
      }
    }
  }

  startNewChat() {
    localStorage.removeItem('chatSessionId');
    this.state.messages = [];
    this.state.sessionId = null;

    // Clear DOM
    const messagesContainer = this.$('#chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.renderEmptyState();
    }
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
}