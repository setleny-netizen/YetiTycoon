        // ==========================================
        // 2. ОБЩЕЕ СОСТОЯНИЕ (ресурсы, сохранение)
        // ==========================================
        const SAVE_KEY = 'iceMiner_v1';
        const START_DOLLARS = 15000;  // стартовый баланс при первом запуске
        const RESET_DOLLARS = 0;      // баланс после «Сбросить прогресс»
        const PRICE_MIN = 0.1;        // курс 1 льда колеблется от 0.1 $
        const PRICE_MAX = 0.3;        // до 0.3 $
        const BOURSE_WINDOW = 3 * 3600 * 1000; // окно графика — 3 часа

        const CANNON_PRICES = [1000, 7000, 25000, 70000];
        const FOREMAN_PRICE = 5000;
        const SLOT_BASE = 3;                              // слотов под фермы по умолчанию
        const SLOT_MAX = 8;                               // максимум слотов с VIP
        const SLOT_PRICES = { 4: 300000, 5: 7000000 };    // обычные цены слотов без VIP
        const PILES_PER_MIN_PER_CANNON = 5;
        const CANNON_INTERVAL = 60000 / PILES_PER_MIN_PER_CANNON; // 12 сек
        const HOLD_TIME = 1500;      // удержание на куче, мс
        const ICE_PER_PILE = 10;

        let iceCount = 0;
        let dollarCount = START_DOLLARS;
        let slotsOwned = SLOT_BASE;
        let loadedFarms = [];      // фермы из сохранения (создаются в разделе «Добыча»)
        let savedAtLoaded = 0;     // для оффлайн-прогресса
        let autoMinerUntil = 0;
        let autoMinerImage = 'miner1h';
        let autoMinerPaused = false;
        let vipTier = 0;
        let vipUntil = 0; // 0 — навсегда
        let vipPermanentTier = 0;
        let vipRentalTier = 0;
        let vipBonusClaimDate = '';
        let boostUntil = 0;
        let boostMultiplier = 1;
        let autoMinerRemainder = 0;
        let autoMinerLastAt = Date.now();

        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                iceCount = s.ice || 0;
                dollarCount = (typeof s.dollars === 'number') ? s.dollars : START_DOLLARS;
                slotsOwned = Math.max(SLOT_BASE, Math.min(SLOT_MAX, s.slots || SLOT_BASE));
                if (Array.isArray(s.farms)) {
                    loadedFarms = s.farms;
                } else if (Array.isArray(s.cannons)) {
                    // старое сохранение (одна ферма) переносим в первый слот
                    loadedFarms = [{ type: 'snow', cannons: s.cannons, foreman: !!s.foreman, piles: s.piles || 0 }];
                }
                savedAtLoaded = s.savedAt || 0;
                autoMinerUntil = Number(s.autoMinerUntil) || 0;
                autoMinerPaused = !!s.autoMinerPaused;
                vipTier = Math.max(0, Math.min(5, Number(s.vipTier) || 0));
                vipUntil = Number(s.vipUntil) || 0;
                vipPermanentTier = Math.max(0, Math.min(5, Number(s.vipPermanentTier) || (!vipUntil ? vipTier : 0)));
                vipRentalTier = Math.max(0, Math.min(5, Number(s.vipRentalTier) || (vipUntil ? vipTier : 0)));
                vipBonusClaimDate = String(s.vipBonusClaimDate || '');
                if (['miner1h', 'miner6h', 'miner24h'].includes(s.autoMinerImage)) autoMinerImage = s.autoMinerImage;
                boostUntil = Number(s.boostUntil) || 0;
                boostMultiplier = [2, 10].includes(Number(s.boostMultiplier)) ? Number(s.boostMultiplier) : 1;
                autoMinerRemainder = Math.max(0, Number(s.autoMinerRemainder) || 0);
                autoMinerLastAt = Number(s.autoMinerLastAt) || savedAtLoaded || Date.now();
            }
        } catch (e) {}

        let resetting = false;
        function saveState() {
            if (resetting) return;
            try {
                localStorage.setItem(SAVE_KEY, JSON.stringify({
                    ice: iceCount, dollars: dollarCount, slots: slotsOwned, farms: serializeFarms(),
                    autoMinerUntil, autoMinerImage, autoMinerPaused, autoMinerRemainder, autoMinerLastAt,
                    vipTier, vipUntil, vipPermanentTier, vipRentalTier, vipBonusClaimDate,
                    savedAt: Date.now()
                }));
            } catch (e) {}
        }
        setInterval(saveState, 2000);
        document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
        window.addEventListener('pagehide', saveState);

        const fmt = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        const round2 = n => Math.round(n * 100) / 100;
        const fmtMoney = n => {
            const v = round2(Math.abs(n));
            const sign = (n < 0 && v > 0) ? '-' : '';
            if (Number.isInteger(v)) return sign + fmt(v);
            return sign + fmt(Math.floor(v)) + ',' + String(Math.round(v * 100) % 100).padStart(2, '0');
        };
        const hooks = { res: null }; // обновление вкладки «Биржа» при смене ресурсов

        const gameContainer = document.getElementById('game-container');
        const particlesLayer = document.getElementById('particles-layer');
        const iceCountEl = document.getElementById('ice-count');
        const dollarCountEl = document.getElementById('dollar-count');
        const uiIceBox = document.getElementById('ui-ice-box');
        const uiDollarBox = document.getElementById('ui-dollar-box');
        const toastEl = document.getElementById('toast');

        function renderResources() {
            iceCountEl.innerText = fmt(iceCount);
            dollarCountEl.innerText = fmtMoney(dollarCount);
            if (hooks.res) hooks.res();
        }

        function addIce(n = 1) {
            iceCount += n;
            iceCountEl.innerText = fmt(iceCount);
            uiIceBox.classList.add('pop');
            setTimeout(() => uiIceBox.classList.remove('pop'), 100);
            if (hooks.res) hooks.res();
        }

        function advanceAutoMining(now) {
            const from = Math.min(autoMinerLastAt || now, now);
            const activeTo = Math.min(now, autoMinerUntil);
            let gained = 0;
            if (!autoMinerPaused && activeTo > from) {
                const amount = (activeTo - from) * AUTO_MINER_ICE_PER_SECOND * productionMultiplier() / 1000 + autoMinerRemainder;
                gained = Math.floor(amount);
                autoMinerRemainder = amount - gained;
                if (gained > 0) addIce(gained);
            }
            autoMinerLastAt = now;
            if (typeof syncMinerVisual === 'function') syncMinerVisual();
            if (typeof updateShopStatus === 'function') updateShopStatus();
            return gained;
        }

        function productionMultiplier() {
            if (vipTier < 3 || (vipUntil && vipUntil <= Date.now())) return 1;
            return [1, 1, 1, 2, 3, 5][vipTier] || 1;
        }

        function activeVipTier(now = Date.now()) {
            return Math.max(vipPermanentTier, vipRentalTier && vipUntil > now ? vipRentalTier : 0);
        }

        function activateVip(tier, durationMs = 0) {
            tier = Math.max(1, Math.min(5, Math.floor(Number(tier) || 0)));
            const now = Date.now();
            if (durationMs > 0) {
                vipRentalTier = Math.max(vipRentalTier && vipUntil > now ? vipRentalTier : 0, tier);
                vipUntil = Math.max(now, vipUntil) + durationMs;
                vipTier = Math.max(vipPermanentTier, vipRentalTier);
            } else {
                vipPermanentTier = Math.max(vipPermanentTier, tier);
                vipTier = Math.max(vipPermanentTier, vipRentalTier && vipUntil > now ? vipRentalTier : 0);
                if (vipUntil <= now) { vipRentalTier = 0; vipUntil = 0; }
            }
            saveState();
            if (typeof renderVipProfile === 'function') renderVipProfile();
            if (typeof renderHub === 'function') renderHub();
            if (typeof updateShopStatus === 'function') updateShopStatus();
            return true;
        }
        window.yetiActivateVip = activateVip;
        const availableBusinessSlots = () => Math.max(slotsOwned, 3 + activeVipTier());

        function spendDollars(n) {
            dollarCount = round2(dollarCount - n);
            if (window.yetiTrack) window.yetiTrack('moneySpent', n);
            renderResources();
            uiDollarBox.classList.add('pop');
            setTimeout(() => uiDollarBox.classList.remove('pop'), 120);
            updatePriceColors();
            saveState();
        }

        function denyFlash(el) {
            el.classList.remove('deny');
            void el.offsetWidth;
            el.classList.add('deny');
            setTimeout(() => el.classList.remove('deny'), 450);
        }

        let toastTimer = null;
        function toast(msg) {
            toastEl.innerText = msg;
            toastEl.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
        }

        renderResources();

        // Полёт льда (частицы) к счётчику льда
        function flyIce(startX, startY, onDone, spread) {
            const ice = document.createElement('div');
            ice.classList.add('ice-particle');

            const containerRect = gameContainer.getBoundingClientRect();
            const targetRect = uiIceBox.getBoundingClientRect();

            const endX = (targetRect.left - containerRect.left) + (targetRect.width / 2);
            const endY = (targetRect.top - containerRect.top) + (targetRect.height / 2);

            ice.style.left = startX + 'px';
            ice.style.top = startY + 'px';
            particlesLayer.appendChild(ice);

            const sp = spread || 100;
            const midX = startX + (Math.random() - 0.5) * sp;
            const midY = startY - (50 + Math.random() * sp);

            const animation = ice.animate([
                { transform: 'translate(-50%, -50%) scale(0.8) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${midX - startX}px), calc(-50% + ${midY - startY}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.4 },
                { transform: `translate(calc(-50% + ${endX - startX}px), calc(-50% + ${endY - startY}px)) scale(0.2) rotate(${Math.random() * 720}deg)`, opacity: 0.5 }
            ], {
                duration: 400,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                fill: 'forwards'
            });

            animation.onfinish = () => {
                ice.remove();
                if (onDone) onDone();
            };
        }
