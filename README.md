# Crypto Scanner Mini App

Telegram Mini App для крипто-скринера.

## Деплой на Vercel

1. Залей папку на GitHub
2. Vercel → New Project → импортируй репозиторий
3. Framework Preset: **Other**
4. Root Directory: `/` (корень)
5. Deploy

## Подключить к боту

После деплоя получишь URL типа `https://crypto-scanner-app.vercel.app`

В @BotFather:
1. `/mybots` → выбери бота
2. `Bot Settings` → `Menu Button`
3. Вставь URL и название кнопки (например: `📊 Открыть сканер`)

## Структура

```
index.html     — точка входа
vercel.json    — настройки Vercel
src/
  style.css    — стили (glassmorphism)
  api.js       — загрузка данных (Binance, F&G)
  pages.js     — рендер страниц
  app.js       — логика и роутинг
```
