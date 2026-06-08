# RAG Service Makefile
# ==================

.PHONY: help init build up down restart logs clean test lint format install dev prod health status

# Default target
help: ## Show this help message
	@echo "RAG Service - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make init     # Initialize the project"
	@echo "  make up       # Start all services"
	@echo "  make dev      # Start development environment"
	@echo "  make logs     # View all logs"

# =============================================================================
# INITIALIZATION & SETUP
# =============================================================================

init: ## Initialize the project (copy .env, install dependencies)
	@echo "🚀 Initializing RAG Service project..."
	@if [ ! -f .env ]; then \
		cp .env.example .env && \
		echo "✅ Created .env file from .env.example"; \
	else \
		echo "ℹ️  .env file already exists"; \
	fi
	@echo "📦 Installing dependencies..."
	@$(MAKE) install
	@echo "🎉 Project initialized! Run 'make up' to start services."

install: ## Install dependencies (runs npm install in containers)
	@echo "📦 Installing backend dependencies..."
	@docker-compose run --rm backend npm install
	@echo "📦 Installing frontend dependencies..."
	@docker-compose run --rm frontend npm install
	@echo "✅ Dependencies installed"

# =============================================================================
# DOCKER SERVICES MANAGEMENT
# =============================================================================

up: ## Start all services in background
	@echo "🚀 Starting all services..."
	@docker-compose up -d
	@echo "✅ Services started"
	@$(MAKE) status

down: ## Stop all services
	@echo "🛑 Stopping all services..."
	@docker-compose down
	@echo "✅ Services stopped"

restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	@docker-compose restart
	@echo "✅ Services restarted"

build: ## Build all services
	@echo "🔨 Building all services..."
	@docker-compose build
	@echo "✅ Build completed"

rebuild: ## Rebuild and restart all services
	@echo "🔨 Rebuilding all services..."
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@echo "✅ Rebuild completed"

# =============================================================================
# INDIVIDUAL SERVICES
# =============================================================================

up-db: ## Start only database services (PostgreSQL + Redis)
	@echo "🗄️  Starting database services..."
	@docker-compose up postgres redis -d
	@echo "✅ Database services started"

up-backend: ## Start backend API service
	@echo "🔧 Starting backend service..."
	@docker-compose up backend -d
	@echo "✅ Backend service started"

up-frontend: ## Start frontend service
	@echo "🎨 Starting frontend service..."
	@docker-compose up frontend -d
	@echo "✅ Frontend service started"

up-worker: ## Start background worker service
	@echo "⚙️  Starting worker service..."
	@docker-compose up worker -d
	@echo "✅ Worker service started"

restart-backend: ## Restart only backend service
	@echo "🔄 Restarting backend..."
	@docker-compose restart backend

restart-frontend: ## Restart only frontend service
	@echo "🔄 Restarting frontend..."
	@docker-compose restart frontend

# =============================================================================
# DEVELOPMENT COMMANDS
# =============================================================================

dev: ## Start development environment (DB + Backend with logs)
	@echo "💻 Starting development environment..."
	@docker-compose up postgres redis -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 5
	@docker-compose up backend

dev-full: ## Start full development environment with frontend
	@echo "💻 Starting full development environment..."
	@docker-compose up

dev-backend: ## Start only backend for development (with logs)
	@echo "💻 Starting backend development..."
	@docker-compose up postgres redis backend

dev-frontend: ## Start only frontend for development
	@echo "💻 Starting frontend development..."
	@docker-compose up frontend

# =============================================================================
# PRODUCTION COMMANDS
# =============================================================================

prod: ## Start production environment
	@echo "🏭 Starting production environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production environment started"

# =============================================================================
# LOGS & MONITORING
# =============================================================================

logs: ## View logs from all services
	@docker-compose logs -f

logs-backend: ## View backend logs
	@docker-compose logs -f backend

logs-frontend: ## View frontend logs
	@docker-compose logs -f frontend

logs-db: ## View database logs
	@docker-compose logs -f postgres redis

logs-worker: ## View worker logs
	@docker-compose logs -f worker

status: ## Show status of all services
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo ""
	@echo "🌐 Service URLs:"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:3001"
	@echo "  API Docs:  http://localhost:3001/api"
	@echo "  Health:    http://localhost:3001/api/health"

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo "Backend API:"
	@curl -s -f http://localhost:3001/api/health || echo "❌ Backend unhealthy"
	@echo ""
	@echo "PostgreSQL:"
	@docker-compose exec postgres pg_isready -U rag_user -d rag_db || echo "❌ PostgreSQL unhealthy"
	@echo "Redis:"
	@docker-compose exec redis redis-cli ping || echo "❌ Redis unhealthy"

# =============================================================================
# TESTING & CODE QUALITY
# =============================================================================

test: ## Run all tests
	@echo "🧪 Running backend tests..."
	@docker-compose exec backend npm test
	@echo "🧪 Running frontend tests..."
	@docker-compose exec frontend npm test

test-backend: ## Run backend tests
	@docker-compose exec backend npm test

test-frontend: ## Run frontend tests
	@docker-compose exec frontend npm test

lint: ## Run linting for all services
	@echo "🔍 Linting backend..."
	@docker-compose exec backend npm run lint
	@echo "🔍 Linting frontend..."
	@docker-compose exec frontend npm run lint

lint-backend: ## Run backend linting
	@docker-compose exec backend npm run lint

lint-frontend: ## Run frontend linting
	@docker-compose exec frontend npm run lint

format: ## Format code for all services
	@echo "✨ Formatting backend code..."
	@docker-compose exec backend npm run lint:fix || true
	@echo "✨ Formatting frontend code..."
	@docker-compose exec frontend npm run lint:fix || true

# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

db-shell: ## Access PostgreSQL shell
	@docker-compose exec postgres psql -U rag_user -d rag_db

db-dump: ## Create database backup
	@echo "💾 Creating database backup..."
	@docker-compose exec postgres pg_dump -U rag_user -d rag_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backup created"

db-restore: ## Restore database from backup (usage: make db-restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Please specify backup file: make db-restore FILE=backup.sql"; \
		exit 1; \
	fi
	@echo "🔄 Restoring database from $(FILE)..."
	@docker-compose exec -T postgres psql -U rag_user -d rag_db < $(FILE)
	@echo "✅ Database restored"

redis-cli: ## Access Redis CLI
	@docker-compose exec redis redis-cli

# =============================================================================
# UTILITIES
# =============================================================================

shell-backend: ## Access backend container shell
	@docker-compose exec backend sh

shell-frontend: ## Access frontend container shell
	@docker-compose exec frontend sh

clean: ## Clean up containers, volumes, and images
	@echo "🧹 Cleaning up..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup completed"

clean-all: ## Clean up everything including images
	@echo "🧹 Deep cleaning (removes all images)..."
	@docker-compose down -v --remove-orphans
	@docker system prune -af
	@echo "✅ Deep cleanup completed"

update: ## Update project dependencies
	@echo "🔄 Updating dependencies..."
	@docker-compose exec backend npm update
	@docker-compose exec frontend npm update
	@echo "✅ Dependencies updated"

# =============================================================================
# QUICK COMMANDS
# =============================================================================

quick-start: init up-db up-backend ## Quick start for development (DB + Backend)

full-start: init up ## Full start (all services)

reset: down clean init up ## Reset everything and start fresh