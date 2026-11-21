# CI и деплой в Coolify

Woodpecker выполняет тесты, линтер и сборку Vite для main.

## Тестовое окружение

Coolify собирает тестовый frontend из ветки `dev` через `/Dockerfile`. Dockerfile выполняет тесты и линтер до сборки сайта. В приложении `xx8mn1xps8cpcpa2uccltrhe` установите ветку `dev` и HEAD вместо фиксированного SHA, отключите preview deployments, настройте alias darim-test-ui и оставьте поле домена пустым. В Coolify разрешите получение подписанных webhook от Woodpecker. Расширение Woodpecker запускает этот шаг на push в dev, используя отдельный секрет тестового приложения. Coolify принимает прямые push и слияния PR в `dev`.

На [test-ui.wishes.hype-ny.ru](https://test-ui.wishes.hype-ny.ru) Caddy направляет `/api`, `/auth` и `/health` на приватный тестовый backend. Остальные запросы идут на frontend. Настройки схемы, backend и прокси находятся в `ops/dev/README.md` репозитория backend.

После push сравните `/frontend-release.json` с SHA коммита и проверьте `/health` и `/api/auth-info`. После перехода уберите старый секрет `coolify_test_deploy_webhook` из Woodpecker.

## Production

С 18 ноября 2026 основной сайт [wishes.hype-ny.ru](https://wishes.hype-ny.ru/) обслуживает React. Production-приложение Coolify: `darim-frontend-production`, UUID `dncy9cdvvoiwyi7islmaqoua`, ветка `main`, порт 80, alias `darim-react-ui` в сети `coolify`.

После успешных `npm ci`, тестов, линтера и сборки push в `main` автоматически запускает шаг `deploy-production`. Он фиксирует в Coolify именно проверенный `CI_COMMIT_SHA`, отправляет POST на деплой и ждёт его завершения. Затем сверяет коммит через публичный `/frontend-release.json` на основном домене. Ошибка сборки, выкладки, несовпадение версии или таймаут делают CI неуспешным. Для шага используется существующий секрет Woodpecker `coolify_token`, доступный на push. Его Coolify abilities: `read`, `write`, `deploy`; одного `deploy` недостаточно для фиксации SHA и ожидания результата. Значение токена в репозиторий не записывается.

Нативный автодеплой Coolify остаётся выключен, чтобы не обходить CI и не запускать вторую выкладку. Полный workflow ограничен одной одновременной обработкой через `concurrency`, поэтому следующие коммиты не обгоняют предыдущие между проверкой и выпуском. Ручной запуск CI выполняет проверки. GitHub ruleset для `main` требует PR и результат CodeQL. Список обходов оставлен пустым, чтобы прямой push не запускал production CI. Если frontend требует изменения API, сначала выпустить совместимый backend.

Для production CI достаточно scope приложения `dncy9cdvvoiwyi7islmaqoua`.

Для ручного запуска используется **POST** `/api/v1/deploy` с JSON `{"uuid":"dncy9cdvvoiwyi7islmaqoua","force":false}`. Административный токен передаётся только через защищённое хранилище. `GET` на этом endpoint больше не запускает деплой. [Подтверждённый релиз](releases/2026-11-18-react.md).

Coolify хранит SHA последней проверенной версии в `git_commit_sha`. Для ручного отката сначала явно указать нужный проверенный SHA. Версия `/frontend-release.json` формируется при старте nginx из служебного `SOURCE_COMMIT`, секретов в ней нет.

Публичный Caddy направляет `/api/*` и `/auth/*` непосредственно на backend, остальные страницы — на React/nginx. Оба приложения используют один origin; backend сохраняет существующий доверенный IP Caddy. Nginx обслуживает только интерфейс, без дополнительного проксирования API. Полная последовательность и откат — в [react-cutover.md](react-cutover.md).

Прокси Vite действует при локальной разработке. В production маршруты `/api` и `/auth` настроены в Caddy; `/health` проверяет backend, `/frontend-health` — nginx.
