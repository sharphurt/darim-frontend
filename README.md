# Дарим — фронтенд

Клиент общего вишлиста Darim на React, JavaScript и Vite. [Репозиторий Darim](https://github.com/tripples25/darim)

## Локальный запуск

Понадобится Node.js 24 с npm.

```sh
npm ci
npm run dev
```

Откройте адрес, который напечатает Vite. По умолчанию это `http://localhost:5173`.

Для работы с API запустите сервер Darim по инструкции из его репозитория. В режиме разработки Vite проксирует запросы к `/api` и `/auth` на `http://127.0.0.1:5080`.

## Проверки

```sh
npm run lint
npm run build
```

Сборка сохраняется в `dist/`. Команда `npm run preview` запускает её локальный просмотр.
