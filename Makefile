# Telco Web Project Makefile

# Configuration
NGINX_HOST = 172.16.13.179
NGINX_USER = root
LOCAL_BUILD_DIR = web/dist

# Backend Configuration
BACKEND_HOST = 172.16.13.246
BACKEND_USER = root
BACKEND_DIR = /opt/telco-analysis
LOCAL_BACKEND_DIR = backend

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help build deploy clean deploy-backend deploy-full-stack

# Default target
help:
	@echo "$(GREEN)Telco Web Project Commands:$(NC)"
	@echo "$(YELLOW)Production Commands:$(NC)"
	@echo "  make prod           - Start production mode using ./start.sh prod"
	@echo "  make restart        - Restart nginx container"
	@echo "$(YELLOW)Frontend Commands:$(NC)"
	@echo "  make build          - Build the frontend for production"
	@echo "  make deploy-frontend- Deploy frontend to nginx server"
	@echo "  make clean          - Clean build artifacts"
	@echo "$(YELLOW)Backend Commands:$(NC)"
	@echo "  make deploy-backend - Deploy backend to server"
	@echo "  make backend-restart- Deploy and restart backend service"
	@echo "$(YELLOW)Full Stack Commands:$(NC)"
	@echo "  make deploy-full-stack - Deploy both frontend and backend"
	@echo "$(YELLOW)Server Management:$(NC)"
	@echo "  make test-connection - Test SSH connections to both servers"
	@echo "  make test-nginx-connection - Test SSH connection to nginx server"
	@echo "  make help           - Show this help message"

# Start production mode
prod:
	@echo "$(GREEN)Starting production mode...$(NC)"
	./start.sh prod
	@echo "$(GREEN)Production mode started!$(NC)"

# Restart nginx container
restart:
	@echo "$(GREEN)Restarting nginx container...$(NC)"
	ssh $(NGINX_USER)@$(NGINX_HOST) "cd ~/nginx && make restart"
	@echo "$(GREEN)Nginx container restarted!$(NC)"

# Build the frontend for production
build:
	@echo "$(GREEN)Building frontend for production...$(NC)"
	cd web && npm run build
	@echo "$(GREEN)Build completed!$(NC)"

# Clean build artifacts
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf $(LOCAL_BUILD_DIR)
	@echo "$(GREEN)Clean completed!$(NC)"

# Test connection to nginx server
test-nginx-connection:
	@echo "$(GREEN)Testing connection to nginx server...$(NC)"
	@if ssh $(NGINX_USER)@$(NGINX_HOST) "echo 'Connection successful'"; then \
		echo "$(GREEN)Connection to nginx server successful!$(NC)"; \
	else \
		echo "$(RED)Failed to connect to nginx server. Check your SSH configuration.$(NC)"; \
		exit 1; \
	fi



# Deploy frontend to nginx server
deploy-frontend: build
	@echo "$(GREEN)Deploying frontend to nginx server at $(NGINX_HOST)...$(NC)"
	@if [ ! -d "$(LOCAL_BUILD_DIR)" ]; then \
		echo "$(RED)Frontend build directory not found. Run 'make build' first.$(NC)"; \
		exit 1; \
	fi
	rsync -avz --delete \
		--exclude='.git' \
		--exclude='*.log' \
		--exclude='.DS_Store' \
		$(LOCAL_BUILD_DIR)/ $(NGINX_USER)@$(NGINX_HOST):/opt/telco-analysis/web
	@echo "$(GREEN)Frontend deployment completed successfully!$(NC)"
	@echo "$(YELLOW)Frontend available at: http://$(NGINX_HOST)$(NC)"

# Deploy backend to server
deploy-backend:
	@echo "$(GREEN)Deploying backend to server at $(BACKEND_HOST)...$(NC)"
	@if [ ! -d "$(LOCAL_BACKEND_DIR)" ]; then \
		echo "$(RED)Backend directory not found.$(NC)"; \
		exit 1; \
	fi
	rsync -avz --delete \
		--exclude='.venv' \
		--exclude='venv' \
		--exclude='__pycache__' \
		--exclude='*.pyc' \
		--exclude='.git' \
		--exclude='*.log' \
		--exclude='.env' \
		--exclude='.DS_Store' \
		--exclude='node_modules' \
		--exclude='*.db' \
		--exclude='telco_analysis.db' \
		--exclude='telco_analysis_*.db' \
		$(LOCAL_BACKEND_DIR)/ $(BACKEND_USER)@$(BACKEND_HOST):$(BACKEND_DIR)/
	@echo "$(GREEN)Backend deployment completed successfully!$(NC)"

# Deploy backend and restart service
backend-restart: deploy-backend
	@echo "$(GREEN)Installing Python dependencies...$(NC)"
	ssh $(BACKEND_USER)@$(BACKEND_HOST) "cd $(BACKEND_DIR) && python3 -m pip install -r requirements.txt"
	@echo "$(GREEN)Restarting backend service...$(NC)"
	ssh $(BACKEND_USER)@$(BACKEND_HOST) "cd $(BACKEND_DIR) && systemctl restart telco-backend || echo 'Service restart failed - you may need to start it manually'"
	@echo "$(GREEN)Backend service restarted!$(NC)"

# Deploy both frontend and backend
deploy-full-stack: prod deploy-backend
	@echo "$(GREEN)Full stack deployment completed!$(NC)"
	@echo "$(YELLOW)Frontend: http://$(NGINX_HOST)$(NC)"
	@echo "$(YELLOW)Backend API: http://$(BACKEND_HOST):8000$(NC)"

# Test connections to both servers
test-connection:
	@echo "$(GREEN)Testing connections to servers...$(NC)"
	@echo "$(YELLOW)Testing nginx server ($(NGINX_HOST))...$(NC)"
	@if ssh $(NGINX_USER)@$(NGINX_HOST) "echo 'Nginx connection successful'"; then \
		echo "$(GREEN)Nginx connection successful!$(NC)"; \
	else \
		echo "$(RED)Failed to connect to nginx server.$(NC)"; \
	fi
	@echo "$(YELLOW)Testing backend server ($(BACKEND_HOST))...$(NC)"
	@if ssh $(BACKEND_USER)@$(BACKEND_HOST) "echo 'Backend connection successful'"; then \
		echo "$(GREEN)Backend connection successful!$(NC)"; \
	else \
		echo "$(RED)Failed to connect to backend server.$(NC)"; \
	fi 