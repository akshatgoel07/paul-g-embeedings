.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help up down dev migrate ingest logs ps clean install ml-setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install JS dependencies
	pnpm install

up: ## Start infra containers (postgres, qdrant, redis)
	docker compose up -d --wait

down: ## Stop infra containers
	docker compose down

dev: up migrate ## One command: infra up + migrate + run all apps
	pnpm dev

migrate: ## Apply Prisma migrations
	pnpm --filter @pg/db run migrate:deploy

ingest: ## Run the ingestion pipeline (RSS -> clean -> chunk -> embed -> Qdrant)
	pnpm --filter @pg/ingest run ingest

logs: ## Tail infra logs
	docker compose logs -f

ps: ## Show container status
	docker compose ps

clean: ## Stop containers and remove volumes (DESTRUCTIVE)
	docker compose down -v

ml-setup: ## Create the Python venv for ml/
	cd ml && python3 -m venv .venv && ./.venv/bin/pip install -e ".[dev]"
