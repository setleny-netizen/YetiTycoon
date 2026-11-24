/* Berloga, daily quests, achievements and player statistics.
   Client-only features are saved in localStorage. Shared rankings and authoritative server time
   require a backend and are deliberately not simulated here. */
(function () {
    'use strict';

    const META_KEY = 'iceMiner_berloga_v1';
    const REWARDS = {
        quests: {
            easy: { dollars: 1200, ice: 120 },
            medium: { dollars: 3000, ice: 300 },
            hard: { dollars: 7000, ice: 700 },
            elite: { dollars: 15000, ice: 1500 }
        },
        achievements: {
            bronze: { dollars: 1500, ice: 150 },
            silver: { dollars: 5000, ice: 500 },
            gold: { dollars: 15000, ice: 1500 },
            diamond: { dollars: 50000, ice: 5000 }
        }
    };

    const QUEST_GROUPS = [
        {
            category: 'Ручная добыча',
            tasks: [
                { id: 'hand-100', title: 'Первые удары', description: 'Добудь 100 льда вручную', metric: 'manualIce', target: 100, reward: 'easy' },
                { id: 'hand-1000', title: 'Ледоруб', description: 'Добудь 1 000 льда вручную', metric: 'manualIce', target: 1000, reward: 'medium' },
                { id: 'hand-5000', title: 'Упорная добыча', description: 'Добудь 5 000 льда вручную', metric: 'manualIce', target: 5000, reward: 'hard' },
                { id: 'hand-10000', title: 'Смена мастера', description: 'Добудь 10 000 льда вручную', metric: 'manualIce', target: 10000, reward: 'elite' },
                { id: 'hand-10min', title: 'Десять минут работы', description: 'Добывай лёд вручную 10 минут', metric: 'manualMinutes', target: 10, reward: 'hard' }
            ]
        },
        {
            category: 'Биржа',
            tasks: [
                { id: 'sell-500', title: 'Первая продажа', description: 'Продай 500 льда', metric: 'soldIce', target: 500, reward: 'easy' },
                { id: 'sell-1000', title: 'Партия побольше', description: 'Продай 1 000 льда', metric: 'soldIce', target: 1000, reward: 'medium' },
                { id: 'buy-500', title: 'Пополнение запасов', description: 'Купи 500 льда', metric: 'boughtIce', target: 500, reward: 'easy' },
                { id: 'buy-1000', title: 'Закупка', description: 'Купи 1 000 льда', metric: 'boughtIce', target: 1000, reward: 'medium' },
                { id: 'trades-3', title: 'Активный торговец', description: 'Соверши 3 сделки', metric: 'marketTrades', target: 3, reward: 'medium' },
                { id: 'trades-5', title: 'День на бирже', description: 'Соверши 5 сделок', metric: 'marketTrades', target: 5, reward: 'hard' },
                { id: 'sales-10000', title: 'Хорошая выручка', description: 'Продай лёд на 10 000$', metric: 'salesRevenue', target: 10000, reward: 'hard' }
            ]
        },
        {
            category: 'Бизнес',
            tasks: [
                { id: 'business-ice-5000', title: 'Первые поставки', description: 'Получи 5 000 льда с предприятий', metric: 'businessIce', target: 5000, reward: 'medium' },
                { id: 'business-ice-10000', title: 'Крупная поставка', description: 'Получи 10 000 льда с предприятий', metric: 'businessIce', target: 10000, reward: 'hard' },
                { id: 'upgrade-1', title: 'Вложение в дело', description: 'Улучши предприятие', metric: 'upgradeCount', target: 1, reward: 'medium' },
                { id: 'hire-1', title: 'Новый работник', description: 'Найми одного работника', metric: 'hireCount', target: 1, reward: 'medium' },
                { id: 'open-1', title: 'Новое предприятие', description: 'Открой предприятие', metric: 'farmOpened', target: 1, reward: 'hard' }
            ]
        },
        {
            category: 'Финансы',
            tasks: [
                { id: 'earn-10000', title: 'Выручка дня', description: 'Заработай 10 000$', metric: 'moneyEarned', target: 10000, reward: 'medium' },
                { id: 'earn-50000', title: 'Большая выручка', description: 'Заработай 50 000$', metric: 'moneyEarned', target: 50000, reward: 'elite' },
                { id: 'upgrade-spend-5000', title: 'Инвестиции', description: 'Потрать 5 000$ на улучшения', metric: 'upgradeSpend', target: 5000, reward: 'medium' },
                { id: 'spend-10000', title: 'Крупная покупка', description: 'Потрать 10 000$ на покупки', metric: 'moneySpent', target: 10000, reward: 'hard' },
                { id: 'capital-100000', title: 'Капитал растёт', description: 'Достигни общего капитала 100 000$', metric: 'netWorth', target: 100000, reward: 'hard' }
            ]
        },
        {
            category: 'Активность',
            tasks: [
                { id: 'login', title: 'С возвращением', description: 'Зайди в игру сегодня', metric: 'login', target: 1, reward: 'easy' },
                { id: 'play-10', title: 'Время в игре', description: 'Проведи в игре 10 минут', metric: 'playMinutes', target: 10, reward: 'medium' },
                { id: 'visit-market', title: 'На биржу', description: 'Посети биржу', metric: 'visitMarket', target: 1, reward: 'easy' },
                { id: 'visit-business', title: 'Проверка предприятия', description: 'Открой любое предприятие', metric: 'visitBusiness', target: 1, reward: 'easy' },
                { id: 'claim-3', title: 'Список дел', description: 'Забери награды за 3 задания', metric: 'dailyClaims', target: 3, reward: 'hard' }
            ]
        }
    ];

    const ACHIEVEMENTS = [
        { category: 'Ручная добыча', id: 'mine-100', title: 'Первые удары', description: 'Добудь 100 льда вручную', metric: 'manualIce', target: 100, reward: 'bronze' },
        { category: 'Ручная добыча', id: 'mine-1000', title: 'Ледоруб', description: 'Добудь 1 000 льда вручную', metric: 'manualIce', target: 1000, reward: 'bronze' },
        { category: 'Ручная добыча', id: 'mine-10000', title: 'Работяга', description: 'Добудь 10 000 льда вручную', metric: 'manualIce', target: 10000, reward: 'silver' },
        { category: 'Ручная добыча', id: 'mine-100000', title: 'Мастер добычи', description: 'Добудь 100 000 льда вручную', metric: 'manualIce', target: 100000, reward: 'gold' },
        { category: 'Ручная добыча', id: 'mine-1000000', title: 'Ледяной магнат', description: 'Добудь 1 000 000 льда вручную', metric: 'manualIce', target: 1000000, reward: 'diamond' },
        { category: 'Ручная добыча', id: 'mine-10000000', title: 'Легенда ледника', description: 'Добудь 10 000 000 льда вручную', metric: 'manualIce', target: 10000000, reward: 'diamond' },

        { category: 'Биржа', id: 'sell-first', title: 'Первая сделка', description: 'Продай лёд на бирже', metric: 'sellDeals', target: 1, reward: 'bronze' },
        { category: 'Биржа', id: 'sell-1000', title: 'Начинающий торговец', description: 'Продай 1 000 льда', metric: 'soldIce', target: 1000, reward: 'bronze' },
        { category: 'Биржа', id: 'sell-100000', title: 'Оптовик', description: 'Продай 100 000 льда', metric: 'soldIce', target: 100000, reward: 'silver' },
        { category: 'Биржа', id: 'trade-100', title: 'Биржевой игрок', description: 'Соверши 100 сделок', metric: 'marketTrades', target: 100, reward: 'gold' },
        { category: 'Биржа', id: 'sales-1000000', title: 'Миллионер биржи', description: 'Получи 1 000 000$ от продаж', metric: 'salesRevenue', target: 1000000, reward: 'gold' },
        { category: 'Биржа', id: 'sales-100000000', title: 'Король биржи', description: 'Получи 100 000 000$ от продаж', metric: 'salesRevenue', target: 100000000, reward: 'diamond' },

        { category: 'Финансовое состояние', id: 'worth-10000', title: 'Первые деньги', description: 'Достигни капитала 10 000$', metric: 'netWorth', target: 10000, reward: 'bronze' },
        { category: 'Финансовое состояние', id: 'worth-100000', title: 'Начинающий бизнесмен', description: 'Достигни капитала 100 000$', metric: 'netWorth', target: 100000, reward: 'silver' },
        { category: 'Финансовое состояние', id: 'worth-1000000', title: 'Предприниматель', description: 'Достигни капитала 1 000 000$', metric: 'netWorth', target: 1000000, reward: 'gold' },
        { category: 'Финансовое состояние', id: 'worth-10000000', title: 'Миллионер', description: 'Достигни капитала 10 000 000$', metric: 'netWorth', target: 10000000, reward: 'gold' },
        { category: 'Финансовое состояние', id: 'worth-100000000', title: 'Магнат', description: 'Достигни капитала 100 000 000$', metric: 'netWorth', target: 100000000, reward: 'diamond' },
        { category: 'Финансовое состояние', id: 'worth-1000000000', title: 'Миллиардер', description: 'Достигни капитала 1 000 000 000$', metric: 'netWorth', target: 1000000000, reward: 'diamond' },

        { category: 'Развитие бизнеса', id: 'farm-first', title: 'Первое предприятие', description: 'Открой первое предприятие', metric: 'farmOpened', target: 1, reward: 'bronze' },
        { category: 'Развитие бизнеса', id: 'hire-first', title: 'Работодатель', description: 'Найми первого работника', metric: 'hireCount', target: 1, reward: 'bronze' },
        { category: 'Развитие бизнеса', id: 'upgrade-10', title: 'Развитие', description: 'Выполни 10 улучшений', metric: 'upgradeCount', target: 10, reward: 'silver' },
        { category: 'Развитие бизнеса', id: 'farm-3', title: 'Бизнесмен', description: 'Открой 3 предприятия', metric: 'farmOpened', target: 3, reward: 'silver' },
        { category: 'Развитие бизнеса', id: 'farm-5', title: 'Империя', description: 'Открой 5 предприятий', metric: 'farmOpened', target: 5, reward: 'gold' },
        { category: 'Развитие бизнеса', id: 'farm-all', title: 'Промышленник', description: 'Открой все три вида предприятий', metric: 'farmTypeCount', target: 3, reward: 'diamond' },

        { category: 'Накопление льда', id: 'ice-1000', title: 'Ледяной запас', description: 'Имей 1 000 льда одновременно', metric: 'iceBalance', target: 1000, reward: 'bronze' },
        { category: 'Накопление льда', id: 'ice-100000', title: 'Хранилище', description: 'Имей 100 000 льда одновременно', metric: 'iceBalance', target: 100000, reward: 'silver' },
        { category: 'Накопление льда', id: 'ice-1000000', title: 'Ледяная гора', description: 'Имей 1 000 000 льда одновременно', metric: 'iceBalance', target: 1000000, reward: 'gold' },
        { category: 'Накопление льда', id: 'ice-10000000', title: 'Ледяной океан', description: 'Имей 10 000 000 льда одновременно', metric: 'iceBalance', target: 10000000, reward: 'diamond' }
    ];

    const CATEGORIES = Array.from(new Set(ACHIEVEMENTS.map(function (item) { return item.category; })));
    const PROMO_CODES = Object.freeze({}); // Добавляйте выданные коды сюда; серверное управление появится позже.
    const DEFAULT_METRICS = {
        manualIce: 0, manualSeconds: 0, soldIce: 0, boughtIce: 0, sellDeals: 0, buyDeals: 0,
        marketTrades: 0, salesRevenue: 0, moneyEarned: 0, moneySpent: 0, upgradeSpend: 0,
        upgradeCount: 0, farmOpened: 0, farmTypes: [], hireCount: 0, playMs: 0
    };

    function utcDay() {
        return new Date().toISOString().slice(0, 10);
    }

    function createDaily(day) {
        const items = QUEST_GROUPS.map(function (group) {
            const options = group.tasks;
            const pick = options[Math.floor(Math.random() * options.length)];
            return Object.assign({}, pick, { category: group.category });
        });
        return { day: day, items: items, progress: {}, claimed: {}, loginRecorded: false };
    }

    function loadMeta() {
        const empty = { version: 1, metrics: Object.assign({}, DEFAULT_METRICS), achievements: {}, promoUsed: [], daily: null };
        try {
            const saved = JSON.parse(localStorage.getItem(META_KEY) || 'null');
            if (!saved || typeof saved !== 'object') return empty;
            return {
                version: 1,
                metrics: Object.assign({}, DEFAULT_METRICS, saved.metrics || {}),
                achievements: saved.achievements || {},
                promoUsed: Array.isArray(saved.promoUsed) ? saved.promoUsed : [],
                daily: saved.daily || null
            };
        } catch (e) {
            return empty;
        }
    }

    const meta = loadMeta();
    function persistMeta() {
        try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
    }

    function ensureDaily() {
        const day = utcDay();
        if (!meta.daily) {
            meta.daily = createDaily(day);
            persistMeta();
            return;
        }
        if (meta.daily.day === day) return;
        // Do not roll the save backwards if the device date was moved into the past.
        if (String(meta.daily.day) > day) return;
        meta.daily = createDaily(day);
        persistMeta();
    }

    ensureDaily();

    function dailyAdd(metric, amount) {
        ensureDaily();
        if (!meta.daily.progress) meta.daily.progress = {};
        meta.daily.progress[metric] = (Number(meta.daily.progress[metric]) || 0) + amount;
    }

    function showToast(message) {
        if (typeof toast === 'function') toast(message);
    }

    function fmtNumber(number) {
        return typeof fmt === 'function' ? fmt(number) : String(Math.floor(Number(number) || 0));
    }

    function fmtDollars(number) {
        return typeof fmtMoney === 'function' ? fmtMoney(number) : fmtNumber(number);
    }

    function getNetWorth() {
        const currentPrice = typeof priceAt === 'function' ? priceAt(Date.now()) : 0;
        const owned = typeof farms !== 'undefined' ? farms : [];
        const businessValue = owned.reduce(function (sum, farm) {
            try { return sum + farmCapital(farm).total; } catch (e) { return sum; }
        }, 0);
        return (Number(dollarCount) || 0) + Math.max(0, Number(iceCount) || 0) * currentPrice + businessValue;
    }

    function getFarmTypeCount() {
        const types = new Set(Array.isArray(meta.metrics.farmTypes) ? meta.metrics.farmTypes : []);
        if (typeof farms !== 'undefined') farms.forEach(function (farm) { if (farm && farm.type) types.add(farm.type); });
        return types.size;
    }

    function getMetric(metric) {
        const m = meta.metrics;
        if (metric === 'netWorth') return getNetWorth();
        if (metric === 'iceBalance') return Math.max(0, Number(iceCount) || 0);
        if (metric === 'ownedFarms') return typeof farms !== 'undefined' ? farms.length : 0;
        if (metric === 'farmTypeCount') return getFarmTypeCount();
        if (metric === 'manualMinutes') return (Number(meta.daily.progress.manualSeconds) || 0) / 60;
        if (metric === 'playMinutes') return (Number(meta.daily.progress.playSeconds) || 0) / 60;
        if (metric === 'visitMarket' || metric === 'visitBusiness' || metric === 'dailyClaims' || metric === 'login') {
            return Number(meta.daily.progress[metric]) || 0;
        }
        return Number(meta.daily.progress[metric]) || 0;
    }

    function getCareerMetric(metric) {
        if (metric === 'netWorth') return getNetWorth();
        if (metric === 'iceBalance') return Math.max(0, Number(iceCount) || 0);
        if (metric === 'ownedFarms') return typeof farms !== 'undefined' ? farms.length : 0;
        if (metric === 'farmTypeCount') return getFarmTypeCount();
        return Number(meta.metrics[metric]) || 0;
    }

    function award(reward, countAsEarned) {
        if (!reward) return;
        const dollars = Number(reward.dollars) || 0;
        const ice = Number(reward.ice) || 0;
        if (dollars) {
            dollarCount = round2(dollarCount + dollars);
            if (countAsEarned !== false) {
                meta.metrics.moneyEarned += dollars;
                dailyAdd('moneyEarned', dollars);
            }
        }
        if (ice) iceCount += ice;
        renderResources();
        saveState();
    }

    function unlockReadyAchievements() {
        ACHIEVEMENTS.forEach(function (item) {
            if (meta.achievements[item.id]) return;
            if (getCareerMetric(item.metric) < item.target) return;
            meta.achievements[item.id] = Date.now();
            award(REWARDS.achievements[item.reward], true);
            showToast('Достижение: ' + item.title);
        });
    }

    function track(eventName, value) {
        const m = meta.metrics;
        if (eventName === 'manualIce') {
            const amount = Math.max(0, Number(value) || 0);
            m.manualIce += amount;
            dailyAdd('manualIce', amount);
        } else if (eventName === 'marketSell') {
            const amount = Math.max(0, Number(value.amount) || 0);
            const revenue = Math.max(0, Number(value.revenue) || 0);
            m.soldIce += amount; m.sellDeals += 1; m.marketTrades += 1;
            m.salesRevenue += revenue; m.moneyEarned += revenue;
            dailyAdd('soldIce', amount); dailyAdd('sellDeals', 1); dailyAdd('marketTrades', 1);
            dailyAdd('salesRevenue', revenue); dailyAdd('moneyEarned', revenue);
        } else if (eventName === 'marketBuy') {
            const amount = Math.max(0, Number(value.amount) || 0);
            const cost = Math.max(0, Number(value.cost) || 0);
            m.boughtIce += amount; m.buyDeals += 1; m.marketTrades += 1;
            m.moneySpent += cost;
            dailyAdd('boughtIce', amount); dailyAdd('buyDeals', 1); dailyAdd('marketTrades', 1);
            dailyAdd('moneySpent', cost);
        } else if (eventName === 'moneySpent') {
            const amount = Math.max(0, Number(value) || 0);
            m.moneySpent += amount;
            dailyAdd('moneySpent', amount);
        } else if (eventName === 'upgrade') {
            const amount = Math.max(0, Number(value) || 0);
            m.upgradeCount += 1; m.upgradeSpend += amount;
            dailyAdd('upgradeCount', 1); dailyAdd('upgradeSpend', amount);
        } else if (eventName === 'farmOpened') {
            m.farmOpened += 1;
            if (!Array.isArray(m.farmTypes)) m.farmTypes = [];
            if (typeof value === 'string' && !m.farmTypes.includes(value)) m.farmTypes.push(value);
            dailyAdd('farmOpened', 1);
        } else if (eventName === 'hire') {
            m.hireCount += 1;
            dailyAdd('hireCount', 1);
        } else if (eventName === 'businessIce') {
            const amount = Math.max(0, Number(value) || 0);
            dailyAdd('businessIce', amount);
        } else if (eventName === 'visitMarket') {
            dailyAdd('visitMarket', 1);
        } else if (eventName === 'visitBusiness') {
            dailyAdd('visitBusiness', 1);
        } else if (eventName === 'moneyEarned') {
            const amount = Math.max(0, Number(value) || 0);
            m.moneyEarned += amount;
            dailyAdd('moneyEarned', amount);
        }
        unlockReadyAchievements();
        persistMeta();
        refreshOpenPanel();
    }

    window.yetiTrack = track;

    function progressBar(value, target) {
        const pct = target > 0 ? Math.min(100, Math.max(0, value / target * 100)) : 0;
        return '<div class="den-progress"><span style="width:' + pct + '%"></span></div>';
    }

    function rewardText(reward) {
        const parts = [];
        if (reward.ice) parts.push('+' + fmtNumber(reward.ice) + ' льда');
        if (reward.dollars) parts.push('+$' + fmtDollars(reward.dollars));
        return parts.join(' · ');
    }

    const denModal = document.getElementById('den-modal');
    const denTitle = document.getElementById('den-modal-title');
    const denBody = document.getElementById('den-modal-body');
    const achievementTabs = document.getElementById('den-achievement-tabs');
    const profileMenu = document.getElementById('profile-menu');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    let activeAchievementCategory = CATEGORIES[0];

    function openDenModal(title) {
        denTitle.textContent = title;
        denModal.classList.add('show');
        denBody.scrollTop = 0;
    }

    function closeDenModal() {
        denModal.classList.remove('show');
    }

    document.getElementById('den-close').addEventListener('click', closeDenModal);
    document.getElementById('den-back').addEventListener('click', closeDenModal);
    denModal.addEventListener('pointerdown', function (event) {
        if (event.target === denModal) closeDenModal();
    });

    function renderQuests() {
        ensureDaily();
        const list = meta.daily.items.map(function (item) {
            const value = getMetric(item.metric);
            const done = value >= item.target;
            const claimed = !!meta.daily.claimed[item.id];
            const reward = REWARDS.quests[item.reward];
            const status = claimed ? 'Выполнено' : (done ? 'Можно забрать' : 'Выполняется');
            const card = document.createElement('article');
            card.className = 'den-card' + (claimed ? ' is-done' : '');
            card.innerHTML =
                '<div class="den-card-top"><div><h3>' + item.title + '</h3><p>' + item.description + '</p></div><span class="den-status">' + status + '</span></div>' +
                '<div class="den-progress-label"><span>' + fmtNumber(Math.min(value, item.target)) + ' / ' + fmtNumber(item.target) + '</span><b>' + rewardText(reward) + '</b></div>' +
                progressBar(value, item.target);
            if (done && !claimed) {
                const button = document.createElement('button');
                button.className = 'den-action';
                button.textContent = 'Забрать награду';
                button.addEventListener('click', function () {
                    if (meta.daily.claimed[item.id] || getMetric(item.metric) < item.target) return;
                    meta.daily.claimed[item.id] = true;
                    dailyAdd('dailyClaims', 1);
                    award(reward, true);
                    persistMeta();
                    renderQuests();
                    unlockReadyAchievements();
                });
                card.appendChild(button);
            }
            return card;
        });
        denBody.innerHTML =
            '<div class="den-note">Задания обновляются ежедневно в 00:00 UTC. Прогресс сохраняется в этом браузере.</div>' +
            '<div class="den-list"></div>';
        const container = denBody.querySelector('.den-list');
        list.forEach(function (card) { container.appendChild(card); });
    }

    function renderAchievements() {
        const done = Object.keys(meta.achievements).length;
        const pct = Math.round(done / ACHIEVEMENTS.length * 100);
        const summary = '<div class="den-summary"><b>' + done + ' / ' + ACHIEVEMENTS.length + '</b><span>достижений · ' + pct + '%</span></div>';
        achievementTabs.innerHTML = '';
        CATEGORIES.forEach(function (category) {
            const button = document.createElement('button');
            button.className = 'den-tab' + (category === activeAchievementCategory ? ' active' : '');
            button.textContent = category;
            button.addEventListener('click', function () {
                activeAchievementCategory = category;
                renderAchievements();
            });
            achievementTabs.appendChild(button);
        });

        const items = ACHIEVEMENTS.filter(function (item) { return item.category === activeAchievementCategory; });
        denBody.innerHTML = summary + '<div class="den-list"></div><div class="den-note">Достижения сохраняются навсегда. Награда выдаётся автоматически один раз.</div>';
        const list = denBody.querySelector('.den-list');
        items.forEach(function (item) {
            const value = getCareerMetric(item.metric);
            const unlocked = !!meta.achievements[item.id];
            const reward = REWARDS.achievements[item.reward];
            const card = document.createElement('article');
            card.className = 'den-card' + (unlocked ? ' is-done' : '');
            card.innerHTML =
                '<div class="den-card-top"><div><h3>' + item.title + '</h3><p>' + item.description + '</p></div><span class="den-status">' + (unlocked ? 'Получено' : 'Не получено') + '</span></div>' +
                '<div class="den-progress-label"><span>' + fmtNumber(Math.min(value, item.target)) + ' / ' + fmtNumber(item.target) + '</span><b>' + rewardText(reward) + '</b></div>' +
                progressBar(value, item.target);
            list.appendChild(card);
        });
    }

    function renderStats() {
        const currentPrice = priceAt(Date.now());
        const iceValue = iceCount * currentPrice;
        const businessValue = farms.reduce(function (sum, farm) { return sum + farmCapital(farm).total; }, 0);
        const net = dollarCount + iceValue + businessValue;
        const m = meta.metrics;
        const lines = [
            ['Деньги на счету', '$' + fmtDollars(dollarCount)],
            ['Лёд в запасе', fmtNumber(iceCount)],
            ['Текущая цена льда', '$' + currentPrice.toFixed(2).replace('.', ',')],
            ['Рыночная стоимость льда', '$' + fmtDollars(iceValue)],
            ['Стоимость предприятий', '$' + fmtDollars(businessValue)],
            ['Общий капитал', '$' + fmtDollars(net)],
            ['Всего добыто вручную', fmtNumber(m.manualIce)],
            ['Всего продано льда', fmtNumber(m.soldIce)],
            ['Всего куплено льда', fmtNumber(m.boughtIce)],
            ['Заработано денег', '$' + fmtDollars(m.moneyEarned)],
            ['Потрачено денег', '$' + fmtDollars(m.moneySpent)],
            ['Открыто предприятий (с начала учёта)', fmtNumber(m.farmOpened)],
            ['Улучшений (с начала учёта)', fmtNumber(m.upgradeCount)],
            ['Нанято работников (с начала учёта)', fmtNumber(m.hireCount)],
            ['Время в игре', typeof fmtDuration === 'function' ? fmtDuration(m.playMs) : '0 мин']
        ];
        denBody.innerHTML =
            '<div class="den-note">Исторический учёт начинается с добавления этого раздела. Старые действия не восстанавливаются из текущего баланса.</div>' +
            '<div class="den-stat-highlight"><span>Общий капитал</span><b>$' + fmtDollars(net) + '</b></div>' +
            '<div class="den-stat-grid">' + lines.map(function (line) {
                return '<div class="den-stat"><span>' + line[0] + '</span><b>' + line[1] + '</b></div>';
            }).join('') + '</div>';
    }

    function renderPromo() {
        denBody.innerHTML =
            '<div class="den-note">Введи выданный тебе промокод. Коды появятся после подключения системы управления промокодами.</div>' +
            '<label class="den-label" for="den-promo-input">Промокод</label>' +
            '<div class="den-promo-row"><input id="den-promo-input" maxlength="40" autocomplete="off" placeholder="Например, ICE2026"><button class="den-action" id="den-promo-activate">Активировать</button></div>' +
            '<div class="den-message" id="den-promo-message" aria-live="polite"></div>';
        const input = document.getElementById('den-promo-input');
        const message = document.getElementById('den-promo-message');
        document.getElementById('den-promo-activate').addEventListener('click', function () {
            const code = input.value.trim().toUpperCase();
            if (!code) { message.textContent = 'Введи промокод.'; return; }
            if (meta.promoUsed.includes(code)) { message.textContent = 'Промокод уже использован.'; return; }
            const record = PROMO_CODES[code];
            if (!record) { message.textContent = 'Промокод не найден.'; return; }
            if (record.expiresAt && Date.now() > record.expiresAt) { message.textContent = 'Срок действия промокода истёк.'; return; }
            meta.promoUsed.push(code);
            award(record.reward, true);
            message.textContent = 'Промокод успешно активирован.';
            persistMeta();
        });
    }

    function renderMail() {
        denBody.innerHTML = '<div class="den-empty"><span class="den-empty-icon">✉</span><b>У вас пока нет сообщений</b><p>Системные письма и награды появятся здесь.</p></div>';
    }

    function renderInventory() {
        denBody.innerHTML = '<div class="den-empty"><span class="den-empty-icon">❄</span><b>Скоро</b><p>Инвентарь появится в одном из следующих обновлений.</p></div>';
    }

    function refreshOpenPanel() {
        if (!denModal.classList.contains('show')) return;
        const type = denModal.dataset.section;
        const scrollTop = denBody.scrollTop;
        if (type === 'quests') renderQuests();
        if (type === 'achievements') renderAchievements();
        if (type === 'stats') renderStats();
        denBody.scrollTop = scrollTop;
    }

    function openSection(section) {
        denModal.dataset.section = section;
        if (section !== 'achievements') achievementTabs.innerHTML = '';
        if (section === 'inventory') { openDenModal('Инвентарь'); renderInventory(); }
        if (section === 'quests') { openDenModal('Задания'); renderQuests(); }
        if (section === 'achievements') { openDenModal('Достижения'); renderAchievements(); }
        if (section === 'stats') { openDenModal('Статистика'); renderStats(); }
        if (section === 'promo') { openDenModal('Промокод'); renderPromo(); }
        if (section === 'mail') { openDenModal('Почта'); renderMail(); }
    }

    document.querySelectorAll('.den-hotspot').forEach(function (button) {
        button.addEventListener('click', function () { openSection(button.dataset.section); });
    });

    const topButton = document.getElementById('leaderboard-open');
    const topTabs = document.getElementById('leaderboard-tabs');
    const topBody = document.getElementById('leaderboard-body');
    const LEADERBOARD_TYPES = [
        { id: 'wealth', name: 'Богатейшие', description: 'Сортировка по общему капиталу.' },
        { id: 'miners', name: 'Добытчики', description: 'Сортировка по добытому вручную льду.' },
        { id: 'traders', name: 'Торговцы', description: 'Сортировка по проданному на бирже льду.' },
        { id: 'business', name: 'Предприниматели', description: 'Сортировка по числу открытых предприятий.' }
    ];
    let activeLeaderboard = LEADERBOARD_TYPES[0].id;

    function renderLeaderboard() {
        topTabs.innerHTML = '';
        LEADERBOARD_TYPES.forEach(function (item) {
            const button = document.createElement('button');
            button.className = 'den-tab' + (activeLeaderboard === item.id ? ' active' : '');
            button.textContent = item.name;
            button.addEventListener('click', function () {
                activeLeaderboard = item.id;
                renderLeaderboard();
            });
            topTabs.appendChild(button);
        });
        topBody.innerHTML =
            '<div class="den-empty"><span class="den-empty-icon">🏆</span><b>Рейтинг пока недоступен</b><p>' +
            LEADERBOARD_TYPES.find(function (item) { return item.id === activeLeaderboard; }).description +
            ' Для общего рейтинга игроков нужен сервер. Сейчас игра хранит данные только в этом браузере, поэтому чужие места и показатели не показываются.</p></div>';
    }

    topButton.addEventListener('click', function () {
        profileMenu.classList.remove('show');
        renderLeaderboard();
        leaderboardModal.classList.add('show');
    });
    document.getElementById('leaderboard-close').addEventListener('click', function () {
        leaderboardModal.classList.remove('show');
    });
    leaderboardModal.addEventListener('pointerdown', function (event) {
        if (event.target === leaderboardModal) leaderboardModal.classList.remove('show');
    });

    let lastSecond = Date.now();
    let lastPaintSecond = 0;
    setInterval(function () {
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(2, (now - lastSecond) / 1000));
        lastSecond = now;
        ensureDaily();
        if (!document.hidden && elapsed > 0) {
            meta.metrics.playMs += elapsed * 1000;
            dailyAdd('playSeconds', elapsed);
            if (typeof isMining !== 'undefined' && isMining && currentTab === 'glacier') {
                meta.metrics.manualSeconds += elapsed;
                dailyAdd('manualSeconds', elapsed);
            }
        }
        const second = Math.floor(now / 1000);
        if (second !== lastPaintSecond) {
            lastPaintSecond = second;
            unlockReadyAchievements();
            refreshOpenPanel();
            persistMeta();
        }
    }, 1000);

    function updateDerivedProgress() {
        unlockReadyAchievements();
        persistMeta();
    }

    ensureDaily();
    if (!meta.daily.loginRecorded) {
        dailyAdd('login', 1);
        meta.daily.loginRecorded = true;
    }
    updateDerivedProgress();
})();