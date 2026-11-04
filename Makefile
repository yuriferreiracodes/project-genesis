SHELL := /bin/zsh

.PHONY: help studio frontend

help:
	@echo "Usage: make <target>"
	@echo "Available targets:"
	@echo "  studio    Starts LangGraph Studio in ./backend"
	@echo "  frontend  Starts the Next.js server in ./frontend"

studio:
	@echo "[backend] Starting LangGraph Studio backend..."
	@cd backend && source .venv/bin/activate && langgraph dev

frontend:
	@echo "[frontend] Starting Next.js dev server..."
	@cd frontend && npm run dev
