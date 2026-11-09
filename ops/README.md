# CI и деплой в Coolify

На `push` и при ручном запуске для `main` и `test` Woodpecker собирает Docker-образ. Внутри сборки выполняются `npm ci`, линтер и сборка Vite. Затем Woodpecker проверяет главную страницу и `/health` в собранном контейнере.

После успешной проверки на `push` Woodpecker публикует образ в реестр Darim как `127.0.0.1:5000/darim-frontend:<SHA коммита>` и обновляет тег соответствующего окружения. Затем запрашивает деплой через вебхук приложения Coolify. В логе выводится UUID деплоя. Ручной запуск в Woodpecker выполняет сборку и проверки.

| Ветка | Окружение Coolify | Тег образа | Секрет с вебхуком | Деплой |
| --- | --- | --- | --- | --- |
| `main` | `production` | `production` | `coolify_deploy_webhook` | Выключен |
| `test` | `test` | `test` | `coolify_test_deploy_webhook` | [test-ui.wishes.hype-ny.ru](https://test-ui.wishes.hype-ny.ru) |

Пока `production-enabled` в `.woodpecker.yaml` равен `'false'`, ветка `main` выполняет только сборку и проверки. Чтобы включить production после настройки его вебхука, установите `production-enabled` в `'true'`.

## Подключение

1. В [Woodpecker Darim](https://ci.hype-ny.ru) администратор добавляет `sharphurt` в `WOODPECKER_REPO_OWNERS` и задаёт `WOODPECKER_GITHUB_PUBLIC_ONLY=false`. При закрытой регистрации администратор добавляет пользователя `sharphurt` через `woodpecker-cli user`. Владелец репозитория авторизуется через GitHub OAuth с доступом к приватным репозиториям и активирует `sharphurt/darim-frontend`. Администратор включает Trusted Volumes для монтирования сокета CI Docker. Pull requests оставляет выключенными. Описание текущей установки есть в [Darim](https://github.com/tripples25/darim/blob/main/docs/woodpecker.md).
2. В [Coolify](https://coolify.hype-ny.ru) создаёт приложение типа **Docker Image** для каждого окружения на том же VPS. В обоих приложениях Image Name — `127.0.0.1:5000/darim-frontend`, Ports Exposes — `80`. Выбирает тег из таблицы. Для health check задаёт `GET /health` на порту `80`.
3. Сохраняет Deploy Webhook каждого приложения под именем из таблицы и токен Coolify с разрешением `deploy` как `coolify_token`. В Woodpecker эти секреты должны быть доступны для события `push`. [Документация Coolify](https://coolify.io/docs/core/automation/deploy-webhooks)
4. Отправляет коммит в нужную ветку после подключения вебхука GitHub. Проверяет публикацию тега окружения в Woodpecker и завершение деплоя в Coolify.

Для отката можно указать тег нужного коммита в настройках приложения и запустить Redeploy. Чтобы снова получать обновления из своей ветки, верните тег окружения.

Nginx раздаёт собранный React-клиент. Прокси из `vite.config.js` действует при локальной разработке. Для подключения API на production маршруты `/api` и `/auth` потребуется настроить на том же домене, где работает клиент.
