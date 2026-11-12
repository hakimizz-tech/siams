@echo off
setlocal

if "%~1"=="" goto :up
if /I "%~1"=="help" goto :help
if /I "%~1"=="init" goto :init
if /I "%~1"=="up" goto :up
if /I "%~1"=="up-frontend" goto :up_frontend
if /I "%~1"=="up-s3" goto :up_s3
if /I "%~1"=="down" goto :down
if /I "%~1"=="build" goto :build
if /I "%~1"=="logs" goto :logs
if /I "%~1"=="ps" goto :ps
if /I "%~1"=="restart" goto :restart
if /I "%~1"=="shell" goto :shell
if /I "%~1"=="dbshell" goto :dbshell
if /I "%~1"=="migrate" goto :migrate
if /I "%~1"=="makemigrations" goto :makemigrations
if /I "%~1"=="superuser" goto :superuser
if /I "%~1"=="seed" goto :seed
if /I "%~1"=="test" goto :test
if /I "%~1"=="test-cov" goto :test_cov
if /I "%~1"=="lint" goto :lint
if /I "%~1"=="format" goto :format
if /I "%~1"=="imports" goto :imports
if /I "%~1"=="schema" goto :schema
if /I "%~1"=="newman" goto :newman
if /I "%~1"=="prod-build" goto :prod_build
if /I "%~1"=="prod-up" goto :prod_up
if /I "%~1"=="prod-migrate" goto :prod_migrate
if /I "%~1"=="clean" goto :clean
if /I "%~1"=="alpha-migrations" goto :alpha_migrations
if /I "%~1"=="alpha-test" goto :alpha_test
if /I "%~1"=="alpha-check" goto :alpha_check
if /I "%~1"=="reports-test" goto :reports_test

echo Unknown command: %~1
echo Run "setup.bat help" for available commands.
exit /b 1

:help
echo Usage: setup.bat ^<command^> [arguments]
echo.
echo Project setup and Docker lifecycle:
echo   init              Create .env from .env.example
echo   up                Start the development stack and rebuild images
echo   up-frontend       Start the stack with the frontend profile
echo   up-s3             Start the stack with the MinIO/S3 profile
echo   down              Stop the stack and keep volumes
echo   build             Build Docker images
echo   logs [service]    Follow service logs
echo   ps                Show service status
echo   restart [service] Restart a service
echo   clean             Stop the stack and delete volumes
echo.
echo Django and development tools:
echo   shell             Open the Django shell_plus
echo   dbshell           Open a PostgreSQL shell
echo   migrate           Apply database migrations
echo   makemigrations [app]  Create migrations
echo   superuser         Create a coordinator/superuser
echo   seed              Load development demo data
echo   test [args]       Run the test suite
echo   test-cov          Run tests with coverage
echo   lint              Run Ruff and import-boundary checks
echo   format            Fix formatting and lint issues
echo   imports           Check Alpha/Beta import boundaries
echo   schema            Validate the OpenAPI schema
echo   newman            Run the Postman API collection
echo.
echo Team checks:
echo   alpha-migrations  Generate Alpha migrations
echo   alpha-test       Run Alpha tests
echo   alpha-check      Run Alpha quality gates and tests
echo   reports-test     Run reports tests
echo.
echo Production:
echo   prod-build        Build production images
echo   prod-up           Start the production stack
echo   prod-migrate      Apply production migrations
exit /b 0

:init
if exist .env (
    echo .env already exists.
    exit /b 0
)
if not exist .env.example (
    echo .env.example was not found.
    exit /b 1
)
copy /Y .env.example .env >nul
echo Created .env from .env.example.
exit /b 0

:up
call :require_docker || exit /b 1
call :init || exit /b 1
docker compose up -d --build
if errorlevel 1 exit /b %errorlevel%
echo API docs: http://localhost/api/docs/
echo Mailpit:   http://localhost:8025
echo RabbitMQ:  http://localhost:15672
exit /b 0

:up_frontend
call :require_docker || exit /b 1
call :init || exit /b 1
docker compose --profile frontend up -d --build
exit /b %errorlevel%

:up_s3
call :require_docker || exit /b 1
call :init || exit /b 1
docker compose --profile s3 up -d --build
exit /b %errorlevel%

:down
call :require_docker || exit /b 1
docker compose down
exit /b %errorlevel%

:build
call :require_docker || exit /b 1
docker compose build
exit /b %errorlevel%

:logs
call :require_docker || exit /b 1
docker compose logs -f --tail=100 %2
exit /b %errorlevel%

:ps
call :require_docker || exit /b 1
docker compose ps
exit /b %errorlevel%

:restart
call :require_docker || exit /b 1
docker compose restart %2
exit /b %errorlevel%

:shell
call :require_docker || exit /b 1
docker compose exec backend python manage.py shell_plus
exit /b %errorlevel%

:dbshell
call :require_docker || exit /b 1
docker compose exec db sh -c "psql -U %POSTGRES_USER% -d %POSTGRES_DB%"
exit /b %errorlevel%

:migrate
call :require_docker || exit /b 1
docker compose run --rm backend python manage.py migrate
exit /b %errorlevel%

:makemigrations
call :require_docker || exit /b 1
docker compose run --rm backend python manage.py makemigrations %2
exit /b %errorlevel%

:superuser
call :require_docker || exit /b 1
docker compose exec backend python manage.py createsuperuser
exit /b %errorlevel%

:seed
call :require_docker || exit /b 1
docker compose exec backend python manage.py seed_demo_data
exit /b %errorlevel%

:test
call :require_docker || exit /b 1
docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend pytest %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:test_cov
call :require_docker || exit /b 1
docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend pytest --cov=apps --cov-report=term-missing %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:lint
call :require_docker || exit /b 1
docker compose run --rm backend sh -c "ruff check . && ruff format --check . && lint-imports"
exit /b %errorlevel%

:format
call :require_docker || exit /b 1
docker compose run --rm backend sh -c "ruff check --fix . && ruff format ."
exit /b %errorlevel%

:imports
call :require_docker || exit /b 1
docker compose run --rm backend lint-imports
exit /b %errorlevel%

:schema
call :require_docker || exit /b 1
docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml
exit /b %errorlevel%

:newman
call :require_docker || exit /b 1
npx --yes newman run postman/siams.postman_collection.json -e postman/local.postman_environment.json --working-dir postman
exit /b %errorlevel%

:prod_build
call :require_docker || exit /b 1
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
exit /b %errorlevel%

:prod_up
call :require_docker || exit /b 1
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
exit /b %errorlevel%

:prod_migrate
call :require_docker || exit /b 1
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RUN_MIGRATIONS=0 backend python manage.py migrate --noinput
exit /b %errorlevel%

:clean
call :require_docker || exit /b 1
docker compose down -v
exit /b %errorlevel%

:alpha_migrations
call :require_docker || exit /b 1
docker compose run --rm --no-deps --entrypoint "" -e DJANGO_SETTINGS_MODULE=config.settings.test backend python manage.py makemigrations accounts placements assessments
exit /b %errorlevel%

:alpha_test
call :require_docker || exit /b 1
docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend pytest apps/core apps/accounts apps/placements apps/assessments apps/reports tests -q %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:alpha_check
call :require_docker || exit /b 1
docker compose run --rm backend sh -c "ruff check --fix . && ruff format . && lint-imports && DJANGO_SETTINGS_MODULE=config.settings.test python manage.py makemigrations --check --dry-run && DJANGO_SETTINGS_MODULE=config.settings.test python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml"
if errorlevel 1 exit /b %errorlevel%
call :alpha_test %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:reports_test
call :require_docker || exit /b 1
docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend pytest apps/reports -q %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:require_docker
where docker >nul 2>nul
if errorlevel 1 (
    echo Docker was not found. Install and start Docker Desktop first.
    exit /b 1
)
docker info >nul 2>nul
if errorlevel 1 (
    echo Docker Desktop is not running or is not accessible.
    exit /b 1
)
exit /b 0
