// Lightweight interface localization. The saved choice is shared by this browser profile.
(function () {
    const KEY = 'shaggyTycoonLanguage';
    const translations = {
        exchange: ['Биржа', 'Exchange'],
        mining: ['Добыча', 'Mining'],
        glacier: ['Ледник', 'Glacier'],
        den: ['Берлога', 'Den'],
        shop: ['Магазин', 'Shop'],
        statistics: ['Статистика', 'Statistics'],
        profileTitle: ['Профиль', 'Profile'],
        playerName: ['Имя игрока', 'Display name'],
        saveName: ['Сохранить', 'Save'],
        telegramId: ['ID Telegram', 'Telegram ID'],
        language: ['Язык', 'Language'],
        resetProgress: ['Сбросить прогресс', 'Reset progress'],
        'Нажмите ещё раз': 'Tap again',
        'Топ': 'Leaderboard',
        'Топ игроков': 'Leaderboard',
        'Кланы': 'Clans',
        'Кланы появятся позже': 'Clans are coming soon',
        'Закрыть': 'Close',
        'Стоп': 'Stop',
        'Старт': 'Start',
        'Купить': 'Buy',
        'Продать': 'Sell',
        'Назад': 'Back',
        '‹ Назад': '‹ Back',
        '‹ Профиль': '‹ Profile',
        '‹ Берлога': '‹ Den',
        'Изменить имя': 'Edit name',
        'Улучшить': 'Upgrade',
        'Уровень': 'Level',
        'Статистика': 'Statistics',
        'Общий капитал': 'Total net worth',
        'Валюты на счету': 'Cash balance',
        'Льда на счету': 'Ice balance',
        'Добыто льда вручную': 'Ice mined manually',
        'Заработано на трейдинге': 'Earned from trading',
        'Время в игре': 'Time played',
        'Сколько ферм открыто': 'Businesses unlocked',
        'Задания': 'Quests',
        'Достижения': 'Achievements',
        'Промокоды': 'Promo codes',
        'Почта': 'Mail',
        'Инвентарь': 'Inventory',
        'Ледорез': 'Ice Cutter',
        'Снежная ферма': 'Snow Farm',
        'Ледозавод': 'Ice Factory',
        'Автомайнер': 'Auto-miner',
        'VIP': 'VIP',
        'Не хватает льда': 'Not enough ice',
        'Не хватает долларов': 'Not enough dollars',
        'Автомайнер запущен': 'Auto-miner started',
        'Автомайнер остановлен': 'Auto-miner stopped',
        'Рейтинг пока недоступен': 'Rankings are not available yet',
        'Лёд:': 'Ice:', 'Лёд': 'Ice', 'Льда': 'ice', 'долларов': 'dollars',
        'Баланс:': 'Balance:', 'Продать:': 'Sell:', 'Купить:': 'Buy:',
        'Получите': 'You receive', 'Заплатите': 'You pay', 'Всё': 'All',
        'Курс 1 льда · график 3 часа': 'Price per ice · 3-hour chart',
        'Суммарная добыча льда в час': 'Total ice mined per hour',
        'Построить ферму': 'Build a business', 'Мои фермы': 'My businesses',
        'Выберите ферму': 'Choose a business', 'Фермы': 'Businesses',
        'Предыдущая страница слотов': 'Previous slots page', 'Следующая страница слотов': 'Next slots page',
        '‹ Категории': '‹ Categories', '‹ Назад': '‹ Back',
        'Листай товары свайпом': 'Swipe to browse products',
        'Йети добывает лёд сам, даже пока игра закрыта': 'Yeti mines ice automatically, even while you are away',
        'Пять уровней привилегий и бонусов': 'Five tiers of perks and bonuses',
        'Биржа': 'Exchange', 'Топ игроков': 'Leaderboard', 'Эмблема клана': 'Clan emblem',
        'Открыть панель администратора': 'Open admin panel', 'Панель администратора': 'Admin panel',
        'Вернуться в берлогу': 'Return to den', 'Ледяная берлога': 'Ice den',
        'Макет интерфейса': 'Interface preview',
        'Действия включим после подключения сервера и проверки прав разработчика.': 'Actions will be enabled after the server is connected and developer access is verified.',
        'Обзор': 'Overview', 'Рассылка': 'Broadcast', 'Выдача': 'Grant items', 'Журнал': 'Log', 'Модерация': 'Moderation',
        'Привет, разработчик': 'Welcome, developer', 'Управление игровым миром Shaggy Tycoon': 'Manage the Shaggy Tycoon game world',
        'Игроки': 'Players', 'Подключим сервер': 'Connect the server', 'Ожидают настройки': 'Setup pending',
        'История рассылок': 'Broadcast history', 'Быстрые действия': 'Quick actions',
        'Создать промокод': 'Create promo code', 'Написать игрокам': 'Message players', 'Выдать награду': 'Grant reward',
        'Модерация игроков': 'Player moderation', 'История действий': 'Activity log',
        'Кто, кому и что выдал — откройте журнал': 'See who granted what to whom in the log',
        'Новый промокод': 'New promo code', 'Код промокода': 'Promo code', 'Например, YETI2026': 'For example, YETI2026',
        'Награда': 'Reward', 'Количество': 'Amount', 'Доллары': 'Dollars', 'Количество / уровень': 'Amount / tier',
        'Лимит активаций': 'Redemption limit', 'Без лимита': 'No limit', 'Срок действия': 'Expiration date',
        'Создание и проверка кодов будут выполняться сервером.': 'Promo codes will be created and validated by the server.',
        'Сообщение игрокам': 'Message players', 'Аудитория': 'Audience', 'Все игроки': 'All players',
        'Активные за сутки': 'Active in the last 24 hours', 'Выбранные игроки': 'Selected players',
        'Текст сообщения': 'Message text', 'Напишите объявление для игроков…': 'Write an announcement for players…',
        'Предпросмотр': 'Preview', 'Текст сообщения появится здесь.': 'The message will appear here.',
        'Отправить сообщение': 'Send message', 'Рассылка будет доступна после подключения Telegram-бота.': 'Broadcasts will be available after the Telegram bot is connected.',
        'Выдать предмет игроку': 'Grant an item to a player', 'Telegram ID или игровой ID': 'Telegram ID or game ID',
        'Что выдать': 'Item to grant', 'Например, VIP III': 'For example, VIP III', 'Комментарий к выдаче': 'Grant note',
        'Причина или заметка в журнале': 'Reason or note for the log', 'Выдачи потребуют подтверждения роли и сохранятся в журнале.': 'Grants will require role verification and be recorded in the log.',
        'Журнал действий': 'Activity log', 'Тип действия': 'Action type', 'Все действия': 'All actions',
        'Выдача награды': 'Reward granted', 'Промокод': 'Promo code', 'Сообщение': 'Message', 'Штраф или блокировка': 'Penalty or ban',
        'Поиск игрока': 'Find player', 'Имя или ID игрока': 'Player name or ID', 'Когда': 'When', 'Кому': 'To',
        'Действие': 'Action', 'Кто выполнил': 'Performed by',
        'Записи появятся здесь после подключения сервера.': 'Entries will appear here after the server is connected.',
        'Историю нельзя будет редактировать из панели — это защитит журнал от подмены.': 'The log cannot be edited here, protecting it from tampering.',
        'Меры к игроку': 'Player actions', 'Найти по имени или ID': 'Find by name or ID', 'Игрок не выбран': 'No player selected',
        'Предупреждение': 'Warning', 'Временный бан': 'Temporary ban', 'Постоянный бан': 'Permanent ban',
        'Снять активную санкцию': 'Lift active penalty', 'Срок / сумма': 'Duration / amount', 'Например, 24 часа': 'For example, 24 hours',
        'Причина': 'Reason', 'Укажите причину меры': 'Enter a reason for this action', 'Применить меру': 'Apply action',
        'Панель в режиме просмотра': 'Panel is in preview mode', 'С возвращением!': 'Welcome back!', 'Отлично': 'Great',
        'Автомайнер · 1 час': 'Auto-miner · 1 hour', 'Автомайнер · 6 часов': 'Auto-miner · 6 hours', 'Автомайнер · 24 часа': 'Auto-miner · 24 hours',
        'Йети добывает по 15 льда в секунду. Работает онлайн и офлайн.': 'Yeti mines 15 ice per second, online and offline.',
        'Автоматическая добыча льда в течение шести часов.': 'Automatic ice mining for six hours.',
        'Автоматическая добыча льда в течение суток.': 'Automatic ice mining for 24 hours.',
        '4-й слот бизнеса · переводы до $100 000 раз в 6 часов · ежедневный автомайнер на 30 минут.': '4th business slot · transfers up to $100,000 every 6 hours · 30-minute daily auto-miner bonus.',
        '5-й слот бизнеса · переводы до $300 000 раз в 6 часов · ежедневный автомайнер на 2 часа.': '5th business slot · transfers up to $300,000 every 6 hours · 2-hour daily auto-miner bonus.',
        '6-й слот · переводы до $1 млн раз в 6 часов · бонус 4 часа · ×2 ко всей добыче.': '6th slot · transfers up to $1M every 6 hours · 4-hour bonus · ×2 to all mining.',
        '7-й слот · переводы до $6 млн раз в 6 часов · бонус 8 часов · ×3 ко всей добыче.': '7th slot · transfers up to $6M every 6 hours · 8-hour bonus · ×3 to all mining.',
        '8 слотов · переводы до $20 млн раз в 6 часов · бонус 12 часов · ×5 ко всей добыче.': '8 slots · transfers up to $20M every 6 hours · 12-hour bonus · ×5 to all mining.',
        'Забрать ежедневный бонус автомайнера': 'Claim daily auto-miner bonus',
        'Навсегда': 'Forever', '24 часа': '24 hours', 'Купить за': 'Buy for', 'Оплата Stars станет доступна после подключения Telegram-бота': 'Stars payments will be available after the Telegram bot is connected.',
        'Ежедневный бонус уже получен': 'Daily bonus already claimed', 'Бонус автомайнера активирован': 'Auto-miner bonus activated',
        'Автомайнер выключен': 'Auto-miner is off', 'Скорость: 15 льда в секунду': 'Rate: 15 ice per second',
        'Оплата Stars появится после подключения игры к Telegram': 'Stars payments will be available after the game is connected to Telegram',
        'Расчёт учитывает состояние каждого предприятия': 'Calculation accounts for each business state',
        'Уже активен ещё': 'Active for', 'Активен VIP': 'VIP active', 'осталось': 'remaining',
        'Ледозавод': 'Ice Factory', 'Снежная ферма': 'Snow Farm', 'Автомайнер запущен:': 'Auto-miner started:',
        'Не хватает денег на воду': 'Not enough money for water', 'Не хватает денег на найм': 'Not enough money to hire',
        'Свободный слот': 'Empty slot', 'Нажмите, чтобы построить ферму': 'Tap to build a business', 'Требуется VIP': 'VIP required',
        'Сначала откройте слот': 'Unlock slot first', 'Слот': 'Slot', 'Слот открыт': 'Slot unlocked',
        'Нет свободных слотов — улучшите VIP': 'No slots available — upgrade VIP', 'Нет свободных слотов': 'No slots available',
        'Генераторы': 'Generators', 'ремонтники': 'mechanics', 'Йети': 'Yetis', 'пилы': 'saws', 'прораб нанят': 'foreman hired', 'без прораба': 'no foreman', 'Пушки': 'Cannons', 'вручную': 'manual',
        'Добыча льда в час': 'Ice per hour', 'Лёд за всё время': 'Total ice mined', 'Открыт': 'Opened', 'Капитализация': 'Capitalization',
        'Закрыть бизнес ·': 'Close business ·', 'Точно закрыть?': 'Close for sure?', 'Вы получите 30% капитализации. Бизнес и все его улучшения исчезнут, слот освободится.': 'You will receive 30% of its value. The business and all upgrades will be removed, freeing the slot.',
        'Бизнес закрыт:': 'Business closed:', 'Ремонт': 'Repair', 'Заполнить': 'Fill', 'Улучшить до': 'Upgrade to',
        'Выручка': 'Revenue', 'Расходы': 'Expenses', 'Прибыль': 'Profit', 'Ремонтники:': 'Mechanics:',
        'Работает генераторов': 'Generators running', 'Производство льда': 'Ice production', 'Курс льда сейчас': 'Current ice price',
        'Вода (расход': 'Water (use', 'Ремонт без ремонтников (в среднем)': 'Repairs without mechanics (average)',
        'Зарплаты ремонтникам': 'Mechanic wages', 'Итого': 'Total',
        'Зарплаты списываются каждый час, даже если завод стоит. Баланс может уходить в минус.': 'Wages are charged every hour, even while the factory is idle. Your balance can go negative.',
        'Озеро заполнено — соберите лёд': 'The lake is full — collect the ice', 'Навык': 'Skill', 'обслуживает': 'services',
        'Нанять': 'Hire', 'Уволить': 'Fire', 'Пока никого нет. Генераторы чините вручную.': 'No mechanics yet. Repair generators manually.',
        'Оплата Stars появится после подключения игры к Telegram': 'Stars payment will be available after the game is connected to Telegram',
        'Сейчас': 'Now', 'Скоро': 'Coming soon', ' ч ': ' h ', ' мин': ' min', ' сек': ' sec', ' д': ' d',
        'Введите имя': 'Enter a name', 'Имя сохранено': 'Name saved', 'Имя не может быть пустым': 'Name cannot be empty',
        'Игрок': 'Player', 'Уровень': 'Level', 'Клан': 'Clan', 'Админ панель': 'Admin panel',
        'Общие фермы': 'Businesses', 'Только вручную': 'Manual only', '1 час': '1 hour', '6 часов': '6 hours', '12 часов': '12 hours',
        '30 минут': '30 minutes', '2 часа': '2 hours', '4 часа': '4 hours', '8 часов': '8 hours',
        'Ручная добыча': 'Manual mining', 'Финансы': 'Finances', 'Активность': 'Activity', 'Бизнес': 'Business',
        'Первые удары': 'First hits', 'Добудь': 'Mine', 'вручную': 'manually', 'Упорная добыча': 'Persistent miner',
        'Смена мастера': 'Master shift', 'Десять минут работы': 'Ten minutes of work', 'Первые удары': 'First hits',
        'Первая продажа': 'First sale', 'Партия побольше': 'A bigger batch', 'Пополнение запасов': 'Restock',
        'Закупка': 'Purchase', 'Активный торговец': 'Active trader', 'День на бирже': 'A day at the exchange',
        'Хорошая выручка': 'Good revenue', 'Первые поставки': 'First deliveries', 'Крупная поставка': 'Large delivery',
        'Вложение в дело': 'Business investment', 'Новый работник': 'New worker', 'Новое предприятие': 'New business',
        'Выручка дня': 'Daily revenue', 'Большая выручка': 'Big revenue', 'Инвестиции': 'Investments',
        'Крупная покупка': 'Big purchase', 'Капитал растёт': 'Growing capital', 'С возвращением': 'Welcome back',
        'Время в игре': 'Time played', 'На биржу': 'Visit the exchange', 'Проверка предприятия': 'Business check',
        'Список дел': 'To-do list', 'Зайди в игру сегодня': 'Log into the game today', 'Посети биржу': 'Visit the exchange',
        'Открой любое предприятие': 'Open any business', 'Забери награды за 3 задания': 'Claim rewards for 3 quests',
        'Добудь 100 льда вручную': 'Mine 100 ice manually', 'Добудь 1 000 льда вручную': 'Mine 1,000 ice manually',
        'Добудь 5 000 льда вручную': 'Mine 5,000 ice manually', 'Добудь 10 000 льда вручную': 'Mine 10,000 ice manually',
        'Добывай лёд вручную 10 минут': 'Mine ice manually for 10 minutes', 'Продай 500 льда': 'Sell 500 ice',
        'Продай 1 000 льда': 'Sell 1,000 ice', 'Купи 500 льда': 'Buy 500 ice', 'Купи 1 000 льда': 'Buy 1,000 ice',
        'Соверши 3 сделки': 'Complete 3 trades', 'Соверши 5 сделок': 'Complete 5 trades', 'Продай лёд на 10 000$': 'Sell $10,000 worth of ice',
        'Получи 5 000 льда с предприятий': 'Collect 5,000 ice from businesses', 'Получи 10 000 льда с предприятий': 'Collect 10,000 ice from businesses',
        'Улучши предприятие': 'Upgrade a business', 'Найми одного работника': 'Hire one worker', 'Открой предприятие': 'Open a business',
        'Заработай 10 000$': 'Earn $10,000', 'Заработай 50 000$': 'Earn $50,000', 'Потрать 5 000$ на улучшения': 'Spend $5,000 on upgrades',
        'Потрать 10 000$ на покупки': 'Spend $10,000 on purchases', 'Достигни общего капитала 100 000$': 'Reach $100,000 total net worth',
        'Требуется': 'Required', 'Получено': 'Claimed', 'Забрать': 'Claim', 'Награда:': 'Reward:', 'Прогресс': 'Progress',
        'Задания дня': 'Daily quests', 'Достижения': 'Achievements', 'Статистика': 'Statistics', 'Общий капитал': 'Total net worth',
        'Промокоды': 'Promo codes', 'Почта': 'Mail', 'Инвентарь': 'Inventory', 'Ничего пока нет': 'Nothing here yet',
        'Нет сообщений': 'No messages', 'Кланы появятся позже': 'Clans are coming soon', 'Всё': 'All'
    };
    let language = localStorage.getItem(KEY) === 'en' ? 'en' : 'ru';

    function localizeNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) return;
        if (node.parentElement && node.parentElement.closest('[data-no-i18n]')) return;
        const original = node.__yetiOriginalText || node.nodeValue;
        if (!node.__yetiOriginalText) node.__yetiOriginalText = original;
        const key = original.trim();
        if (!key) return;
        let translated = key;
        if (language === 'en') {
            const entries = Object.entries(translations)
                .flatMap(([source, value]) => Array.isArray(value) ? [[value[0], value[1]]] : value ? [[source, value]] : [])
                .filter(([source]) => source.length > 1)
                .sort((a, b) => b[0].length - a[0].length);
            entries.forEach(([source, target]) => { translated = translated.split(source).join(target); });
        } else {
            const pair = Object.entries(translations).find(([, value]) => Array.isArray(value) && value[1] === key);
            if (pair) translated = pair[1][0];
        }
        const exact = translations[key];
        if (Array.isArray(exact)) translated = exact[language === 'en' ? 1 : 0];
        else if (language === 'ru') translated = key;
        const leading = original.match(/^\s*/)[0], trailing = original.match(/\s*$/)[0];
        const output = leading + translated + trailing;
        if (node.nodeValue !== output) node.nodeValue = output;
    }

    function applyLanguage(next) {
        language = next === 'en' ? 'en' : 'ru';
        localStorage.setItem(KEY, language);
        document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const pair = translations[element.dataset.i18n];
            if (Array.isArray(pair)) element.textContent = pair[language === 'en' ? 1 : 0];
        });
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) localizeNode(walker.currentNode);
        document.querySelectorAll('[data-language]').forEach(button => {
            const active = button.dataset.language === language;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        const switcher = document.querySelector('.pm-language-switch');
        if (switcher) switcher.setAttribute('aria-label', language === 'en' ? 'Language' : 'Язык');
        document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(element => {
            ['placeholder', 'title', 'aria-label', 'alt'].forEach(attribute => {
                if (!element.hasAttribute(attribute)) return;
                const storage = '__yetiOriginal_' + attribute;
                if (!element[storage]) element[storage] = element.getAttribute(attribute);
                const source = element[storage];
                const exact = translations[source];
                if (language === 'en' && typeof exact === 'string') element.setAttribute(attribute, exact);
                else if (language === 'ru') element.setAttribute(attribute, source);
            });
        });
    }

    document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => applyLanguage(button.dataset.language));
    });
    new MutationObserver(records => records.forEach(record => {
        if (record.type === 'characterData') localizeNode(record.target);
        record.addedNodes && record.addedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) localizeNode(node);
            else if (node.querySelectorAll) {
                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) localizeNode(walker.currentNode);
            }
        });
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
    applyLanguage(language);
})();
