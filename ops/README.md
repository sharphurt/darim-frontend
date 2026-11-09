# CI и деплой в Coolify

Woodpecker выполняет `npm ci`, линтер и сборку Vite при push и ручном запуске для веток `main` и `test`.

## Тестовое окружение

В [Coolify](https://coolify.hype-ny.ru) подключите приватный репозиторий `sharphurt/darim-frontend` с отдельным ключом чтения. Для приложения в окружении `test` укажите ветку `test`, Build Pack **Dockerfile**, путь `/Dockerfile`, порт `80` и домен [test-ui.wishes.hype-ny.ru](https://test-ui.wishes.hype-ny.ru). DNS должен указывать на сервер Coolify.

После успешных проверок на push в `test` [Woodpecker](https://ci.hype-ny.ru/repos/2) отправляет `POST` на вебхук тестового приложения Coolify. Для шага `deploy-test` нужны секреты `coolify_test_deploy_webhook` с адресом вебхука и `coolify_token` с правом деплоя тестового приложения. Оба секрета должны быть доступны на push.

Coolify собирает Dockerfile из ветки `test`. По UUID из лога Woodpecker можно найти результат в Deployment Logs. При ручном запуске Woodpecker выполняет только проверки.

## Production

Для `main` настроены только проверки. Приложение в окружении `production` остановлено.

Прокси Vite действует при локальной разработке. Маршруты `/api` и `/auth` на развёрнутом фронтенде нужно настроить отдельно при подключении API.
