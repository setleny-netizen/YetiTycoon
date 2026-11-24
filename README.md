# Ice Miner

Браузерная игра на чистых HTML, CSS и JavaScript. Сторонние JS-пакеты для запуска не нужны.

## Структура

- `index.html` — разметка игры.
- `css/styles.css` — оформление.
- `js/game.js` — игровая логика и загрузка изображений.
- `assets/` — изображения игры.
- `scripts/optimize_assets.py` — создание облегчённых WebP-версий PNG-изображений.

## Изображения

Добавляй изображения в `assets/` с именами без пробелов и сохраняй ожидаемые игрой имена: `berloga`, `factory`, `fon`, `ice`, `lake`, `loading`, `miner`, `miner1h`, `miner6h`, `miner24h`, `6h`, `12h`, `24h`, `X2`, `X10`, `pol`, `pole`, `profile`, `prorab`, `pushka`, `snow`, `yeti_axe`, `yeti_saw`.

Пока игра настроена на PNG. После добавления PNG можно запустить `python scripts/optimize_assets.py` из корня проекта. Скрипт создаст WebP-файлы и переключит игру на них; исходные PNG останутся на месте.

## Запуск

Открой `index.html` в браузере. Для локального сервера из корня проекта можно выполнить `python -m http.server 8000`, затем открыть `http://localhost:8000`.
