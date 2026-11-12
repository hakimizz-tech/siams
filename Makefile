# SIAMS developer shortcuts. Run `make help`.
.DEFAULT_GOAL := help
COMPOSE ?= docker compose
PROD    ?= $(COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml
RUN     := $(COMPOSE) run --rm backend
EXEC    := $(COMPOSE) exec backend

.PHONY: help init hooks up up-frontend up-s3 down build logs ps restart shell dbshell \
        migrate makemigrations superuser seed test test-cov lint format imports schema \
        newman prod-build prod-up prod-migrate clean alpha-migrations alpha-test \
        alpha-check reports-test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

init: ## Create .env from .env.example (first run)
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "created .env")

hooks: ## Install git pre-commit hooks
	pre-commit install

up: init ## Start the dev stack (db, redis, rabbitmq, mailpit, backend, worker, beat, nginx)
	$(COMPOSE) up -d --build
	@echo "API docs: http://localhost/api/docs/   Mail: http://localhost:8025   RabbitMQ: http://localhost:15672"

up-frontend: init ## Start the dev stack including the frontend service
	$(COMPOSE) --profile frontend up -d --build

up-s3: init ## Start the dev stack plus MinIO (S3-compatible storage for parity tests)
	$(COMPOSE) --profile s3 up -d --build

down: ## Stop the stack (keeps volumes)
	$(COMPOSE) down

build: ## Build images
	$(COMPOSE) build

logs: ## Tail logs (usage: make logs s=backend)
	$(COMPOSE) logs -f --tail=100 $(s)

ps: ## Show running services
	$(COMPOSE) ps

restart: ## Restart a service (usage: make restart s=worker)
	$(COMPOSE) restart $(s)

shell: ## Django shell (shell_plus)
	$(EXEC) python manage.py shell_plus

dbshell: ## psql into the database
	$(COMPOSE) exec db sh -c 'psql -U $$POSTGRES_USER -d $$POSTGRES_DB'

migrate: ## Apply migrations
	$(RUN) python manage.py migrate

makemigrations: ## Create migrations (usage: make makemigrations a=placements)
	$(RUN) python manage.py makemigrations $(a)

superuser: ## Create a coordinator/superuser
	$(EXEC) python manage.py createsuperuser

seed: ## Run every app's seed() hook (dev only)
	$(EXEC) python manage.py seed_demo_data

test: ## Run the test suite (usage: make test args="apps/placements -k submit")
	$(RUN) env DJANGO_SETTINGS_MODULE=config.settings.test pytest $(args)

test-cov: ## Tests with coverage report
	$(RUN) env DJANGO_SETTINGS_MODULE=config.settings.test pytest --cov=apps --cov-report=term-missing

lint: ## ruff + import boundaries (team rules)
	$(RUN) sh -c "ruff check . && ruff format --check . && lint-imports"

format: ## Auto-format and fix
	$(RUN) sh -c "ruff check --fix . && ruff format ."

imports: ## Only check the Team Alpha / Team Beta import boundaries
	$(RUN) lint-imports

schema: ## Validate the generated OpenAPI schema
	$(RUN) env DJANGO_SETTINGS_MODULE=config.settings.test python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml

newman: ## Run the Postman collection against the running stack
	npx --yes newman run postman/siams.postman_collection.json -e postman/local.postman_environment.json --working-dir postman

prod-build: ## Build the production image
	$(PROD) build

prod-up: ## Start the production stack (run prod-migrate first on a new release)
	$(PROD) up -d

prod-migrate: ## Release step: apply migrations with the production image
	$(PROD) run --rm -e RUN_MIGRATIONS=0 backend python manage.py migrate --noinput

clean: ## Stop the stack and DELETE volumes (database, rabbitmq, redis)
	$(COMPOSE) down -v

alpha-migrations: ## Generate migrations for accounts, placements, assessments (run once, then commit)
	$(COMPOSE) run --rm --no-deps --entrypoint "" -e DJANGO_SETTINGS_MODULE=config.settings.test backend python manage.py makemigrations accounts placements assessments

alpha-test: ## Run the Alpha test suite (usage: make alpha-test args="-x -k placement")
	$(RUN) env DJANGO_SETTINGS_MODULE=config.settings.test pytest apps/core apps/accounts apps/placements apps/assessments apps/reports tests -q $(args)

alpha-check: ## Format, lint, boundaries, migrations drift, OpenAPI, then tests
	$(RUN) sh -c "ruff check --fix . && ruff format . && lint-imports && DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run && DJANGO_SETTINGS_MODULE=config.settings.test python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml"
	$(MAKE) alpha-test

reports-test: ## Run the reports tests (usage: make reports-test args="-x")
	$(RUN) env DJANGO_SETTINGS_MODULE=config.settings.test pytest apps/reports -q $(args)
-include Makefile.frontend
