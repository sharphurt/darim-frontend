# CI и деплой в Coolify

Woodpecker выполняет `npm ci`, линтер и сборку Vite при push и ручном запуске для веток `main` и `test`.

## Тестовое окружение

В [Coolify](https://coolify.hype-ny.ru) подключите приватный репозиторий `sharphurt/darim-frontend` с отдельным ключом чтения. Для приложения в окружении `test` укажите ветку `test`, Build Pack **Dockerfile**, путь `/Dockerfile`, порт `80` и домен [test-ui.wishes.hype-ny.ru](https://test-ui.wishes.hype-ny.ru). DNS должен указывать на сервер Coolify.

После успешных проверок на push в `test` [Woodpecker](https://ci.hype-ny.ru/repos/2) отправляет `POST` на вебхук тестового приложения Coolify. Для шага `deploy-test` нужны секреты `coolify_test_deploy_webhook` с адресом вебхука и `coolify_token` с правом деплоя тестового приложения. Оба секрета должны быть доступны на push.

Coolify собирает Dockerfile из ветки `test`. По UUID из лога Woodpecker можно найти результат в Deployment Logs. При ручном запуске Woodpecker выполняет только проверки.

## Production

С 18 ноября 2026 основной сайт [wishes.hype-ny.ru](https://wishes.hype-ny.ru/) обслуживает React. Production-приложение Coolify: `darim-frontend-production`, UUID `dncy9cdvvoiwyi7islmaqoua`, ветка `main`, порт 80, alias `darim-react-ui` в сети `coolify`. Автоматический деплой этого приложения выключен: на push в `main` Woodpecker выполняет проверки, а релиз запускается отдельно через Coolify после готовности совместимого API.

Для ручного запуска используется **POST** `/api/v1/deploy` с JSON `{"uuid":"dncy9cdvvoiwyi7islmaqoua","force":false}`. Административный токен передаётся только через защищённое хранилище. `GET` на этом endpoint больше не запускает деплой. [Подтверждённый релиз](releases/2026-11-18-react.md).

Публичный Caddy направляет `/api/*` и `/auth/*` непосредственно на backend, остальные страницы — на React/nginx. Оба приложения используют один origin; backend сохраняет существующий доверенный IP Caddy. Nginx обслуживает только интерфейс, без дополнительного проксирования API. Полная последовательность и откат — в [react-cutover.md](react-cutover.md).

Прокси Vite действует при локальной разработке. В production маршруты `/api` и `/auth` настроены в Caddy; `/health` проверяет backend, `/frontend-health` — nginx.
