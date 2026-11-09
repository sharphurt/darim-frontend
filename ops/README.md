# CI и деплой в Coolify

На `push` и при ручном запуске для `main` Woodpecker собирает Docker-образ. Внутри сборки выполняются `npm ci`, линтер и сборка Vite. Затем Woodpecker проверяет главную страницу и `/health` в собранном контейнере.

После успешной проверки на `push` Woodpecker публикует образ в реестр Darim как `127.0.0.1:5000/darim-frontend:<SHA коммита>` и обновляет тег `production`. Затем запрашивает деплой через вебхук отдельного приложения Coolify. В логе выводится UUID, по которому можно проверить результат в разделе Deployments. Ручной запуск в Woodpecker выполняет сборку и проверки.

## Подключение

1. В [Woodpecker Darim](https://ci.hype-ny.ru) администратор добавляет `sharphurt` в `WOODPECKER_REPO_OWNERS` и задаёт `WOODPECKER_GITHUB_PUBLIC_ONLY=false`. При закрытой регистрации администратор добавляет пользователя `sharphurt` через `woodpecker-cli user`. Владелец репозитория авторизуется через GitHub OAuth с доступом к приватным репозиториям и активирует `sharphurt/darim-frontend`. Администратор включает Trusted Volumes для монтирования сокета CI Docker. Pull requests оставляет выключенными. Описание текущей установки есть в [Darim](https://github.com/tripples25/darim/blob/main/docs/woodpecker.md).
2. В [Coolify](https://coolify.hype-ny.ru) создаёт отдельное приложение типа **Docker Image** на том же VPS. Image Name — `127.0.0.1:5000/darim-frontend`, Tag — `production`, Ports Exposes — `80`. Для health check задаёт `GET /health` на порту `80`. Первый запуск станет доступен после публикации образа.
3. Копирует Deploy Webhook нового приложения и создаёт токен Coolify с разрешением `deploy`. Сохраняет их в секретах репозитория Woodpecker как `coolify_deploy_webhook` и `coolify_token`, разрешённых для события `push`. [Документация Coolify](https://coolify.io/docs/core/automation/deploy-webhooks)
4. Отправляет коммит в `main` после подключения вебхука GitHub. Проверяет публикацию двух тегов в Woodpecker и завершение деплоя в Coolify.

Для отката можно указать тег нужного коммита в настройках приложения и запустить Redeploy. Чтобы снова получать обновления из `main`, верните тег `production`.

Nginx раздаёт собранный React-клиент. Прокси из `vite.config.js` действует при локальной разработке. Для подключения API на production маршруты `/api` и `/auth` потребуется настроить на том же домене, где работает клиент.
