# ==========================================================
# 🚀 Makefile — Automação de desenvolvimento Agenda Fácil
# ==========================================================

# Variáveis principais
DOCKER_COMPOSE = docker compose
BACKEND_SERVICE = backend
FRONTEND_SERVICE = frontend

# ==========================================================
# 🧱 Containers
# ==========================================================

# Sobe containers (build incluído)
up:
	@echo "🚀 Subindo containers com build..."
	$(DOCKER_COMPOSE) up --build

# Sobe containers em background
up-detached:
	@echo "🚀 Subindo containers em background..."
	$(DOCKER_COMPOSE) up -d --build

# Para e remove containers
down:
	@echo "🧹 Parando containers..."
	$(DOCKER_COMPOSE) down

# Remove tudo (containers, volumes, imagens)
clean:
	@echo "🔥 Limpando containers, volumes e imagens..."
	$(DOCKER_COMPOSE) down -v --rmi all --remove-orphans

# ==========================================================
# 🧪 Testes e Logs
# ==========================================================

# Testa o backend
test-backend:
	@echo "🧪 Executando testes no backend..."
	cd backend && npm run test

# Segue logs do backend
logs-backend:
	@echo "📜 Logs do backend..."
	$(DOCKER_COMPOSE) logs -f $(BACKEND_SERVICE)

# Segue logs do frontend
logs-frontend:
	@echo "📜 Logs do frontend..."
	$(DOCKER_COMPOSE) logs -f $(FRONTEND_SERVICE)

# ==========================================================
# 💻 Desenvolvimento local
# ==========================================================

# Inicia backend localmente
dev-backend:
	@echo "💻 Iniciando backend localmente..."
	cd backend && npm run dev

# Inicia frontend localmente
dev-frontend:
	@echo "💻 Iniciando frontend localmente..."
	cd frontend && npm run dev

# ==========================================================
# 🧩 Utilitários
# ==========================================================

# Lista variáveis de ambiente
env:
	@echo "🌱 Variáveis .env ativas (backend):"
	@cat backend/.env | grep -v '^#' || echo "⚠️ Nenhum .env encontrado no backend"
	@echo ""
	@echo "🌱 Variáveis .env ativas (frontend):"
	@cat frontend/.env | grep -v '^#' || echo "⚠️ Nenhum .env encontrado no frontend"

# Ajuda
help:
	@echo ""
	@echo "📘 Comandos disponíveis:"
	@echo "  make up             - Sobe containers com build"
	@echo "  make up-detached    - Sobe containers em background"
	@echo "  make down           - Para containers"
	@echo "  make clean          - Remove containers, volumes e imagens"
	@echo "  make test-backend   - Roda testes Jest do backend"
	@echo "  make logs-backend   - Mostra logs do backend"
	@echo "  make logs-frontend  - Mostra logs do frontend"
	@echo "  make dev-backend    - Roda backend localmente"
	@echo "  make dev-frontend   - Roda frontend localmente"
	@echo "  make env            - Mostra variáveis de ambiente"
	@echo ""
