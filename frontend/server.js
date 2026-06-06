const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

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
});