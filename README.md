# RAG Service

RAG service for adding context from private documents to AI agents.

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

### Prerequisites

- Docker & Docker Compose
- Git

### Setup

1. **Clone and setup environment**
```bash
git clone <repository-url>
cd rag-service
cp .env.example .env
```

2. **Configure environment variables** (optional for basic testing)
```bash
# Edit .env file with your settings
# OPENAI_API_KEY=your-key-here (for production use)
```

3. **Start the services**
```bash
# Start database and Redis first
docker-compose up postgres redis -d

# Wait for services to be ready (check health status)
docker-compose ps

# Start the API
docker-compose up backend -d

# Monitor API startup
docker-compose logs backend -f
```

4. **Access the services**
- **API Health Check**: http://localhost:3001/api/health
- **API Documentation (Swagger)**: http://localhost:3001/api
- **Frontend**: http://localhost:3000 (when implemented)

### API Endpoints

The API provides the following endpoints:

#### 📚 Collections Management
- `GET /api/collections` - List all collections with pagination
- `POST /api/collections` - Create a new collection
- `GET /api/collections/:id` - Get collection details
- `PATCH /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

#### 📄 Documents Management
- `POST /api/documents/upload` - Upload document file to collection
- `GET /api/documents/collection/:collectionId` - List documents in collection
- `GET /api/documents/:id` - Get document details
- `PATCH /api/documents/:id/toggle-active` - Activate/deactivate document
- `DELETE /api/documents/:id` - Delete document

#### 🔍 Search & Retrieval
- `POST /api/search/vector` - Hybrid search (vector + full-text)
- `GET /api/search/metadata` - Search by metadata filters

#### 💬 RAG Chat
- `POST /api/chat` - Send message to RAG-enabled chatbot
- `GET /api/chat/sessions` - List chat sessions
- `GET /api/chat/sessions/:sessionId/messages` - Get chat history

#### 🏥 System Health
- `GET /api/health` - Service health check

### Development

#### Useful Commands

```bash
# View logs for specific service
docker-compose logs backend -f
docker-compose logs postgres -f
docker-compose logs redis -f

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild and restart backend
docker-compose up backend --build -d

# Access database
docker-compose exec postgres psql -U rag_user -d rag_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

#### Database Schema

The service uses PostgreSQL with pgvector extension:
- **Collections**: Document groups/knowledge bases
- **Documents**: Individual files with metadata
- **Chunks**: Document segments with vector embeddings
- **Chat Sessions & Messages**: Conversation history
- **Entities & Relations**: Knowledge graph components

#### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql://rag_user:rag_password@postgres:5432/rag_db

# API Configuration
API_PORT=3001
NODE_ENV=development

# OpenAI (for production)
OPENAI_API_KEY=your-key-here

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_DIR=./uploads

# Vector Search
EMBEDDING_DIMENSIONS=1536
CHUNK_SIZE=500
```

## Architecture

```
RAG Service
│
├── backend/                    # NestJS API Service
│   ├── src/
│   │   ├── collections/       # Collection management
│   │   ├── documents/         # Document upload & processing
│   │   ├── search/           # Vector & hybrid search
│   │   ├── chat/             # RAG chat functionality
│   │   ├── common/           # Shared utilities & health check
│   │   └── database/         # Database configuration & schema
│   ├── Dockerfile.dev-fixed  # Development container
│   └── package.json
│
├── frontend/                  # React Web Application
│   ├── src/
│   └── package.json
│
├── docker-compose.yml         # Service orchestration
├── .env.example              # Environment template
└── README.md

Services:
├── PostgreSQL (pgvector)     # Vector database
├── Redis                     # Caching & job queues
├── NestJS Backend           # REST API
└── React Frontend           # Web interface
```

## License

MIT License