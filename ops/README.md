# CI и деплой в Coolify

Woodpecker выполняет `npm ci`, линтер и сборку Vite при push и ручном запуске для веток `main` и `test`.

## Тестовое окружение

В [Coolify](https://coolify.hype-ny.ru) подключите приватный репозиторий `sharphurt/darim-frontend` с отдельным ключом чтения. Для приложения в окружении `test` укажите ветку `test`, Build Pack **Dockerfile**, путь `/Dockerfile`, порт `80` и домен [test-ui.wishes.hype-ny.ru](https://test-ui.wishes.hype-ny.ru). DNS должен указывать на сервер Coolify.

После успешной проверки коммита в [Woodpecker](https://ci.hype-ny.ru/repos/2) нажмите **Deploy** в Coolify. Coolify соберёт образ из ветки `test`. Проверьте результат в Deployment Logs, главную страницу и ответ `/health`.

## Production

Для `main` настроены только проверки. Приложение в окружении `production` остановлено.

Прокси Vite действует при локальной разработке. Маршруты `/api` и `/auth` на развёрнутом фронтенде нужно настроить отдельно при подключении API.
