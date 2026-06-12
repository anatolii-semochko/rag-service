# RAG Service

RAG service for adding context from private documents to AI agents.

## Features

- **Document Management**: Upload, manage, and organize documents in Collections/Knowledge Bases
- **Advanced Retrieval Engine**: 4 search strategies (Vector, Hybrid, Graph, Agent) with AI optimization
- **Multi-Provider LLM Gateway**: Flexible interface for different LLM providers
- **AI-Powered Search**: Query expansion, intelligent reranking, and adaptive strategy selection
- **Hybrid Search**: Vector similarity + Full-text search with PostgreSQL + pgvector
- **Graph-Based Retrieval**: Relationship-aware search across connected documents
- **Knowledge Graph**: Entity relationships across documents and chunks
- **Real-time Chat**: SSE streaming chat bot with enhanced RAG context
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

#### 🔍 Advanced Search & Retrieval Engine
- `POST /api/search/vector` - Legacy vector search endpoint
- `GET /api/search/metadata` - Search by metadata filters

#### 💬 RAG Chat
- `POST /api/chat` - Send message to RAG-enabled chatbot
- `GET /api/chat/sessions` - List chat sessions
- `GET /api/chat/sessions/:sessionId/messages` - Get chat history

#### 🏥 System Health
- `GET /api/health` - Service health check

## 🔍 Advanced Search & Retrieval Engine

The RAG service includes a sophisticated retrieval engine with multiple search strategies optimized for different types of queries and use cases.

### Search Strategies

#### 1. **Vector Search** (`vector`)
Traditional semantic similarity search using OpenAI embeddings.

```bash
# Chat API with vector search
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is machine learning?",
    "retrievalMode": "vector",
    "limit": 5,
    "threshold": 0.7,
    "collectionIds": ["uuid-here"]
  }'
```

**Best for**:
- Conceptual queries
- When looking for semantically similar content
- Abstract topics

#### 2. **Hybrid Search** (`hybrid`) - Default
Combines vector similarity with PostgreSQL Full-Text Search for balanced results.

```bash
# Chat API with hybrid search (default)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How to configure database settings?",
    "retrievalMode": "hybrid",
    "vectorWeight": 0.7,
    "keywordWeight": 0.3,
    "limit": 10
  }'
```

**Best for**:
- Most general queries
- Balancing semantic and exact matches
- When you want comprehensive results

#### 3. **Graph Search** (`graph`)
Relationship-based search that finds related content through document connections.

```bash
# Chat API with graph search
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "API authentication methods",
    "retrievalMode": "graph",
    "limit": 8,
    "threshold": 0.5
  }'
```

**Best for**:
- Finding related concepts across documents
- Exploring interconnected topics
- When context from related documents is important

#### 4. **Agent Search** (`agent`) - AI-Powered
Intelligent search that analyzes queries and automatically selects optimal strategies.

```bash
# Chat API with agent search
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compare different authentication methods and their security implications",
    "retrievalMode": "agent",
    "useQueryExpansion": true,
    "useReranking": true
  }'
```

**Best for**:
- Complex, multi-faceted questions
- When you want the system to optimize automatically
- Comparative or analytical queries

### Search Parameters

#### Core Parameters
- `message` (required): The search query or chat message
- `retrievalMode`: Search strategy (`vector`, `hybrid`, `graph`, `agent`)
- `limit`: Maximum number of results (default: 10)
- `threshold`: Minimum similarity score (default: 0.7)
- `collectionIds`: Array of collection UUIDs to search within

#### Advanced Parameters
- `vectorWeight`: Weight for vector similarity in hybrid search (default: 0.7)
- `keywordWeight`: Weight for keyword matching in hybrid search (default: 0.3)
- `useRAG`: Enable/disable RAG context (default: true)
- `useQueryExpansion`: Enable AI-powered query expansion (agent mode)
- `useReranking`: Enable result reranking (agent mode)
- `temperature`: AI response creativity (0.1-1.0)

### Search Features

#### **Query Expansion** (Agent Mode)
Automatically expands queries with:
- **Synonyms**: Alternative terms and phrasings
- **Related concepts**: Broader and narrower topics
- **Sub-queries**: Breaking complex questions into focused parts

#### **AI-Powered Reranking**
Intelligent result ordering using:
- **Relevance scoring**: AI evaluation of content quality
- **Diversity filtering**: Prevents repetitive results
- **Content quality indicators**: Numbers, examples, specificity
- **Authority weighting**: Official documentation priority

#### **Metadata-Rich Results**
Each search result includes comprehensive scoring:
```json
{
  "chunkId": "uuid",
  "content": "Result content...",
  "score": 0.85,
  "documentName": "api-docs.pdf",
  "collectionId": "uuid",
  "metadata": {
    "vectorScore": 0.82,
    "keywordScore": 0.75,
    "graphScore": 0.68,
    "aiRankingScore": 0.90,
    "strategiesUsed": ["vector", "keyword"],
    "termMatches": 3,
    "position": 1
  }
}
```

### Query Examples by Type

#### **Factual Queries**
```bash
# Use vector or hybrid search
"What is the API rate limit?"
"When was the last update released?"
```

#### **Procedural Queries**
```bash
# Use hybrid or agent search
"How to set up user authentication?"
"Step by step guide to deploy the application"
```

#### **Conceptual Queries**
```bash
# Use vector or agent search
"Explain the architecture principles"
"What are the security considerations?"
```

#### **Comparative Queries**
```bash
# Use agent search for best results
"Compare Redis vs PostgreSQL for caching"
"What are the pros and cons of different authentication methods?"
```

### Performance Guidelines

#### Response Times (approximate)
- **Vector**: 200-500ms
- **Hybrid**: 300-700ms
- **Graph**: 500-1200ms
- **Agent**: 1000-3000ms (includes AI processing)

#### Optimization Tips
1. **Use specific collection IDs** to limit search scope
2. **Adjust thresholds** based on your content quality
3. **Vector search** for fastest responses
4. **Agent search** for complex queries where quality matters more than speed
5. **Limit results** to reduce processing time

### Error Handling

The search engine includes robust fallbacks:
- **Strategy failures**: Automatic fallback to hybrid search
- **AI service issues**: Graceful degradation to semantic search
- **Empty results**: Expanded search with lower thresholds
- **Timeout protection**: Maximum processing limits

### Monitoring Search Performance

Check search quality with metadata:
```javascript
// Analyze result quality
const result = await fetch('/api/chat', { /* ... */ });
const data = await result.json();

console.log('Search metadata:', data.context[0].metadata);
console.log('Processing time:', data.metadata?.processingTime);
console.log('Strategies used:', data.metadata?.queryAnalysis?.strategiesUsed);
```

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
│   │   ├── rag/              # Advanced Retrieval Engine
│   │   │   └── retrieval/    # Search strategies & services
│   │   │       ├── strategies/  # Vector, Hybrid, Graph, Agent
│   │   │       ├── services/    # Query expansion, Reranking
│   │   │       └── interfaces/  # Common contracts
│   │   ├── search/           # Legacy search endpoints
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