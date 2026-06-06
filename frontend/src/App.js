import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('chat');

  // Load active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && ['chat', 'documents', 'audit'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Save active tab to localStorage
    localStorage.setItem('activeTab', tabId);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab />;
      case 'documents':
        return <DocumentsTab />;
      case 'audit':
        return <AuditTab />;
      default:
        return <ChatTab />;
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="brand">
              <div className="logo">🤖</div>
              <div className="brand-text">
                <h1>RAG Service</h1>
                <p>Private Document Intelligence</p>
              </div>
            </div>
            <div className="status">
              <span className="status-online">● Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Tab Content */}
          <div className="tab-content">
            {renderActiveTab()}
          </div>
        </div>
      </main>
    </div>
  );
}

const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'documents', label: 'Document Manager', icon: '📄' },
    { id: 'audit', label: 'Audit Log', icon: '📊' }
  ];

  return (
    <div className="tab-navigation">
      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

const ChatTab = () => {
  return (
    <div className="tab-pane">
      <div className="chat-layout">
        <div className="chat-main">
          <div className="card">
            <div className="card-header">
              <h2>💬 RAG Chat Interface</h2>
            </div>
            <div className="card-body">
              <div className="chat-messages">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>Chat interface will be implemented here</p>
                  <small>This will include message history, input field, and RAG-powered responses</small>
                </div>
              </div>
              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type your message..."
                  disabled
                />
                <button disabled>Send</button>
              </div>
            </div>
          </div>
        </div>
        <div className="chat-sidebar">
          <div className="card">
            <div className="card-header">
              <h3>⚙️ Chat Settings</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Knowledge Base</label>
                <select disabled>
                  <option>Select knowledge base...</option>
                </select>
              </div>
              <div className="form-group">
                <label>Temperature: 0.7</label>
                <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" disabled />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentsTab = () => {
  return (
    <div className="tab-pane">
      <div className="documents-header">
        <h2>📄 Document Manager</h2>
        <button className="btn-primary" disabled>📤 Upload Documents</button>
      </div>

      <div className="documents-layout">
        <div className="documents-sidebar">
          <div className="card">
            <div className="card-header">
              <h3>📁 Collections</h3>
            </div>
            <div className="card-body">
              <div className="empty-state">
                <p>No collections yet</p>
              </div>
            </div>
          </div>
        </div>

        <div className="documents-main">
          <div className="card">
            <div className="card-header">
              <h3>Documents</h3>
            </div>
            <div className="card-body">
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h4>No documents found</h4>
                <p>Upload documents to start building your knowledge base</p>
                <button className="btn-primary" disabled>📤 Upload Your First Document</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Total Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0 MB</div>
          <div className="stat-label">Total Size</div>
        </div>
      </div>
    </div>
  );
};

const AuditTab = () => {
  return (
    <div className="tab-pane">
      <div className="audit-header">
        <h2>📊 Audit Log</h2>
        <div className="audit-actions">
          <button disabled>📅 Date Range</button>
          <button disabled>🔍 Filters</button>
          <button disabled>📥 Export</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">User Actions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">API Calls</div>
        </div>
        <div className="stat-card error">
          <div className="stat-value">0</div>
          <div className="stat-label">Errors</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h4>No audit logs available</h4>
            <p>Audit logs will appear here once system activity begins</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;