// Lightweight interface localization. The saved choice is shared by this browser profile.
(function () {
    const KEY = 'shaggyTycoonLanguage';
    const translations = {
        exchange: ['Биржа', 'Exchange'],
        mining: ['Добыча', 'Mining'],
        glacier: ['Ледник', 'Glacier'],
        den: ['Берлога', 'Den'],
        shop: ['Магазин', 'Shop'],
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
        'Рейтинг пока недоступен': 'Rankings are not available yet'
    };
    let language = localStorage.getItem(KEY) === 'en' ? 'en' : 'ru';

    function localizeNode(node) {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const original = node.__yetiOriginalText || node.nodeValue;
        if (!node.__yetiOriginalText) node.__yetiOriginalText = original;
        const key = original.trim();
        if (!key) return;
        const value = translations[key];
        let translated = null;
        if (Array.isArray(value)) translated = value[language === 'en' ? 1 : 0];
        else if (value) translated = language === 'en' ? value : key;
        if (translated !== null && node.nodeValue !== translated) node.nodeValue = translated;
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
