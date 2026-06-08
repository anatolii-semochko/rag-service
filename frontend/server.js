const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));
// Serve static files from src directory for modules
app.use('/src', express.static('src'));

// Configuration endpoint for frontend
app.get('/config.js', (req, res) => {
  const config = {
    api: {
      host: process.env.API_HOST || 'localhost',
      port: process.env.API_PORT || '3001',
      basePath: process.env.API_BASE_PATH || '/api',
      protocol: process.env.API_PROTOCOL || 'http',
      baseUrl: process.env.FRONTEND_API_URL || undefined
    }
  };

  const configScript = `
// Runtime configuration injected by server
window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};
console.log('📡 API Configuration loaded from server:', window.__APP_CONFIG__.api);
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.send(configScript);
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get tab navigation data
app.get('/api/tabs', (req, res) => {
  res.json([
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'documents', label: 'Document Manager', icon: '📄' },
    { id: 'audit', label: 'Audit Log', icon: '📊' }
  ]);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RAG Frontend running on http://localhost:${PORT}`);
  console.log(`📱 Access from host: http://localhost:${PORT}`);
  console.log(`🔧 API Backend: ${process.env.FRONTEND_API_URL || `http://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '3001'}${process.env.API_BASE_PATH || '/api'}`}`);
});