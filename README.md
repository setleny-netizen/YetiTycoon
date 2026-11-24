# Shaggy Tycoon

Браузерная игра на HTML, CSS и JavaScript без сторонних пакетов.

## Структура проекта

```text
index.html
assets/                         изображения игры, пока с общими именами
css/
  core/base.css                 загрузка, верхняя панель, навигация и общие экраны
  businesses/
    base.css                    общие элементы бизнесов
    hub.css                     список и хаб бизнесов
    cutter.css                  оформление «Ледореза»
    factory.css                 оформление «Ледозавода»
  features/
    glacier.css
    exchange.css
    shop.css
    overlays.css
    den.css
js/
  core/
    assets-loading.js
    state.js                    ресурсы, сохранение и общие игровые значения
    navigation.js
    game-loop.js
  businesses/
    catalog.js                  список и настройки типов бизнесов
    hub.js                      общий экран и список бизнесов
    build.js
    navigation.js
    shared/                     карта, прораб, управление и общая экономика
    snow/                       логика снежного бизнеса
    cutter/index.js             отдельная логика «Ледореза»
    factory/index.js            отдельная логика «Ледозавода»
  features/
    glacier/index.js
    exchange/index.js
    profile/index.js
    shop/index.js
    den/index.js                берлога, задания, достижения и статистика
scripts/
  optimize_assets.py
```

## Как расширять игру

- Новый бизнес добавляй отдельной папкой в `js/businesses/<название>/` и отдельным CSS-файлом в `css/businesses/`. Общие правила работы с фермами и их отображением остаются в `businesses/shared/`.
- Новую категорию магазина размещай в `js/features/shop/` и `css/features/shop.css`.
- Новую часть берлоги добавляй как отдельный модуль в `js/features/den/sections/`, а её оформление — в `css/features/den.css`. Подключение модулей и точка входа берлоги находятся в `features/den/index.js`.
- Порядок тегов `<script>` внизу `index.html` важен: это обычные скрипты, которые совместно используют существующее игровое состояние. Новые файлы подключай рядом с соответствующим разделом и после его зависимостей.

## Изображения

Изображения лежат в `assets/` и используются по именам без расширений: `admin`, `berloga`, `factory`, `fon`, `ice`, `lake`, `loading`, `miner`, `miner1h`, `miner6h`, `miner24h`, `6h`, `12h`, `24h`, `X2`, `X10`, `pol`, `pole`, `profile`, `prorab`, `pushka`, `snow`, `vip1`–`vip5`, `yeti_axe`, `yeti_saw`.

Игра сейчас настроена на PNG. Запуск `python scripts/optimize_assets.py` создаёт WebP-версии и переключает игру на них; PNG остаются на месте.

## Запуск

Открой `index.html` в браузере. Или из корня проекта запусти `python -m http.server 8000` и открой `http://localhost:8000`.
