# RAG Service

Production-ready RAG service for adding context from private documents to AI agents.

## Features

- **Document Management**: Upload, manage, and organize documents in Collections/Knowledge Bases
- **Multi-Provider LLM Gateway**: Flexible interface for different LLM providers
- **Hybrid Search**: Vector similarity + Full-text search with PostgreSQL + pgvector
- **Knowledge Graph**: Entity relationships across documents and chunks
- **Real-time Chat**: SSE streaming chat bot with RAG context
- **Background Processing**: BullMQ queues for chunking, embeddings, and indexing

## Tech Stack

- **Backend**: NestJS, TypeScript, PostgreSQL, pgvector, Redis, BullMQ
- **Frontend**: React, TypeScript
- **AI/ML**: OpenAI API, Vector embeddings
- **Infrastructure**: Docker Compose

## Quick Start

```bash
# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/api
```

## Architecture

```
├── backend/           # NestJS API service
├── frontend/          # React web application
├── docker-compose.yml
└── README.md
```