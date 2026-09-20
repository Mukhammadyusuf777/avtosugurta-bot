# 🚗 Telegram-бот учета автостраховок (Cloudflare Workers & Cloudflare D1)

Полноценный Telegram-бот на **TypeScript / Node.js** для управления базой данных клиентов и полисов автострахования (ОСАГО, КАСКО, EAPL).
Работает полностью на **узбекском языке**, контролирует сроки окончания полисов, отправляет автоматические уведомления за 7 дней через **Cloudflare Cron Triggers**, собирает статистику и поддерживает добавление новых клиентов из текста или файлов (.txt / .csv).

Архитектура: **Serverless** (Cloudflare Workers + Cloudflare D1 SQL). Сервер не требуется, расходы $0/месяц.

---

## 🌟 Основные возможности

- 🇺🇿 **Интерфейс на узбекском языке (латиница)**: Удобные клавиатурные кнопки, карточки клиентов, цветовая индикация статусов.
- 📋 **Список клиентов (`Mijozlar ro'yxati`)**: Пагинация (по 5 клиентов на страницу) с кнопками «⬅️ Oldingi» / «Keyingi ➡️».
- ⚠️ **Истекающие за 7 дней (`Tugashi yaqinlashayotganlar`)**: Фильтрация полисов, у которых осталось <= 7 дней или срок уже истек.
- ⏰ **Ежедневные уведомления (Cloudflare Cron Trigger)**: Каждый день в 06:00 UTC (11:00 по Ташкенту) бот автоматически проверяет базу и отправляет администратору в Telegram список клиентов, у которых страховка истекает ровно через 7 дней.
- 📊 **Статистика (`Statistika`)**: Общее количество клиентов, количество и процент активных страховок, полисы с истекающим сроком, истекшие полисы.
- ➕ **Добавление клиентов текстом или файлом (`Yangi mijoz qo'shish`)**:
  - Умный парсер понимает разделители `|`, `;`, табуляцию, даты в форматах `YYYY-MM-DD` и `DD.MM.YYYY`.
  - Возможность вставить сразу несколько строк (пакетная вставка `batch insert`).
  - Поддержка отправки документов `.txt` или `.csv`.
- 🔍 **Поиск (`Qidirish`)**: Мгновенный поиск по гос. номеру (например, `60O664OO`), ФИО или номеру полиса.

---

## 🗄 Структура базы данных (Cloudflare D1)

Таблица `insurance_clients`:
- `id` — INTEGER PRIMARY KEY AUTOINCREMENT
- `full_name` — TEXT (ФИО клиента)
- `car_number` — TEXT (Гос. номер автомобиля)
- `policy_number` — TEXT (Номер полиса, например `EAPL 2256920`)
- `start_date` — TEXT (`YYYY-MM-DD`)
- `end_date` — TEXT (`YYYY-MM-DD`)
- `created_at` — TEXT (Дата добавления)

Файл начальных данных: `migrations/0002_seed.sql` содержит 13 клиентов из ТЗ.

---

## 🚀 Пошаговая инструкция по деплою

### Шаг 1. Установка зависимостей
```bash
npm install
```

### Шаг 2. Авторизация в Cloudflare
```bash
npx wrangler login
```
В открывшемся браузере подтвердите доступ.

### Шаг 3. Создание базы данных D1
```bash
npx wrangler d1 create avtosugurta-db
```
Команда выведет блок конфигурации:
```toml
[[d1_databases]]
binding = "DB"
database_name = "avtosugurta-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Скопируйте полученный `database_id` и вставьте его в файл `wrangler.toml` вместо `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### Шаг 4. Применение миграций (создание таблицы и 13 клиентов)
```bash
npm run d1:migrate:remote
```
*(Для локального тестирования можно выполнить `npm run d1:migrate:local`)*.

### Шаг 5. Настройка секретов Cloudflare (секретные переменные)
1. Токен вашего бота от @BotFather:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
```
*(Вставьте токен и нажмите Enter)*.

2. Chat ID администратора (куда бот будет присылать ежедневные напоминания о 7 днях):
```bash
npx wrangler secret put ADMIN_CHAT_ID
```
*(Ваш Telegram ID, можно узнать у бота @userinfobot)*.

3. *(Опционально)* Секретный токен для вебхука:
```bash
npx wrangler secret put SECRET_TOKEN
```

### Шаг 6. Деплой Worker в Cloudflare
```bash
npm run deploy
```
После завершения деплоя вы получите URL воркера:
```
https://avtosugurta-bot.<ваш-аккаунт>.workers.dev
```

### Шаг 7. Установка Webhook в Telegram
Откройте в браузере или выполните GET-запрос:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<ВАШ_WORKER_URL>/
```
Если вы указали `SECRET_TOKEN`:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<ВАШ_WORKER_URL>/&secret_token=<ВАШ_SECRET_TOKEN>
```
Ответ Telegram должен быть: `{"ok":true,"result":true,"description":"Webhook was set"}`.

Готово! Перейдите в бот и отправьте `/start`.
