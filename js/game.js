// ==========================================
        // 0. КАРТИНКИ: формат, ленивая загрузка
        // ==========================================
        // Скрипт optimize_assets.py сжимает картинки в WebP и сам меняет 'png' на 'webp' в этой строке.
        const ASSET_EXT = 'png';
        const A = n => 'assets/' + n + '.' + ASSET_EXT;

        // Нужны для первого экрана («Ледник») — именно их ждёт экран загрузки
        const CRITICAL_ASSETS = ['loading', 'fon', 'pol', 'miner', 'ice', 'profile'];
        // Остальные грузятся фоном уже после старта игры
        const BACKGROUND_ASSETS = ['pole', 'pushka', 'prorab', 'snow', 'lake', 'yeti_axe', 'yeti_saw', 'factory'];

        let gameStarted = false;
        const deferredImgs = [];

        // <img data-src="имя"> без расширения: критичные грузим сразу, остальные после старта
        function lazyImg(img) {
            const n = img.dataset && img.dataset.src;
            if (!n) return;
            if (gameStarted || CRITICAL_ASSETS.includes(n)) {
                img.decoding = 'async';
                img.src = A(n);
                img.removeAttribute('data-src');
            } else {
                deferredImgs.push(img);
            }
        }
        function lazyAll(root) { root.querySelectorAll('img[data-src]').forEach(lazyImg); }
        lazyAll(document);

        function startBackgroundLoad() {
            gameStarted = true;
            deferredImgs.splice(0).forEach((img, i) => setTimeout(() => lazyImg(img), i * 120));
            BACKGROUND_ASSETS.forEach((n, i) => setTimeout(() => {
                const im = new Image();
                im.decoding = 'async';
                im.src = A(n);
            }, 400 + i * 250));
        }

        // ==========================================
        // 1. ЛОГИКА ЗАГРУЗКИ (МИНИМУМ 2 СЕКУНДЫ)
        // ==========================================
        const assetsToLoad = CRITICAL_ASSETS.map(A);

        let loadedCount = 0;
        const totalAssets = assetsToLoad.length;
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        const loadingScreen = document.getElementById('loading-screen');

        const MIN_LOADING_TIME = 2000;
        const startTime = Date.now();
        let allAssetsReady = false;

        function checkLoadingStatus() {
            const elapsedTime = Date.now() - startTime;

            if (allAssetsReady && elapsedTime >= MIN_LOADING_TIME) {
                loadingBar.style.width = '100%';
                loadingText.innerText = '100%';

                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    lastFrameTime = 0;
                    requestAnimationFrame(gameLoop);
                    startBackgroundLoad();
                }, 300);
            } else {
                if (allAssetsReady) {
                    loadingBar.style.width = '99%';
                    loadingText.innerText = '99%';
                }
            }
        }

        function assetLoaded() {
            loadedCount++;
            const percent = Math.floor((loadedCount / totalAssets) * 100);

            if (!allAssetsReady) {
                loadingBar.style.width = percent + '%';
                loadingText.innerText = percent + '%';
            }

            if (loadedCount === totalAssets) {
                allAssetsReady = true;
            }
            checkLoadingStatus();
        }

        assetsToLoad.forEach(src => {
            const img = new Image();
            img.onload = assetLoaded;
            img.onerror = assetLoaded;
            img.src = src;
        });

        const loadingInterval = setInterval(() => {
            checkLoadingStatus();
            if (allAssetsReady && Date.now() - startTime >= MIN_LOADING_TIME) {
                clearInterval(loadingInterval);
            }
        }, 100);


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
        const SLOT_MAX = 5;                               // максимум слотов
        const SLOT_PRICES = { 4: 300000, 5: 7000000 };    // цена открытия 4-го и 5-го слота
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
                    autoMinerUntil, autoMinerImage, boostUntil, boostMultiplier, autoMinerRemainder, autoMinerLastAt,
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
            if (activeTo > from) {
                const activeMs = activeTo - from;
                const boostedMs = boostUntil > from ? Math.max(0, Math.min(activeTo, boostUntil) - from) : 0;
                const baseMs = activeMs - boostedMs;
                const amount = (baseMs + boostedMs * Math.max(1, boostMultiplier)) * AUTO_MINER_ICE_PER_SECOND / 1000 + autoMinerRemainder;
                gained = Math.floor(amount);
                autoMinerRemainder = amount - gained;
                if (gained > 0) addIce(gained);
            }
            autoMinerLastAt = now;
            if (typeof syncMinerVisual === 'function') syncMinerVisual();
            if (typeof updateShopStatus === 'function') updateShopStatus();
            return gained;
        }

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


        // ==========================================
        // 3. ВКЛАДКИ
        // ==========================================
        const screens = {
            bourse: document.getElementById('screen-bourse'),
            glacier: document.getElementById('screen-glacier'),
            mining: document.getElementById('screen-mining'),
            shop: document.getElementById('screen-shop'),
            den: document.getElementById('screen-den')
        };
        let currentTab = 'glacier';

        function setTab(name) {
            if (!screens[name]) { toast('Скоро'); return; }
            if (name === currentTab) return;
            if (currentTab === 'glacier') stopMining();
            if (currentTab === 'mining') showMineView('hub'); // при возврате в «Добыча» — стартовый экран
            if (currentTab === 'shop') showShopCategories();

            currentTab = name;
            if (name === 'bourse' && window.yetiTrack) window.yetiTrack('visitMarket');
            Object.keys(screens).forEach(k => screens[k].classList.toggle('hidden', k !== name));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));

            refreshMine();
            if (name === 'bourse') renderBourse();
            if (name === 'shop') showShopCategories();
        }

        document.querySelectorAll('.nav-btn').forEach(b => {
            b.addEventListener('click', () => {
                // повторное нажатие на «Добыча» возвращает к списку ферм
                if (b.dataset.tab === 'mining' && currentTab === 'mining' && mineView !== 'hub') showMineView('hub');
                else setTab(b.dataset.tab);
            });
        });

        const isMiningVisible = () => currentTab === 'mining';


        // ==========================================
        // 4. ЭКРАН «ЛЕДНИК» (ручная добыча)
        // ==========================================
        const miner = document.getElementById('miner');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const starsContainer = document.getElementById('stars-container');

        let isMining = false;
        let isOverheated = false;
        function syncMinerVisual() {
            const autoActive = autoMinerUntil > Date.now();
            const active = isMining || autoActive;
            const asset = autoActive ? autoMinerImage : 'miner';
            const src = A(asset);
            if (miner.getAttribute('src') !== src) miner.src = src;
            miner.classList.toggle('shake', active);
        }

        let progress = 0;
        let lastFrameTime = 0;
        let accumulatedProgress = 0;

        function getSpawnRate(progressPercent) {
            let rate;
            if (progressPercent < 20) rate = 2;
            else if (progressPercent < 40) rate = 4;
            else if (progressPercent < 60) rate = 6;
            else if (progressPercent < 80) rate = 12;
            else rate = 24;
            return rate * (boostUntil > Date.now() ? boostMultiplier : 1);
        }

        function spawnIce() {
            const minerRect = miner.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();
            const startX = (minerRect.left - containerRect.left) + (minerRect.width / 2);
            const startY = (minerRect.top - containerRect.top) + minerRect.height * 0.85;
            flyIce(startX, startY, () => {
                if (window.yetiTrack) window.yetiTrack('manualIce', 1);
                addIce(1);
            }, 100);
        }

        function gameLoop(timestamp) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const deltaTime = timestamp - lastFrameTime;
            lastFrameTime = timestamp;

            if (isMining && !isOverheated) {
                progress += deltaTime * 0.02;
                if (progress > 100) progress = 100;
                progressBar.style.width = progress + '%';

                const currentRate = getSpawnRate(progress);
                const ratePerMs = currentRate / 1000;

                accumulatedProgress += deltaTime * ratePerMs;

                while (accumulatedProgress >= 1) {
                    spawnIce();
                    accumulatedProgress -= 1;
                }

                if (progress >= 100) {
                    triggerOverheat();
                }

            } else if (!isMining && !isOverheated) {
                if (progress > 0) {
                    progress -= deltaTime * 0.05;
                    if (progress < 0) progress = 0;
                    progressBar.style.width = progress + '%';
                    if (progress === 0) progressContainer.style.opacity = 0;
                }
            }

            requestAnimationFrame(gameLoop);
        }

        function startMining(e) {
            if (e.cancelable) e.preventDefault();
            if (currentTab !== 'glacier') return;
            if (isOverheated || isMining) return;

            isMining = true;
            syncMinerVisual();
            progressContainer.style.opacity = 1;
            lastFrameTime = 0;
        }

        function stopMining(e) {
            if (e && e.cancelable) e.preventDefault();
            if (isOverheated || !isMining) return;

            isMining = false;
            syncMinerVisual();
        }

        function triggerOverheat() {
            isOverheated = true;
            isMining = false;

            syncMinerVisual();
            starsContainer.style.display = 'flex';

            let cooldownTimer = setInterval(() => {
                progress -= 2;
                if (progress <= 0) {
                    progress = 0;
                    clearInterval(cooldownTimer);
                    isOverheated = false;
                    starsContainer.style.display = 'none';
                    progressContainer.style.opacity = 0;
                    progressBar.style.width = '0%';
                }
                progressBar.style.width = progress + '%';
            }, 50);
        }

        // Ручная добыча — только на экране «Ледник»
        const glacierScreen = screens.glacier;
        glacierScreen.addEventListener('touchstart', startMining, { passive: false });
        glacierScreen.addEventListener('touchend', stopMining);
        glacierScreen.addEventListener('touchcancel', stopMining);

        glacierScreen.addEventListener('mousedown', startMining);
        glacierScreen.addEventListener('mouseup', stopMining);
        glacierScreen.addEventListener('mouseleave', stopMining);


        // ==========================================
        // 4.5 ЭКРАН «БИРЖА»: курс льда 0.1–0.3 $, график за 3 часа
        // ==========================================
        // Курс — детерминированная функция от времени: одинаков на всех устройствах,
        // история графика всегда восстанавливается, в том числе после оффлайна.
        function hash01(n) {
            let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
            x ^= x >>> 13;
            x = Math.imul(x, 0xc2b2ae35);
            x ^= x >>> 16;
            return (x >>> 0) / 4294967296;
        }
        function smooth01(t) { return t * t * (3 - 2 * t); }
        function noise1(ms, period, seed) {
            const k = ms / period;
            const i = Math.floor(k);
            const f = k - i;
            const a = hash01((i * 7919 + seed) | 0);
            const b = hash01(((i + 1) * 7919 + seed) | 0);
            return a + (b - a) * smooth01(f);
        }
        // Курс меняется раз в минуту: значение берётся на начало минуты, цена в сотых
        function priceAt(ms) {
            const m = Math.floor(ms / 60000) * 60000;
            const v = 0.50 * noise1(m, 45 * 60000, 11) + 0.28 * noise1(m, 12 * 60000, 23)
                    + 0.14 * noise1(m, 3 * 60000, 37) + 0.08 * noise1(m, 60000, 53);
            const x = Math.max(0, Math.min(1, (v - 0.5) * 1.7 + 0.5));
            return Math.round((PRICE_MIN + (PRICE_MAX - PRICE_MIN) * x) * 100) / 100;
        }
        const fmtPrice = pr => '$' + pr.toFixed(2).replace('.', ',');
        const fmtClock = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const bSlider = document.getElementById('b-slider');
        const bAmount = document.getElementById('b-amount');
        const bGet = document.getElementById('b-get');
        const bHave = document.getElementById('b-have');
        const bSell = document.getElementById('b-sell');
        const bPrice = document.getElementById('b-price');
        const bChange = document.getElementById('b-change');
        const bChart = document.getElementById('b-chart');
        const bctx = bChart.getContext('2d');
        let tradeAmount = 0;   // сколько льда продаём/покупаем
        let bMode = 'sell';    // 'sell' | 'buy'
        let bHover = null; // x касания/курсора на графике (css px)

        const AXIS_MIN = 0.08, AXIS_MAX = 0.32;

        function drawChart() {
            const box = bChart.parentElement;
            const w = box.clientWidth, h = box.clientHeight;
            if (!w || !h) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
            if (bChart.width !== cw || bChart.height !== ch) { bChart.width = cw; bChart.height = ch; }

            const ctx = bctx;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            const fs = Math.max(9, Math.min(12, h * 0.065));
            ctx.font = '800 ' + fs + 'px Nunito, sans-serif';
            const padL = ctx.measureText('0,30').width + 14;
            const padR = 12, padT = 12, padB = fs + 12;
            const pw = w - padL - padR, ph = h - padT - padB;
            if (pw < 20 || ph < 20) return;

            const now = Date.now();
            const t0 = now - BOURSE_WINDOW;
            const xOf = t => padL + (t - t0) / BOURSE_WINDOW * pw;
            const yOf = pr => padT + (1 - (pr - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * ph;

            // горизонтальная сетка и подписи цены
            ctx.lineWidth = 1;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            [0.10, 0.15, 0.20, 0.25, 0.30].forEach(v => {
                const y = Math.round(yOf(v)) + 0.5;
                ctx.strokeStyle = 'rgba(147,197,253,0.18)';
                ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y); ctx.stroke();
                ctx.fillStyle = 'rgba(191,219,254,0.85)';
                ctx.fillText(v.toFixed(2).replace('.', ','), padL - 6, y);
            });

            // вертикальная сетка по часам и подписи времени
            ctx.textBaseline = 'alphabetic';
            for (let k = 0; k <= 3; k++) {
                const x = Math.round(xOf(t0 + k * 3600000)) + 0.5;
                ctx.strokeStyle = 'rgba(147,197,253,0.12)';
                ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph); ctx.stroke();
                ctx.fillStyle = 'rgba(191,219,254,0.85)';
                ctx.textAlign = k === 0 ? 'left' : (k === 3 ? 'right' : 'center');
                const lx = k === 0 ? padL : (k === 3 ? padL + pw : x);
                ctx.fillText(k === 3 ? 'сейчас' : '-' + (3 - k) + ' ч', lx, h - 5);
            }

            // линия курса
            // курс держится минуту и меняется скачком — рисуем ступенями
            const STEP = 60000;
            const pts = [];
            const first = Math.floor(t0 / STEP) * STEP;
            let prevY = yOf(priceAt(first));
            pts.push([xOf(t0), prevY]);
            for (let t = first + STEP; t <= now; t += STEP) {
                const x = xOf(t), y = yOf(priceAt(t));
                pts.push([x, prevY]);
                pts.push([x, y]);
                prevY = y;
            }
            pts.push([xOf(now), prevY]);

            const grad = ctx.createLinearGradient(0, padT, 0, padT + ph);
            grad.addColorStop(0, 'rgba(96,165,250,0.45)');
            grad.addColorStop(1, 'rgba(96,165,250,0)');
            ctx.beginPath();
            ctx.moveTo(pts[0][0], padT + ph);
            pts.forEach(q => ctx.lineTo(q[0], q[1]));
            ctx.lineTo(pts[pts.length - 1][0], padT + ph);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#bfdbfe';
            ctx.shadowColor = 'rgba(96,165,250,0.9)';
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // текущая цена: пунктир и точка
            const last = pts[pts.length - 1];
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padL, last[1]); ctx.lineTo(last[0], last[1]); ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(last[0], last[1], 5.5, 0, 6.2832);
            ctx.fillStyle = 'rgba(96,165,250,0.5)'; ctx.fill();
            ctx.beginPath(); ctx.arc(last[0], last[1], 3.5, 0, 6.2832);
            ctx.fillStyle = '#fff'; ctx.fill();

            // подсказка при касании графика
            if (bHover !== null) {
                const hx = Math.max(padL, Math.min(padL + pw, bHover));
                const ht = t0 + (hx - padL) / pw * BOURSE_WINDOW;
                const hp = priceAt(ht);
                const hy = yOf(hp);
                ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + ph); ctx.stroke();
                ctx.beginPath(); ctx.arc(hx, hy, 4, 0, 6.2832);
                ctx.fillStyle = '#fbbf24'; ctx.fill();

                const label = fmtClock(ht) + ' · ' + fmtPrice(hp);
                ctx.font = '900 ' + fs + 'px Nunito, sans-serif';
                const tw = ctx.measureText(label).width + 14;
                const th = fs + 10;
                let bx = hx - tw / 2;
                bx = Math.max(4, Math.min(w - tw - 4, bx));
                const by = hy < padT + ph / 2 ? hy + 12 : hy - th - 12;
                ctx.fillStyle = 'rgba(15,23,42,0.9)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx, by, tw, th, 6); else ctx.rect(bx, by, tw, th);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, bx + tw / 2, by + th / 2 + 0.5);
            }
        }

        const maxAmount = pr => bMode === 'sell' ? Math.floor(iceCount) : Math.max(0, Math.floor(dollarCount / pr + 1e-9));

        function updateTradeInfo(price) {
            const sell = bMode === 'sell';
            const max = maxAmount(price);
            if (tradeAmount > max) tradeAmount = max;
            bSlider.max = max;
            if (parseInt(bSlider.value, 10) !== tradeAmount) bSlider.value = tradeAmount;
            bSlider.disabled = max <= 0;

            document.getElementById('b-have-lbl').innerText = sell ? 'Лёд:' : 'Баланс:';
            document.getElementById('b-amt-lbl').innerText = sell ? 'Продать:' : 'Купить:';
            document.getElementById('b-get-lbl').innerText = sell ? 'Получите' : 'Заплатите';
            bHave.innerText = sell ? fmt(iceCount) : '$' + fmtMoney(dollarCount);
            bAmount.innerText = fmt(tradeAmount);
            bGet.innerText = '$' + fmtMoney(tradeAmount * price);
            bSell.innerText = sell ? 'Продать' : 'Купить';
            bSell.classList.toggle('buy', !sell);
            bSell.disabled = tradeAmount <= 0;
            document.getElementById('b-mode-sell').classList.toggle('active', sell);
            document.getElementById('b-mode-buy').classList.toggle('active', !sell);
        }

        function liveBourse() {
            const now = Date.now();
            const price = priceAt(now);
            const prev = priceAt(now - BOURSE_WINDOW);
            const pct = (price / prev - 1) * 100;
            bPrice.innerText = fmtPrice(price);
            bChange.innerText = (pct >= 0 ? '▲ +' : '▼ ') + pct.toFixed(1).replace('.', ',') + '% / 3ч';
            bChange.classList.toggle('up', pct >= 0);
            bChange.classList.toggle('down', pct < 0);
            updateTradeInfo(price);
            drawChart();
        }

        function renderBourse() { liveBourse(); }

        bSlider.addEventListener('input', () => {
            tradeAmount = parseInt(bSlider.value, 10) || 0;
            updateTradeInfo(priceAt(Date.now()));
        });

        document.querySelectorAll('.bourse-quick button').forEach(btn => {
            btn.addEventListener('click', () => {
                tradeAmount = Math.floor(maxAmount(priceAt(Date.now())) * parseFloat(btn.dataset.p));
                updateTradeInfo(priceAt(Date.now()));
            });
        });

        ['sell', 'buy'].forEach(mode => {
            document.getElementById('b-mode-' + mode).addEventListener('click', () => {
                bMode = mode;
                tradeAmount = 0;
                renderBourse();
            });
        });

        bSell.addEventListener('click', () => {
            const price = priceAt(Date.now());
            const amount = Math.min(tradeAmount, maxAmount(price));
            if (amount <= 0) return;
            const total = round2(amount * price);
            if (bMode === 'sell') {
                iceCount -= amount;
                dollarCount = round2(dollarCount + total);
                if (window.yetiTrack) window.yetiTrack('marketSell', { amount: amount, revenue: total });
                toast('+$' + fmtMoney(total));
            } else {
                if (total > dollarCount) return;
                iceCount += amount;
                dollarCount = round2(dollarCount - total);
                if (window.yetiTrack) window.yetiTrack('marketBuy', { amount: amount, cost: total });
                toast('+' + fmt(amount) + ' льда · −$' + fmtMoney(total));
                uiIceBox.classList.add('pop');
                setTimeout(() => uiIceBox.classList.remove('pop'), 150);
            }
            tradeAmount = 0;
            renderResources();
            updatePriceColors();
            uiDollarBox.classList.add('pop');
            setTimeout(() => uiDollarBox.classList.remove('pop'), 150);
            saveState();
        });

        // Касание графика показывает цену в выбранный момент
        function setHover(e) {
            const rect = bChart.getBoundingClientRect();
            bHover = e.clientX - rect.left;
            drawChart();
        }
        bChart.addEventListener('pointerdown', setHover);
        bChart.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') setHover(e); });
        const clearHover = () => { bHover = null; drawChart(); };
        bChart.addEventListener('pointerup', clearHover);
        bChart.addEventListener('pointercancel', clearHover);
        bChart.addEventListener('pointerleave', clearHover);

        hooks.res = () => { if (currentTab === 'bourse') renderBourse(); };
        setInterval(() => { if (currentTab === 'bourse' && !document.hidden) liveBourse(); }, 1000);
        window.addEventListener('resize', () => { if (currentTab === 'bourse') drawChart(); });

        // ==========================================
        // 4.6 ПРОФИЛЬ: кнопка «Сбросить прогресс»
        // ==========================================
        const profileBox = document.querySelector('.profile-box');
        const profileMenu = document.getElementById('profile-menu');
        const resetBtn = document.getElementById('reset-btn');
        let resetArmed = false, armTimer = null;

        function disarmReset() {
            resetArmed = false;
            clearTimeout(armTimer);
            resetBtn.classList.remove('armed');
            resetBtn.innerText = 'Сбросить прогресс';
        }

        profileBox.addEventListener('click', () => {
            profileMenu.classList.toggle('show');
            disarmReset();
        });

        document.addEventListener('pointerdown', (e) => {
            if (profileMenu.contains(e.target) || profileBox.contains(e.target)) return;
            profileMenu.classList.remove('show');
            disarmReset();
        });

        // ВРЕМЕННО, для тестов: начислить себе любую сумму
        const moneyInput = document.getElementById('money-input');
        const moneyBtn = document.getElementById('money-btn');
        function addMoney() {
            const amount = parseFloat(String(moneyInput.value).replace(/\s/g, '').replace(',', '.'));
            if (!isFinite(amount) || amount <= 0) { toast('Введите сумму'); return; }
            dollarCount = round2(dollarCount + Math.min(amount, 1e12));
            renderResources();
            updatePriceColors();
            saveState();
            toast('+$' + fmtMoney(Math.min(amount, 1e12)));
            moneyInput.value = '';
        }
        moneyBtn.addEventListener('click', addMoney);
        moneyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMoney(); });

        resetBtn.addEventListener('click', () => {
            if (!resetArmed) {
                resetArmed = true;
                resetBtn.classList.add('armed');
                resetBtn.innerText = 'Нажмите ещё раз';
                armTimer = setTimeout(disarmReset, 3000);
                return;
            }
            resetting = true; // не даём автосохранению перезаписать сброс
            try {
                localStorage.setItem(SAVE_KEY, JSON.stringify({
                    ice: 0, dollars: RESET_DOLLARS, slots: SLOT_BASE, farms: []
                }));
                localStorage.removeItem('iceMiner_berloga_v1');
            } catch (e) {}
            location.reload();
        });


        // ==========================================
        // 5. ВКЛАДКА «ДОБЫЧА»: хаб ферм, выбор вида, экран фермы
        // ==========================================
        // Каждая ферма — это набор данных (пушки, прораб, кучи, таймеры). Считаются все фермы сразу,
        // а на экране рисуется только та, что открыта.
        const $ = id => document.getElementById(id);
        const mapArea = $('map-area');
        const map = $('map');
        const mapImg = $('map-img');
        const pilesLayer = $('piles-layer');

        let mapRatio = 1088 / 1428; // ширина / высота картинки (уточняется после загрузки)
        let mapW = 1, mapH = 1, U = 1;

        // Сетка внутри карты (в % от размеров карты)
        const COLS = 6, ROWS = 9;
        const GRID = { l: 18.0, r: 83.2, t: 20.0, b: 83.5 };
        // клетки в правом нижнем углу заняты площадкой прораба
        const isBlockedCell = (c, r) => c >= 4 && r >= 7;
        const MAX_PILES = COLS * ROWS - 4;

        function cellCenter(c, r) {
            return {
                x: GRID.l + (c + 0.5) * (GRID.r - GRID.l) / COLS,
                y: GRID.t + (r + 0.5) * (GRID.b - GRID.t) / ROWS
            };
        }

        // Карта озера «Ледореза»
        const cutterArea = $('cutter-area');
        const cutterMap = $('cutter-map');
        const cutterImg = $('cutter-img');
        const cubesLayer = $('cubes-layer');
        const stacksLayer = $('stacks-layer');
        let cRatio = 1088 / 1450;
        let cW = 1, cH = 1, cU = 1;

        // Адаптивная подгонка карт: всегда целиком в области, с сохранением пропорций
        function fitArea(area, el, ratio) {
            const w = area.clientWidth;
            const h = area.clientHeight;
            if (!w || !h) return null;
            let mw = w, mh = w / ratio;
            if (mh > h) { mh = h; mw = h * ratio; }
            el.style.width = mw + 'px';
            el.style.height = mh + 'px';
            return { w: mw, h: mh };
        }

        const factoryArea = $('factory-area');
        const factoryMap = $('factory-map');
        const facImg = $('factory-img');
        let fRatio = 1088 / 1450;
        let fW = 1, fH = 1, fU = 1;

        function fitMap() {
            const fa = fitArea(factoryArea, factoryMap, fRatio);
            if (fa) {
                fW = fa.w; fH = fa.h; fU = fa.w / 100;
                factoryMap.style.setProperty('--u', fU + 'px');
            }
            const a = fitArea(mapArea, map, mapRatio);
            if (a) {
                mapW = a.w; mapH = a.h; U = a.w / 100;
                map.style.setProperty('--u', U + 'px');
                sizeFx();
            }
            const b = fitArea(cutterArea, cutterMap, cRatio);
            if (b) {
                cW = b.w; cH = b.h; cU = b.w / 100;
                cutterMap.style.setProperty('--u', cU + 'px');
            }
        }

        mapImg.addEventListener('load', () => {
            if (mapImg.naturalWidth && mapImg.naturalHeight) {
                mapRatio = mapImg.naturalWidth / mapImg.naturalHeight;
            }
            fitMap();
        });
        facImg.addEventListener('load', () => {
            if (facImg.naturalWidth && facImg.naturalHeight) fRatio = facImg.naturalWidth / facImg.naturalHeight;
            fitMap();
        });
        cutterImg.addEventListener('load', () => {
            if (cutterImg.naturalWidth && cutterImg.naturalHeight) {
                cRatio = cutterImg.naturalWidth / cutterImg.naturalHeight;
            }
            fitMap();
        });
        window.addEventListener('resize', fitMap);
        window.addEventListener('orientationchange', () => setTimeout(fitMap, 200));

        // ---------- Виды ферм ----------
        const FARM_TYPES = [
            { id: 'snow', name: 'Снежная ферма', price: 10000,
              desc: 'Пушки насыпают кучи снега. Убирайте их вручную или наймите прораба — он делает это сам.' },
            { id: 'cutter', name: 'Ледорез', price: 100000,
              desc: 'Йети рубят лёд на озере. Начните с топора, купите бензопилы, наймите ещё йети и прораба.' },
            { id: 'factory', name: 'Ледозавод', price: 1000000,
              desc: 'Автоматический завод: ледогенераторы, вода, ремонт и ремонтники. Лёд едет по конвейерам в чёрную яму.' }
        ];

        // Параметры «Ледозавода» (цены и скорости можно менять здесь)
        const FAC_GEN_PRICE = 500000;                // открытие одного генератора
        const FAC_WATER_PER_MS = 100 / 3600000;      // 100 л воды в час на генератор
        const FAC_RES_MS = 100 * 3600000;            // ресурс до ремонта: 100 часов
        const FAC_REPAIR_MS = 2 * 60000;             // ремонт занимает 2 минуты
        const FAC_REPAIR_PER_HOUR = 500;             // самостоятельный ремонт: $500 за каждый отработанный час
        const FAC_CUBE_MS = 6000;                    // генератор делает кубик каждые 6 сек
        const FAC_CUBE_VALUE = 16;                   // лёд за кубик (160 льда/мин = 9 600 льда/ч на генератор)
        const FAC_TRAVEL_MS = 4000;                  // кубик едет по конвейеру
        const FAC_TANK = [40000, 60000, 80000, 100000];   // вместимость по уровням, л
        const FAC_TANK_UP = [0, 200000, 350000, 500000];  // цена улучшения до уровня
        const FAC_WATER_PRICE = 1;                   // $ за литр
        const FAC_HIRE = 500;                        // найм ремонтника
        const FAC_SALARY = [800, 1500, 2100, 2600, 3000, 3300, 3500, 3600];  // зарплата в час по навыку (десятки 1–10 … 71–80)
        const FAC_PROB = [30, 25, 18, 12, 7, 5, 2, 1];                       // вероятность навыка по десяткам, %

        // Параметры «Ледореза» (цены и скорости можно менять здесь)
        const AXE_CUBE = [20, 30, 50];               // лёд за кубик у йети 1/2/3 с топором
        const SAW_CUBE = [100, 150, 195];            // лёд за кубик у йети 1/2/3 с бензопилой
        const SAW_INTERVAL = 60000;                  // бензопила: один кубик в минуту
        const AXE_COOLDOWN = 1000 / 15;              // топор: не чаще 15 ударов в секунду
        const FOREMAN_MS = 400;                      // прораб собирает один кубик за 0.4 сек
        const HIRE_PRICES = [30000, 90000, 180000];  // йети 1/2/3 с топором
        const SAW_PRICES = [70000, 180000, 500000];  // бензопила для йети 1/2/3
        const C_FOREMAN_PRICE = 194000;              // прораб
        const LIMIT_BASE = 30;                       // лимит несобранных кубиков
        const LIMIT_STEP = 10;                       // +кубиков за улучшение
        const LIMIT_PRICES = [4000, 10000, 25000, 60000, 150000];
        const FIELD_MAX = 10;                        // кубиков на озере одновременно (остальные — штабелями)
        const farmType = id => FARM_TYPES.find(t => t.id === id) || FARM_TYPES[0];
        const FOREMAN_MAX_PER_HOUR = (3600000 / HOLD_TIME) * ICE_PER_PILE;

        let farmIdSeq = 0;
        function newFarm(type, saved) {
            if (type === 'cutter') return newCutter(saved);
            if (type === 'factory') return newFactory(saved);
            const sv = saved || {};
            const now = Date.now();
            return {
                id: ++farmIdSeq, type: type || 'snow',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                foreman: !!sv.foreman,
                piles: [], fTask: null, fLast: 0,
                savedPiles: sv.piles || 0,
                cannons: [0, 1, 2, 3].map(i => ({
                    index: i, owned: !!(sv.cannons && sv.cannons[i]),
                    nextAt: now + CANNON_INTERVAL, blocked: false, mistAcc: 0
                }))
            };
        }

        function newFactory(saved) {
            const sv = saved || {};
            const now = Date.now();
            return {
                id: ++farmIdSeq, type: 'factory',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                piles: [], foreman: false,     // нужно общему коду
                water: sv.water || 0,
                tank: Math.min(sv.tank || 0, FAC_TANK.length - 1),
                workers: Array.isArray(sv.workers) ? sv.workers.map(Number) : [],
                salaryAt: sv.salaryAt || now + 3600000,
                lastT: sv.lastT || now,
                gens: [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                    const g = (sv.gens && sv.gens[i]) || {};
                    return { index: i, owned: !!g.owned, res: g.res != null ? g.res : FAC_RES_MS, repairEnd: g.repairEnd || 0, acc: g.acc || 0 };
                })
            };
        }

        function newCutter(saved) {
            const sv = saved || {};
            const now = Date.now();
            const vals = Array.isArray(sv.cubeVals) ? sv.cubeVals.slice(0, 200).map(Number)
                       : new Array(sv.cubes || 0).fill(AXE_CUBE[0]);
            return {
                id: ++farmIdSeq, type: 'cutter',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                foreman: !!sv.foreman,
                cubeVals: vals,                       // стоимость каждого несобранного кубика
                get cubes() { return this.cubeVals.length; },
                limitLevel: Math.min(sv.limitLevel || 0, LIMIT_PRICES.length),
                fNext: now + FOREMAN_MS,
                piles: [],   // нужно общему коду, у Ледореза пусто
                workers: [0, 1, 2].map(i => ({
                    index: i,
                    owned: Array.isArray(sv.workers) ? !!sv.workers[i] : false,
                    saw: Array.isArray(sv.saws) ? !!sv.saws[i] : false,
                    nextAt: now + SAW_INTERVAL, blocked: false, hitAt: 0
                }))
            };
        }

        const farms = loadedFarms.slice(0, SLOT_MAX).map(sf => newFarm(sf.type, sf));
        slotsOwned = Math.max(slotsOwned, farms.length);

        function serializeFarms() {
            try {
                return farms.map(f => Object.assign({ openedAt: f.openedAt, totalIce: f.totalIce }, f.type === 'factory' ? ({
                    type: 'factory', water: f.water, tank: f.tank, workers: f.workers,
                    salaryAt: f.salaryAt, lastT: f.lastT,
                    gens: f.gens.map(g => ({ owned: g.owned, res: g.res, repairEnd: g.repairEnd, acc: g.acc }))
                }) : f.type === 'cutter' ? ({
                    type: 'cutter', workers: f.workers.map(w => w.owned), saws: f.workers.map(w => w.saw),
                    foreman: f.foreman, cubeVals: f.cubeVals, limitLevel: f.limitLevel
                }) : ({
                    type: f.type, cannons: f.cannons.map(c => c.owned),
                    foreman: f.foreman, piles: f.piles.length
                })));
            } catch (e) { return loadedFarms; }
        }

        let mineView = 'hub';          // 'hub' | 'build' | 'farm'
        let viewFarm = null;           // открытая ферма
        let farmDomAttached = false;   // карта фермы сейчас на экране
        const farmVisible = f => farmDomAttached && f === viewFarm;
        const farmIndex = f => farms.indexOf(f) + 1;
        const ownedCannons = f => f.cannons.filter(c => c.owned).length;

        // Лёд/час: только пассивный способ (с прорабом), его ограничивают пушки и скорость прораба
        function farmRate(f) {
            if (f.type === 'factory') {
                // сколько генераторов работает сейчас (есть вода, ресурс, не в ремонте)
                const run = f.water > 0 ? f.gens.filter(g => g.owned && !g.repairEnd && g.res > 0).length : 0;
                return run * (3600000 / FAC_CUBE_MS) * FAC_CUBE_VALUE;
            }
            if (f.type === 'cutter') {
                if (!f.foreman) return 0;
                // пассивный доход: кубики пил (по минуте на йети) × стоимость кубика
                return f.workers.reduce((sum, w, i) => sum + (w.owned && w.saw ? SAW_CUBE[i] * (3600000 / SAW_INTERVAL) : 0), 0);
            }
            if (!f.foreman) return 0;
            const supply = ownedCannons(f) * PILES_PER_MIN_PER_CANNON * 60 * ICE_PER_PILE;
            return Math.min(supply, FOREMAN_MAX_PER_HOUR);
        }
        const totalRate = () => farms.reduce((sum, f) => sum + farmRate(f), 0);

        // ---------- Магазин ----------
        const AUTO_MINER_ICE_PER_SECOND = 2;
        const SHOP_CATALOG = {
            autominer: {
                title: 'Автомайнер',
                products: [
                    { id: 'auto-1h', kind: 'auto', image: 'miner1h', title: 'Автомайнер · 1 час', duration: 1 * 3600000, price: 2500, desc: 'Йети добывает по 2 льда в секунду. Работает, даже если игра закрыта.' },
                    { id: 'auto-6h', kind: 'auto', image: 'miner6h', title: 'Автомайнер · 6 часов', duration: 6 * 3600000, price: 9000, desc: 'Автоматическая добыча льда в течение шести часов.' },
                    { id: 'auto-24h', kind: 'auto', image: 'miner24h', title: 'Автомайнер · 24 часа', duration: 24 * 3600000, price: 24000, desc: 'Автоматическая добыча льда в течение суток.' }
                ]
            },
            time: {
                title: 'Ускорение времени',
                products: [
                    { id: 'time-6h', kind: 'time', image: '6h', title: 'Ускорить на 6 часов', duration: 6 * 3600000, price: 7500, desc: 'Мгновенно рассчитать производство, расходы, воду, ремонт и остановки предприятий за 6 часов.' },
                    { id: 'time-12h', kind: 'time', image: '12h', title: 'Ускорить на 12 часов', duration: 12 * 3600000, price: 15000, desc: 'Мгновенно рассчитать производство, расходы, воду, ремонт и остановки предприятий за 12 часов.' },
                    { id: 'time-24h', kind: 'time', image: '24h', title: 'Ускорить на 24 часа', duration: 24 * 3600000, price: 28000, desc: 'Мгновенно рассчитать производство, расходы, воду, ремонт и остановки предприятий за сутки.' }
                ]
            },
            boost: {
                title: 'Ускорение добычи',
                products: [
                    { id: 'boost-x2', kind: 'boost', image: 'X2', title: 'Ускоритель ×2', multiplier: 2, duration: 15 * 60000, durationLabel: '15 минут', price: 3000, desc: 'Удваивает скорость ручной и автоматической добычи льда.' },
                    { id: 'boost-x10', kind: 'boost', image: 'X10', title: 'Ускоритель ×10', multiplier: 10, duration: 5 * 60000, durationLabel: '5 минут', price: 8000, desc: 'Увеличивает скорость ручной и автоматической добычи в десять раз.' }
                ]
            }
        };
        const shopCategoryView = document.getElementById('shop-category-view');
        const shopProductView = document.getElementById('shop-product-view');
        const shopCarousel = document.getElementById('shop-carousel');
        let shopCategoryId = null;
        let shopProductIndex = 0;
        let shopSwipeStart = null;
        let shopAnimating = false;
        let shopAnimationTimer = null;

        function shopCountdown(ms) {
            const seconds = Math.max(0, Math.ceil(ms / 1000));
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hours) return hours + ' ч ' + String(minutes).padStart(2, '0') + ' мин';
            if (minutes) return minutes + ' мин ' + String(secs).padStart(2, '0') + ' сек';
            return secs + ' сек';
        }

        function shopEffectsText() {
            const now = Date.now();
            const effects = [];
            if (autoMinerUntil > now) effects.push('Автомайнер: ' + shopCountdown(autoMinerUntil - now));
            else effects.push('Автомайнер выключен');
            if (boostUntil > now) effects.push('Ускорение ×' + boostMultiplier + ': ' + shopCountdown(boostUntil - now));
            return effects.join(' · ');
        }

        function updateShopStatus() {
            const value = shopEffectsText();
            ['shop-effects', 'shop-effects-products'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
        }

        function currentShopProduct() {
            const category = SHOP_CATALOG[shopCategoryId];
            return category && category.products[shopProductIndex];
        }

        function shopProductStatus(product) {
            const now = Date.now();
            if (product.kind === 'auto') {
                return autoMinerUntil > now ? 'Уже активен ещё ' + shopCountdown(autoMinerUntil - now) : 'Скорость: 2 льда в секунду';
            }
            if (product.kind === 'boost') {
                return boostUntil > now ? 'Сейчас действует ×' + boostMultiplier + ' · ' + shopCountdown(boostUntil - now) : product.durationLabel + ' действия';
            }
            return 'Расчёт учитывает состояние каждого предприятия';
        }

        function renderShopCarousel() {
            const category = SHOP_CATALOG[shopCategoryId];
            if (!category) return;
            const products = category.products;
            shopProductIndex = (shopProductIndex + products.length) % products.length;
            document.getElementById('shop-category-title').textContent = category.title;
            shopCarousel.innerHTML = '';

            [-1, 0, 1].forEach(offset => {
                const index = (shopProductIndex + offset + products.length) % products.length;
                const product = products[index];
                const card = document.createElement('article');
                card.className = 'shop-product-card ' + (offset === 0 ? 'center' : offset < 0 ? 'prev' : 'next');
                card.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
                card.innerHTML =
                    '<img class="shop-product-art" src="' + A(product.image) + '" alt="" draggable="false">' +
                    '<div class="shop-product-title">' + product.title + '</div>' +
                    '<div class="shop-product-desc">' + product.desc + '</div>' +
                    '<div class="shop-product-status">' + (offset === 0 ? shopProductStatus(product) : '') + '</div>' +
                    '<div class="shop-product-price">$' + fmt(product.price) + '</div>' +
                    (offset === 0 ? '<button class="shop-buy" type="button">Купить</button>' : '');
                const buyButton = card.querySelector('.shop-buy');
                if (buyButton) buyButton.addEventListener('click', () => buyShopProduct(product));
                shopCarousel.appendChild(card);
            });

            const dots = document.getElementById('shop-dots');
            dots.innerHTML = products.map((_, i) => '<span class="shop-dot' + (i === shopProductIndex ? ' active' : '') + '"></span>').join('');
            updateShopStatus();
        }

        function cancelShopAnimation() {
            if (shopAnimationTimer) clearTimeout(shopAnimationTimer);
            shopAnimationTimer = null;
            shopAnimating = false;
            shopCarousel.classList.remove('slide-next', 'slide-prev');
        }

        function openShopCategory(categoryId) {
            if (categoryId === 'vip') { toast('VIP-раздел появится позже'); return; }
            if (!SHOP_CATALOG[categoryId]) return;
            cancelShopAnimation();
            shopCategoryId = categoryId;
            shopProductIndex = 0;
            shopCategoryView.classList.add('hidden');
            shopProductView.classList.remove('hidden');
            renderShopCarousel();
        }

        function showShopCategories() {
            cancelShopAnimation();
            shopCategoryId = null;
            shopProductIndex = 0;
            shopProductView.classList.add('hidden');
            shopCategoryView.classList.remove('hidden');
            updateShopStatus();
        }

        function stepShopProduct(direction) {
            if (!shopCategoryId || shopAnimating) return;
            const products = SHOP_CATALOG[shopCategoryId].products;
            if (products.length < 2) return;
            shopAnimating = true;
            shopCarousel.classList.remove('slide-next', 'slide-prev');
            // Force the base positions to be committed before starting the slide.
            void shopCarousel.offsetWidth;
            shopCarousel.classList.add(direction > 0 ? 'slide-next' : 'slide-prev');
            shopAnimationTimer = setTimeout(() => {
                shopProductIndex = (shopProductIndex + direction + products.length) % products.length;
                cancelShopAnimation();
                renderShopCarousel();
            }, 340);
        }

        document.querySelectorAll('[data-shop-category]').forEach(button => {
            button.addEventListener('click', () => openShopCategory(button.dataset.shopCategory));
        });
        document.getElementById('shop-back').addEventListener('click', showShopCategories);
        document.getElementById('shop-prev').addEventListener('click', () => stepShopProduct(-1));
        document.getElementById('shop-next').addEventListener('click', () => stepShopProduct(1));
        shopCarousel.addEventListener('pointerdown', event => {
            if (event.target.closest('button')) return;
            shopSwipeStart = event.clientX;
            shopCarousel.setPointerCapture(event.pointerId);
        });
        shopCarousel.addEventListener('pointerup', event => {
            if (shopSwipeStart == null) return;
            const distance = event.clientX - shopSwipeStart;
            shopSwipeStart = null;
            if (Math.abs(distance) > 42) stepShopProduct(distance < 0 ? 1 : -1);
        });
        shopCarousel.addEventListener('pointercancel', () => { shopSwipeStart = null; });
        setInterval(updateShopStatus, 1000);

        // ---------- Слоты пушек на карте ----------
        // позиции площадок (% от карты); side: куда смотрит пушка (+1 вправо, -1 влево)
        const SLOT_DEFS = [
            { x: 10.8, y: 33.8, side: 1 },   // 1 — слева сверху
            { x: 89.2, y: 33.8, side: -1 },  // 2 — справа сверху
            { x: 10.6, y: 60.1, side: 1 },   // 3 — слева снизу
            { x: 89.6, y: 60.1, side: -1 }   // 4 — справа снизу
        ];

        const LOCK_SVG = `
            <svg class="lock-icon" viewBox="0 0 24 24">
                <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="#e5e7eb" stroke-width="2.6" stroke-linecap="round"/>
                <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/>
                <circle cx="12" cy="15.2" r="1.6" fill="#92400e"/>
                <rect x="11.2" y="15.5" width="1.6" height="3" rx="0.8" fill="#92400e"/>
            </svg>`;

        // Вид (DOM) пушек — один на всех, показывает состояние открытой фермы
        const cannonViews = SLOT_DEFS.map((def, i) => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.style.left = def.x + '%';
            slot.style.top = def.y + '%';

            const cannonEl = document.createElement('div');
            cannonEl.className = 'cannon' + (def.side === -1 ? ' flip' : '');
            const img = document.createElement('img');
            img.dataset.src = 'pushka';
            lazyImg(img);
            img.draggable = false;
            cannonEl.appendChild(img);

            const lockBox = document.createElement('div');
            lockBox.className = 'lock-box';
            lockBox.innerHTML = LOCK_SVG + '<div class="price">$' + fmt(CANNON_PRICES[i]) + '</div>';

            slot.appendChild(cannonEl);
            slot.appendChild(lockBox);
            map.appendChild(slot);

            const v = { index: i, def, slot, cannonEl, img, lockBox, priceEl: lockBox.querySelector('.price') };
            lockBox.addEventListener('click', () => { if (viewFarm) buyCannon(viewFarm, i); });
            return v;
        });

        function buyCannon(f, i) {
            const c = f.cannons[i];
            if (c.owned) return;
            const v = cannonViews[i];
            const price = CANNON_PRICES[i];
            if (dollarCount < price) {
                denyFlash(v.lockBox);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(price);
            if (window.yetiTrack) window.yetiTrack('upgrade', price);
            c.owned = true;
            c.nextAt = Date.now() + CANNON_INTERVAL;
            c.blocked = false;
            v.slot.classList.add('unlocked');
            const flip = v.cannonEl.classList.contains('flip');
            v.cannonEl.animate(
                [{ opacity: 0, transform: 'translate(-50%, -80%)' + (flip ? ' scaleX(-1)' : '') },
                 { opacity: 1, transform: 'translate(-50%, -56%)' + (flip ? ' scaleX(-1)' : '') }],
                { duration: 300, easing: 'ease-out' }
            );
            updateForemanRate();
            saveState();
        }

        // ---------- Прораб ----------
        const foremanEl = document.createElement('div');
        foremanEl.id = 'foreman';
        foremanEl.className = 'locked';
        foremanEl.innerHTML = '<img id="foreman-img" data-src="prorab" alt="" draggable="false">';
        lazyAll(foremanEl);
        map.appendChild(foremanEl);

        const foremanLock = document.createElement('div');
        foremanLock.id = 'foreman-lock';
        foremanLock.innerHTML = LOCK_SVG + '<div class="price">$' + fmt(FOREMAN_PRICE) + '</div>';
        map.appendChild(foremanLock);

        const foremanRateEl = document.createElement('div');
        foremanRateEl.id = 'foreman-rate';
        foremanRateEl.innerHTML = '<div class="ico"></div><div class="txt">0/ч</div>';
        map.appendChild(foremanRateEl);
        const foremanRateTxt = foremanRateEl.querySelector('.txt');

        function updateForemanRate() {
            if (farmDomAttached && viewFarm && viewFarm.foreman) {
                foremanRateTxt.innerText = fmt(farmRate(viewFarm)) + '/ч';
                foremanRateEl.classList.add('show');
            } else {
                foremanRateEl.classList.remove('show');
            }
        }

        function buyForeman(f) {
            if (f.foreman) return;
            if (dollarCount < FOREMAN_PRICE) {
                denyFlash(foremanLock);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(FOREMAN_PRICE);
            if (window.yetiTrack) window.yetiTrack('upgrade', FOREMAN_PRICE);
            f.foreman = true;
            foremanEl.classList.remove('locked');
            foremanLock.classList.remove('show');
            updateForemanRate();
            saveState();
        }
        foremanLock.addEventListener('click', () => { if (viewFarm) buyForeman(viewFarm); });

        // Цены краснеют, если не хватает денег; хаб и выбор вида перерисовываются
        function updatePriceColors() {
            if (farmDomAttached && viewFarm && viewFarm.type === 'cutter') updateCutterPrices(viewFarm);
            if (farmDomAttached && viewFarm && viewFarm.type === 'factory') renderFactory(viewFarm);
            if (farmDomAttached && viewFarm && viewFarm.type === 'snow') {
                cannonViews.forEach((v, i) => {
                    if (!viewFarm.cannons[i].owned) v.priceEl.classList.toggle('poor', dollarCount < CANNON_PRICES[i]);
                });
                if (!viewFarm.foreman) foremanLock.querySelector('.price').classList.toggle('poor', dollarCount < FOREMAN_PRICE);
            }
            if (currentTab === 'mining') {
                if (mineView === 'hub') renderHub();
                else if (mineView === 'build') renderBuild();
            }
        }

        // ---------- Хаб: общая добыча и список слотов ----------
        const hubRateVal = $('hub-rate');
        const hubCount = $('hub-count');
        const hubList = $('hub-list');
        const hubBuild = $('hub-build');

        function farmSub(f) {
            if (f.type === 'factory') {
                return 'Генераторы ' + f.gens.filter(g => g.owned).length + '/8 · ремонтники ' + f.workers.length;
            }
            if (f.type === 'cutter') {
                const hired = f.workers.filter(w => w.owned).length;
                const saws = f.workers.filter(w => w.owned && w.saw).length;
                return 'Йети ' + hired + '/3 · пилы ' + saws + ' · ' + (f.foreman ? 'прораб нанят' : 'без прораба');
            }
            return 'Пушки ' + ownedCannons(f) + '/4 · ' + (f.foreman ? 'прораб нанят' : 'без прораба');
        }

        const hubPassive = f => f.type === 'factory' ? farmRate(f) > 0 : f.foreman;

        function renderHub() {
            hubRateVal.innerText = fmt(totalRate());
            hubCount.innerText = farms.length + '/' + slotsOwned;
            hubBuild.classList.toggle('disabled', farms.length >= slotsOwned);
            hubList.innerHTML = '';

            for (let i = 0; i < SLOT_MAX; i++) {
                const card = document.createElement('div');
                if (i < farms.length) {
                    const f = farms[i];
                    card.className = 'slot-card';
                    card.innerHTML =
                        '<div class="slot-ico"></div>' +
                        '<div class="slot-main"><div class="slot-name">' + farmType(f.type).name + ' №' + (i + 1) + '</div>' +
                        '<div class="slot-sub">' + farmSub(f) + '</div></div>' +
                        '<div class="slot-right"><div class="slot-rate' + (hubPassive(f) ? '' : ' dim') + '">' +
                        (f.type === 'factory' ? fmt(farmRate(f)) + '/ч' : (f.foreman ? fmt(farmRate(f)) + '/ч' : 'вручную')) + '</div></div>' +
                        '<div class="slot-arrow">›</div>';
                    card.addEventListener('click', () => {
                        if (window.yetiTrack) window.yetiTrack('visitBusiness');
                        showMineView('farm', f);
                    });
                } else if (i < slotsOwned) {
                    card.className = 'slot-card empty';
                    card.innerHTML =
                        '<div class="slot-ico">+</div>' +
                        '<div class="slot-main"><div class="slot-name">Свободный слот</div>' +
                        '<div class="slot-sub">Нажмите, чтобы построить ферму</div></div>';
                    card.addEventListener('click', () => showMineView('build'));
                } else {
                    const n = i + 1;
                    const price = SLOT_PRICES[n];
                    card.className = 'slot-card locked';
                    card.innerHTML =
                        '<div class="slot-ico">' + LOCK_SVG.replace('class="lock-icon"', '') + '</div>' +
                        '<div class="slot-main"><div class="slot-name">Слот ' + n + '</div>' +
                        '<div class="slot-sub">Закрыт</div></div>' +
                        '<div class="cost' + (dollarCount < price ? ' poor' : '') + '">$' + fmt(price) + '</div>';
                    card.addEventListener('click', () => buySlot(n, card));
                }
                hubList.appendChild(card);
            }
        }

        function buySlot(n, card) {
            if (n !== slotsOwned + 1) { toast('Сначала откройте слот ' + (slotsOwned + 1)); return; }
            const price = SLOT_PRICES[n];
            if (dollarCount < price) {
                denyFlash(card);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(price);
            slotsOwned = n;
            renderHub();
            toast('Слот ' + n + ' открыт');
            saveState();
        }

        hubBuild.addEventListener('click', () => {
            if (farms.length >= slotsOwned) {
                denyFlash(hubBuild);
                toast(slotsOwned < SLOT_MAX ? 'Нет свободных слотов — откройте новый' : 'Нет свободных слотов');
                return;
            }
            showMineView('build');
        });

        // ---------- Выбор вида фермы ----------
        const buildList = $('build-list');

        let openTip = null;   // какое описание сейчас открыто

        function renderBuild() {
            buildList.innerHTML = '';
            FARM_TYPES.forEach(t => {
                const card = document.createElement('div');
                card.className = 'type-card';
                card.innerHTML =
                    '<div class="type-top"><div class="slot-ico"></div><div class="type-name">' + t.name + '</div>' +
                    '<button class="type-i" aria-label="Описание">i</button></div>' +
                    '<div class="type-bottom"><div class="cost' + (dollarCount < t.price ? ' poor' : '') + '">$' + fmt(t.price) + '</div>' +
                    '<button class="type-btn">Построить</button></div>' +
                    '<div class="type-tip' + (openTip === t.id ? ' show' : '') + '">' + t.desc + '</div>';
                const tip = card.querySelector('.type-tip');
                card.querySelector('.type-i').addEventListener('click', () => {
                    const show = !tip.classList.contains('show');
                    buildList.querySelectorAll('.type-tip').forEach(x => x.classList.remove('show'));
                    tip.classList.toggle('show', show);
                    openTip = show ? t.id : null;
                });
                tip.addEventListener('click', () => { tip.classList.remove('show'); openTip = null; });
                card.querySelector('.type-btn').addEventListener('click', () => buildFarm(t, card));
                buildList.appendChild(card);
            });
        }

        function buildFarm(t, card) {
            if (farms.length >= slotsOwned) { toast('Нет свободных слотов'); return; }
            if (dollarCount < t.price) {
                denyFlash(card);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(t.price);
            const f = newFarm(t.id, null);
            farms.push(f);
            if (window.yetiTrack) window.yetiTrack('farmOpened', t.id);
            saveState();
            showMineView('farm', f);
        }

        $('build-back').addEventListener('click', () => showMineView('hub'));
        $('farm-back').addEventListener('click', () => showMineView('hub'));

        // ---------- Переключение видов вкладки «Добыча» ----------
        const mineViews = { hub: $('mine-hub'), build: $('mine-build'), farm: $('mine-farm') };

        function showMineView(view, farm) {
            if (farmDomAttached) detachFarmDom();
            openTip = null;
            mineView = view;
            viewFarm = view === 'farm' ? (farm || viewFarm) : null;
            Object.keys(mineViews).forEach(k => mineViews[k].classList.toggle('hidden', k !== view));
            refreshMine();
        }

        // Показывает/прячет карту фермы в зависимости от текущей вкладки и вида
        function refreshMine() {
            const should = currentTab === 'mining' && mineView === 'farm' && !!viewFarm;
            if (should && !farmDomAttached) attachFarmDom();
            else if (!should && farmDomAttached) detachFarmDom();
            if (currentTab === 'mining') {
                if (mineView === 'hub') renderHub();
                else if (mineView === 'build') renderBuild();
            }
        }

        function attachFarmDom() {
            const f = viewFarm;
            mapArea.classList.toggle('hidden', f.type !== 'snow');
            cutterArea.classList.toggle('hidden', f.type !== 'cutter');
            factoryArea.classList.toggle('hidden', f.type !== 'factory');
            fitMap();
            farmDomAttached = true;
            $('farm-title').innerText = farmType(f.type).name + ' №' + farmIndex(f);
            if (f.type === 'cutter') {
                syncCutterView(f);
                updatePriceColors();
                return;
            }
            if (f.type === 'factory') {
                renderFactory(f);
                return;
            }
            cannonViews.forEach((v, i) => {
                const c = f.cannons[i];
                v.slot.classList.toggle('unlocked', c.owned);
                v.cannonEl.classList.toggle('idle', c.blocked);
            });
            foremanEl.classList.toggle('locked', !f.foreman);
            foremanEl.classList.toggle('working', !!f.fTask);
            foremanLock.classList.toggle('show', !f.foreman);
            updateForemanRate();
            f.piles.forEach(attachPileView);
            updatePriceColors();
        }

        function detachFarmDom() {
            if (viewFarm) viewFarm.piles.forEach(p => { releasePile(p); p.el = null; p.body = null; p.bar = null; });
            pilesLayer.innerHTML = '';
            parts.length = 0;
            streams.length = 0;
            clearCutterView();
            clearFactoryView();
            closeFacModal();
            closeBizModal();
            farmDomAttached = false;
        }

        // ---------- Кучи снега ----------
        const cellKey = (c, r) => c + ',' + r;
        const GROW_MS = 1300; // за это время куча вырастает (пока на неё сыплется снег)
        const clamp01 = v => Math.max(0, Math.min(1, v));
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        function freeCells(f) {
            const used = new Set(f.piles.map(p => p.key));
            const res = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (isBlockedCell(c, r)) continue;
                    if (used.has(cellKey(c, r))) continue;
                    res.push({ c, r });
                }
            }
            return res;
        }

        // Рост кучи t: 0..1 — поднимается снизу, в конце мягко «оседает»
        function applyGrow(p, t) {
            if (!p.body) return;
            const e = easeOutCubic(t);
            let sc = 0.15 + 0.85 * e;
            if (t > 0.85) sc *= 1 + 0.05 * Math.sin((t - 0.85) / 0.15 * Math.PI);
            p.body.style.opacity = Math.min(1, t / 0.15);
            p.body.style.transform = 'scale(' + sc + ')';
            p.body.style.clipPath = 'inset(' + ((1 - e) * 30) + '% 0 0 0)';
        }

        function makePileReady(p) {
            if (p.ready) return;
            p.ready = true;
            if (p.el) {
                p.body.style.opacity = '';
                p.body.style.transform = '';
                p.body.style.clipPath = '';
                p.el.classList.add('ready'); // только теперь кучу можно убирать
            }
        }

        function releasePile(p) {
            if (p.holder === 'player') {
                p.holder = null;
                p.pointerId = null;
                if (p.el) p.el.classList.remove('active');
            }
        }

        // Создаёт DOM кучи (только для открытой фермы)
        function attachPileView(p) {
            const el = document.createElement('div');
            el.className = 'pile' + (p.ready ? ' ready' : '') + (p.holder ? ' active' : '');
            el.style.left = p.x + '%';
            el.style.top = p.y + '%';
            el.innerHTML = '<div class="pile-bar"><div></div></div><div class="pile-body"><img data-src="snow" draggable="false" alt=""></div>';
            lazyAll(el);
            pilesLayer.appendChild(el);
            p.el = el;
            p.body = el.querySelector('.pile-body');
            p.bar = el.querySelector('.pile-bar > div');

            // Игрок: зажать и держать 1.5 сек (только на выросшей куче)
            el.addEventListener('pointerdown', (e) => {
                if (!p.ready || p.holder) return;
                e.preventDefault();
                p.holder = 'player';
                p.startAt = Date.now();
                p.pointerId = e.pointerId;
                el.classList.add('active');
                try { el.setPointerCapture(e.pointerId); } catch (err) {}
            });
            const end = (e) => {
                if (p.holder === 'player' && p.pointerId === e.pointerId) releasePile(p);
            };
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
            el.addEventListener('lostpointercapture', end);
            el.addEventListener('contextmenu', e => e.preventDefault());

            if (!p.ready) applyGrow(p, clamp01((Date.now() - p.growStart) / GROW_MS));
        }

        function createPile(f, cell, fromIdx) {
            const pos = cellCenter(cell.c, cell.r);
            const p = {
                farm: f, key: cellKey(cell.c, cell.r),
                x: pos.x + (Math.random() - 0.5) * 1.6,
                y: pos.y + (Math.random() - 0.5) * 1.2,
                ready: false, growStart: Date.now(),
                holder: null, startAt: 0, pointerId: null,
                el: null, body: null, bar: null
            };
            f.piles.push(p);

            if (farmVisible(f)) {
                attachPileView(p);
                if (fromIdx !== null && fromIdx !== undefined) {
                    applyGrow(p, 0);
                    startStream(f, fromIdx, p);   // струя + рост
                } else {
                    makePileReady(p);
                }
            } else {
                makePileReady(p);                 // ферма не на экране — куча сразу готова
            }
            return p;
        }

        // ---------- Струя снега из пушек (canvas) ----------
        const fx = $('fx');
        const fctx = fx.getContext('2d');
        let dpr = 1;
        const parts = [];    // частицы: 0 — снежинка в полёте, 1 — туман у дула, 2 — снежная пыль
        const streams = [];  // активные струи в клетки

        function sizeFx() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            fx.width = Math.max(1, Math.round(mapW * dpr));
            fx.height = Math.max(1, Math.round(mapH * dpr));
        }

        function muzzlePx(def) {
            return {
                x: def.x * mapW / 100 + def.side * U * 4.4,
                y: def.y * mapH / 100 - U * 4.2
            };
        }

        function startStream(f, ci, p) {
            streams.push({
                ci, tx: p.x * mapW / 100, ty: p.y * mapH / 100,
                start: Date.now(), dur: GROW_MS * 0.8, acc: 0
            });
            // отдача пушки
            cannonViews[ci].img.animate(
                [{ transform: 'scale(1)' }, { transform: 'scale(0.95, 1.05)' }, { transform: 'scale(1)' }],
                { duration: 260, easing: 'ease-out', iterations: 3 }
            );
        }

        function emitSnow(s, now) {
            const m = muzzlePx(cannonViews[s.ci].def);
            parts.push({
                k: 0, born: now, T: 0.45 + Math.random() * 0.25,
                sx: m.x + (Math.random() - 0.5) * U * 1.2,
                sy: m.y + (Math.random() - 0.5) * U * 1.2,
                ex: s.tx + (Math.random() - 0.5) * U * 5.5,
                ey: s.ty + (Math.random() - 0.3) * U * 3,
                h: U * (5 + Math.random() * 5),
                size: U * (0.45 + Math.random() * 0.9)
            });
        }

        function emitMist(ci, now, strong) {
            const def = cannonViews[ci].def;
            const m = muzzlePx(def);
            parts.push({
                k: 1, born: now, life: 0.5 + Math.random() * 0.4,
                x: m.x, y: m.y,
                vx: def.side * U * (3 + Math.random() * 5),
                vy: -U * (1 + Math.random() * 3),
                r: U * (0.8 + Math.random() * 0.8),
                a: strong ? 0.4 : 0.22
            });
        }

        function renderFx(now, dt) {
            fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            fctx.clearRect(0, 0, mapW, mapH);
            if (!farmDomAttached || !viewFarm || viewFarm.type !== 'snow') { parts.length = 0; streams.length = 0; return; }

            // эмиссия струй
            for (let i = streams.length - 1; i >= 0; i--) {
                const s = streams[i];
                if (now > s.start + s.dur) { streams.splice(i, 1); continue; }
                s.acc += dt * 0.11; // ~110 частиц в секунду
                while (s.acc >= 1) { s.acc -= 1; emitSnow(s, now); }
                if (Math.random() < dt / 50) emitMist(s.ci, now, true);
            }
            // лёгкий туман у дула, пока пушка работает
            viewFarm.cannons.forEach((c, i) => {
                if (c.owned && !c.blocked) {
                    c.mistAcc = (c.mistAcc || 0) + dt * 0.006;
                    while (c.mistAcc >= 1) { c.mistAcc -= 1; emitMist(i, now, false); }
                }
            });

            // отрисовка
            for (let i = parts.length - 1; i >= 0; i--) {
                const q = parts[i];
                const age = (now - q.born) / 1000;
                if (q.k === 0) {
                    const t = age / q.T;
                    if (t >= 1) {
                        parts.splice(i, 1);
                        if (Math.random() < 0.3) {
                            parts.push({ k: 2, born: now, life: 0.45, x: q.ex, y: q.ey, r: U * (1 + Math.random() * 0.8), a: 0.4 });
                        }
                        continue;
                    }
                    const x = q.sx + (q.ex - q.sx) * t;
                    const y = q.sy + (q.ey - q.sy) * t - 4 * q.h * t * (1 - t);
                    fctx.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
                    fctx.fillStyle = '#f4f9ff';
                    fctx.beginPath();
                    fctx.arc(x, y, q.size * (1 - 0.3 * t), 0, 6.2832);
                    fctx.fill();
                } else {
                    const t = age / q.life;
                    if (t >= 1) { parts.splice(i, 1); continue; }
                    let x, y, r;
                    if (q.k === 1) { x = q.x + q.vx * age; y = q.y + q.vy * age; r = q.r * (1 + 1.8 * t); }
                    else { x = q.x; y = q.y - U * 3 * age; r = q.r * (1 + 1.5 * t); }
                    fctx.globalAlpha = q.a * (1 - t);
                    fctx.fillStyle = '#ffffff';
                    fctx.beginPath();
                    fctx.arc(x, y, r, 0, 6.2832);
                    fctx.fill();
                }
            }
            fctx.globalAlpha = 1;
        }

        // ---------- Сбор кучи (игроком или прорабом) ----------
        function collectPile(p) {
            const f = p.farm;
            const idx = f.piles.indexOf(p);
            if (idx < 0) return;
            f.piles.splice(idx, 1);
            f.totalIce += ICE_PER_PILE;
            if (window.yetiTrack) window.yetiTrack('businessIce', ICE_PER_PILE);

            if (farmVisible(f) && p.el) {
                const rect = p.el.getBoundingClientRect();
                const cr = gameContainer.getBoundingClientRect();
                const sx = rect.left - cr.left + rect.width / 2;
                const sy = rect.top - cr.top + rect.height / 2;
                const el = p.el;
                el.classList.remove('ready', 'active');
                const a = p.body.animate(
                    [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.1)', opacity: 0 }],
                    { duration: 240, easing: 'ease-in', fill: 'forwards' }
                );
                a.onfinish = () => el.remove(); // куча сжимается вниз
                for (let i = 0; i < ICE_PER_PILE; i++) {
                    setTimeout(() => flyIce(sx, sy, () => addIce(1), 70), i * 45);
                }
            } else {
                if (p.el) p.el.remove();
                addIce(ICE_PER_PILE);
            }
            p.el = null;
        }

        // ---------- Симуляция фермы: пушки, рост, прораб ----------
        function updateCannons(f, now) {
            f.cannons.forEach(c => {
                if (!c.owned) return;
                let guard = 0;
                while (now >= c.nextAt && guard++ < 60) {
                    const free = freeCells(f);
                    if (!free.length) {
                        // мест нет — пушка простаивает
                        c.blocked = true;
                        c.nextAt = now + CANNON_INTERVAL;
                        break;
                    }
                    c.blocked = false;
                    createPile(f, free[Math.floor(Math.random() * free.length)], c.index);
                    c.nextAt += CANNON_INTERVAL;
                }
                if (farmVisible(f)) cannonViews[c.index].cannonEl.classList.toggle('idle', c.blocked);
            });
        }

        function updateGrowth(f, now) {
            for (const p of f.piles) {
                if (p.ready) continue;
                const t = clamp01((now - p.growStart) / GROW_MS);
                if (t >= 1) makePileReady(p);
                else applyGrow(p, t);
            }
        }

        function updatePlayerHolds(f, now) {
            for (let i = f.piles.length - 1; i >= 0; i--) {
                const p = f.piles[i];
                if (p.holder === 'player' && now - p.startAt >= HOLD_TIME) collectPile(p);
            }
        }

        function updateForeman(f, now) {
            if (!f.foreman) return;
            let guard = 0;
            while (guard++ < 200) {
                if (!f.fTask) {
                    const cand = f.piles.filter(p => p.ready && !p.holder);
                    if (!cand.length) {
                        f.fLast = 0;
                        if (farmVisible(f)) foremanEl.classList.remove('working');
                        return;
                    }
                    const p = cand[Math.floor(Math.random() * cand.length)];
                    p.holder = 'foreman';
                    p.startAt = f.fLast || now;
                    if (p.el) p.el.classList.add('active');
                    f.fLast = 0;
                    f.fTask = p;
                    if (farmVisible(f)) foremanEl.classList.add('working');
                }
                if (now - f.fTask.startAt >= HOLD_TIME) {
                    const finishAt = f.fTask.startAt + HOLD_TIME;
                    const p = f.fTask;
                    f.fTask = null;
                    f.fLast = finishAt;
                    collectPile(p);
                    continue;
                }
                return;
            }
        }

        // ---------- Ферма «Ледорез» ----------
        const CUBE_SVG = '<svg viewBox="0 0 40 44"><polygon points="20,2 38,12 20,22 2,12" fill="#e6f7ff"/><polygon points="2,12 20,22 20,42 2,32" fill="#7fd0f5"/><polygon points="38,12 20,22 20,42 38,32" fill="#4fb3e8"/><path d="M20 22V42M2 12L20 22L38 12" stroke="rgba(255,255,255,0.75)" stroke-width="1.2" fill="none"/><polygon points="20,2 38,12 38,32 20,42 2,32 2,12" fill="none" stroke="#2b8fd0" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 15L14 18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/></svg>';

        // центры рабочих мест йети (% от карты озера)
        const CW_DEFS = [{ x: 24, y: 31 }, { x: 24, y: 53 }, { x: 24, y: 75 }];
        const cview = { field: [] };   // кубики, нарисованные на озере (для открытой фермы)

        const cutterLimit = f => LIMIT_BASE + LIMIT_STEP * f.limitLevel;

        const cutterWorkerViews = CW_DEFS.map((d, i) => {
            const slot = document.createElement('div');
            slot.className = 'cslot locked axe';
            slot.style.left = d.x + '%';
            slot.style.top = d.y + '%';
            slot.innerHTML =
                '<div class="cw-yeti"><img class="cw-img" data-src="yeti_axe" draggable="false" alt=""></div>' +
                '<div class="lock-box">' + LOCK_SVG + '<div class="price">$' + fmt(HIRE_PRICES[i] || 0) + '</div></div>' +
                '<div class="c-tool">Бензопила <b>$' + fmt(SAW_PRICES[i]) + '</b></div>';
            lazyAll(slot);
            cutterMap.appendChild(slot);
            const v = {
                index: i, slot,
                yeti: slot.querySelector('.cw-yeti'),
                img: slot.querySelector('.cw-img'),
                lockBox: slot.querySelector('.lock-box'),
                priceEl: slot.querySelector('.lock-box .price'),
                toolEl: slot.querySelector('.c-tool')
            };
            v.yeti.addEventListener('pointerdown', (e) => { e.preventDefault(); if (viewFarm && viewFarm.type === 'cutter') axeHit(viewFarm, i); });
            v.lockBox.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'cutter') buyHire(viewFarm, i); });
            v.toolEl.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'cutter') buySaw(viewFarm, i); });
            return v;
        });

        // прораб ледореза
        const cForeEl = document.createElement('div');
        cForeEl.className = 'c-fore locked';
        cForeEl.innerHTML = '<img data-src="prorab" alt="" draggable="false">';
        lazyAll(cForeEl);
        cutterMap.appendChild(cForeEl);
        const cForeLock = document.createElement('div');
        cForeLock.className = 'c-fore-lock';
        cForeLock.innerHTML = LOCK_SVG + '<div class="price">$' + fmt(C_FOREMAN_PRICE) + '</div>';
        cutterMap.appendChild(cForeLock);
        const cRateEl = document.createElement('div');
        cRateEl.className = 'c-rate';
        cRateEl.innerHTML = '<div class="ico"></div><div class="txt">0/ч</div>';
        cutterMap.appendChild(cRateEl);

        // счётчик несобранного льда и улучшение лимита
        const cCountEl = document.createElement('div');
        cCountEl.className = 'c-count';
        cCountEl.innerHTML = '<div class="ico"></div><div class="txt">0/30</div>';
        cutterMap.appendChild(cCountEl);
        const cLimitEl = document.createElement('div');
        cLimitEl.className = 'c-limit';
        cutterMap.appendChild(cLimitEl);

        cForeLock.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'cutter') buyCForeman(viewFarm); });
        cLimitEl.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'cutter') buyLimit(viewFarm); });

        // --- вид (DOM) ---
        function clearCutterView() {
            cview.field = [];
            cubesLayer.innerHTML = '';
            stacksLayer.innerHTML = '';
        }

        function syncCutterStatic(f) {
            cutterWorkerViews.forEach((v, i) => {
                const w = f.workers[i];
                v.slot.classList.toggle('locked', !w.owned);
                v.slot.classList.toggle('owned', w.owned);
                v.slot.classList.toggle('axe', w.owned && !w.saw);
                v.slot.classList.toggle('saw', w.owned && w.saw);
                const src = w.saw ? A('yeti_saw') : A('yeti_axe');
                if (!v.img.src.endsWith(src)) v.img.src = src;
                v.yeti.classList.toggle('sawing', w.owned && w.saw && !w.blocked);
            });
            cForeEl.classList.toggle('locked', !f.foreman);
            cForeEl.classList.toggle('working', f.foreman && f.cubes > 0);
            cForeLock.classList.toggle('show', !f.foreman);
            cRateEl.querySelector('.txt').innerText = fmt(farmRate(f)) + '/ч';
            cRateEl.classList.toggle('show', f.foreman);
            renderCutterCounter(f);
            updateCutterPrices(f);
        }

        function syncCutterView(f) {
            clearCutterView();
            syncCutterStatic(f);
            adjustField(f, null);
        }

        function renderCutterCounter(f) {
            const limit = cutterLimit(f);
            cCountEl.querySelector('.txt').innerText = f.cubes + '/' + limit;
            cCountEl.classList.toggle('full', f.cubes >= limit);
        }

        function updateCutterPrices(f) {
            cutterWorkerViews.forEach((v, i) => {
                const w = f.workers[i];
                if (!w.owned) v.priceEl.classList.toggle('poor', dollarCount < HIRE_PRICES[i]);
                else if (!w.saw) v.toolEl.classList.toggle('poor', dollarCount < SAW_PRICES[i]);
            });
            if (!f.foreman) cForeLock.querySelector('.price').classList.toggle('poor', dollarCount < C_FOREMAN_PRICE);
            if (f.limitLevel >= LIMIT_PRICES.length) {
                cLimitEl.innerHTML = 'Лимит: максимум';
                cLimitEl.classList.add('max');
                cLimitEl.classList.remove('poor');
            } else {
                const price = LIMIT_PRICES[f.limitLevel];
                cLimitEl.innerHTML = 'Лимит +' + LIMIT_STEP + ' <b>$' + fmt(price) + '</b>';
                cLimitEl.classList.remove('max');
                cLimitEl.classList.toggle('poor', dollarCount < price);
            }
        }

        // позиция нового кубика на озере: без наездов друг на друга и на прораба
        function pickCubePos() {
            const hr = cH / cW;
            let best = null, bestD = -1;
            for (let t = 0; t < 40; t++) {
                const x = 40 + Math.random() * 46;
                const y = 40 + Math.random() * 36;
                if (x > 68 && y > 72) continue;
                let d = 999;
                cview.field.forEach(c => {
                    const dx = x - c.x, dy = (y - c.y) * hr;
                    d = Math.min(d, Math.sqrt(dx * dx + dy * dy));
                });
                if (d >= 9) return { x, y };
                if (d > bestD) { bestD = d; best = { x, y }; }
            }
            return best || { x: 60, y: 55 };
        }

        function addFieldCube(from) {
            const pos = pickCubePos();
            const el = document.createElement('div');
            el.className = 'cube';
            el.style.left = pos.x + '%';
            el.style.top = pos.y + '%';
            el.innerHTML = CUBE_SVG;
            cubesLayer.appendChild(el);
            const c = { el, x: pos.x, y: pos.y };
            cview.field.push(c);
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (viewFarm && viewFarm.type === 'cutter') cutterTake(viewFarm, c);
            });
            if (from) {
                const dx = from.x - pos.x * cW / 100;
                const dy = from.y - pos.y * cH / 100;
                el.animate([
                    { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.4)', opacity: 0 },
                    { transform: 'translate(calc(-50% + ' + (dx * 0.5) + 'px), calc(-50% + ' + (dy * 0.5 - cU * 7) + 'px)) scale(1)', opacity: 1, offset: 0.5 },
                    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                ], { duration: 520, easing: 'ease-out' });
            } else {
                el.animate([
                    { opacity: 0, transform: 'translate(-50%, -50%) scale(0.3)' },
                    { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
                ], { duration: 260 });
            }
        }

        // Лишние кубики (сверх 10 на озере) — аккуратными штабелями в зоне хранения
        function renderStacks(f) {
            stacksLayer.innerHTML = '';
            const rest = Math.max(0, f.cubes - FIELD_MAX);
            if (!rest) return;
            const cols = Math.min(6, Math.ceil(rest / 5));
            const base = Math.floor(rest / cols);
            const extra = rest % cols;
            for (let c = 0; c < cols; c++) {
                const h = base + (c < extra ? 1 : 0);
                const x = 72 + (c - (cols - 1) / 2) * 6;
                for (let k = 0; k < h; k++) {
                    const el = document.createElement('div');
                    el.className = 'scube';
                    el.style.left = x + '%';
                    el.style.top = (27 - k * 1.45) + '%';
                    el.innerHTML = CUBE_SVG;
                    stacksLayer.appendChild(el);
                }
            }
        }

        // Приводит картинку к данным: на озере min(кубиков, 10), остальное — в штабелях
        function adjustField(f, from) {
            if (!farmVisible(f)) return;
            const want = Math.min(f.cubes, FIELD_MAX);
            while (cview.field.length > want) {
                const c = cview.field.splice(Math.floor(Math.random() * cview.field.length), 1)[0];
                c.el.remove();
            }
            while (cview.field.length < want) addFieldCube(from);
            renderStacks(f);
            renderCutterCounter(f);
        }

        const hitPoint = i => ({ x: (CW_DEFS[i].x + 13) * cW / 100, y: CW_DEFS[i].y * cH / 100 + 3 * cU });
        const stackPoint = () => ({ x: 72 * cW / 100, y: 20 * cH / 100 });

        // --- логика ---
        const cubeValue = (f, i) => f.workers[i].saw ? SAW_CUBE[i] : AXE_CUBE[i];

        function cutterAdd(f, i) {
            f.cubeVals.push(cubeValue(f, i));
            if (farmVisible(f)) adjustField(f, hitPoint(i));
        }

        // лёд летит в счётчик: чем дороже кубик, тем больше частиц
        function iceFly(sx, sy, value) {
            const n = Math.max(3, Math.min(8, Math.round(value / 25)));
            const base = Math.floor(value / n);
            const extra = value - base * n;
            for (let k = 0; k < n; k++) {
                const add = base + (k === 0 ? extra : 0);
                setTimeout(() => flyIce(sx, sy, () => addIce(add), 60), k * 50);
            }
        }

        function takeFirst(f) {
            const v = f.cubeVals.shift();
            f.totalIce += v;
            if (window.yetiTrack) window.yetiTrack('businessIce', v);
            addIce(v);
        }

        // забрать один кубик (нажатием игрока или прорабом)
        function cutterTake(f, item) {
            if (f.cubes <= 0) return;
            if (farmVisible(f)) {
                const it = item || cview.field[Math.floor(Math.random() * cview.field.length)];
                const idx = it ? cview.field.indexOf(it) : -1;
                if (it && idx >= 0) {
                    const val = f.cubeVals.splice(idx, 1)[0];   // кубик на озере i — это cubeVals[i]
                    f.totalIce += val;
                    if (window.yetiTrack) window.yetiTrack('businessIce', val);
                    cview.field.splice(idx, 1);
                    const rect = it.el.getBoundingClientRect();
                    const cr = gameContainer.getBoundingClientRect();
                    const sx = rect.left - cr.left + rect.width / 2;
                    const sy = rect.top - cr.top + rect.height / 2;
                    const el = it.el;
                    el.style.pointerEvents = 'none';
                    el.animate(
                        [{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 }],
                        { duration: 220, fill: 'forwards' }
                    ).onfinish = () => el.remove();
                    iceFly(sx, sy, val);
                } else {
                    takeFirst(f);
                }
                adjustField(f, stackPoint());
            } else {
                takeFirst(f);
            }
        }

        function axeHit(f, i) {
            const w = f.workers[i];
            if (!w.owned || w.saw) return;
            const now = Date.now();
            if (now - w.hitAt < AXE_COOLDOWN) return;
            if (f.cubes >= cutterLimit(f)) { toast('Озеро заполнено — соберите лёд'); return; }
            w.hitAt = now;
            cutterWorkerViews[i].img.animate([
                { transform: 'translate(0, 0) rotate(0deg)' },
                { transform: 'translate(' + (-cU * 0.6) + 'px, ' + (-cU * 1.4) + 'px) rotate(-5deg)', offset: 0.4 },
                { transform: 'translate(' + (cU * 0.8) + 'px, ' + (cU * 1.2) + 'px) rotate(4deg)', offset: 0.7 },
                { transform: 'translate(0, 0) rotate(0deg)' }
            ], { duration: 200, easing: 'ease-in-out' });
            setTimeout(() => { if (f.cubes < cutterLimit(f)) cutterAdd(f, i); }, 90);
        }

        function updateCutter(f, now) {
            const limit = cutterLimit(f);
            f.workers.forEach((w, i) => {
                if (!w.owned || !w.saw) return;
                let g = 0;
                while (now >= w.nextAt && g++ < 300) {
                    if (f.cubes >= limit) {
                        // лимит достигнут — нарезка стоит, пока не соберут кубики
                        w.blocked = true;
                        w.nextAt = now + SAW_INTERVAL;
                        break;
                    }
                    w.blocked = false;
                    cutterAdd(f, i);
                    w.nextAt += SAW_INTERVAL;
                }
                if (farmVisible(f)) cutterWorkerViews[i].yeti.classList.toggle('sawing', !w.blocked);
            });
            if (f.foreman) {
                let g = 0;
                while (f.cubes > 0 && now >= f.fNext && g++ < 500) {
                    cutterTake(f, null);
                    f.fNext += FOREMAN_MS;
                }
                if (f.cubes === 0 && f.fNext < now) f.fNext = now + FOREMAN_MS;
                if (farmVisible(f)) cForeEl.classList.toggle('working', f.cubes > 0);
            }
        }

        // --- покупки ---
        function buyHire(f, i) {
            const w = f.workers[i];
            if (w.owned) return;
            if (dollarCount < HIRE_PRICES[i]) { denyFlash(cutterWorkerViews[i].lockBox); denyFlash(uiDollarBox); return; }
            spendDollars(HIRE_PRICES[i]);
            if (window.yetiTrack) window.yetiTrack('hire', 1);
            w.owned = true;
            w.saw = false;
            w.nextAt = Date.now() + SAW_INTERVAL;
            syncCutterStatic(f);
            saveState();
        }

        function buySaw(f, i) {
            const w = f.workers[i];
            if (!w.owned || w.saw) return;
            if (dollarCount < SAW_PRICES[i]) { denyFlash(cutterWorkerViews[i].toolEl); denyFlash(uiDollarBox); return; }
            spendDollars(SAW_PRICES[i]);
            if (window.yetiTrack) window.yetiTrack('upgrade', SAW_PRICES[i]);
            w.saw = true;
            w.blocked = false;
            w.nextAt = Date.now() + SAW_INTERVAL;
            syncCutterStatic(f);
            saveState();
        }

        function buyCForeman(f) {
            if (f.foreman) return;
            if (dollarCount < C_FOREMAN_PRICE) { denyFlash(cForeLock); denyFlash(uiDollarBox); return; }
            spendDollars(C_FOREMAN_PRICE);
            if (window.yetiTrack) window.yetiTrack('upgrade', C_FOREMAN_PRICE);
            f.foreman = true;
            f.fNext = Date.now() + FOREMAN_MS;
            syncCutterStatic(f);
            saveState();
        }

        function buyLimit(f) {
            if (f.limitLevel >= LIMIT_PRICES.length) return;
            const price = LIMIT_PRICES[f.limitLevel];
            if (dollarCount < price) { denyFlash(cLimitEl); denyFlash(uiDollarBox); return; }
            spendDollars(price);
            if (window.yetiTrack) window.yetiTrack('upgrade', price);
            f.limitLevel++;
            syncCutterStatic(f);
            saveState();
        }

        // ---------- Ледозавод ----------
        // Координаты на картинке factory.png (в её пикселях 1088×1450) — при необходимости поправьте
        const FIMG = [1088, 1450];
        const FHOLE = [545, 690];   // центр чёрной ямы
        // путь кубика по конвейеру: начало у станка → изгиб → край ямы (левые станки сверху вниз)
        const FBELTS_L = [
            [[255, 478], [335, 505], [415, 573]],
            [[262, 612], [322, 625], [372, 648]],
            [[268, 745], [325, 745], [378, 738]],
            [[270, 905], [345, 880], [432, 803]]
        ];
        // правые конвейеры — зеркальное отражение левых
        const FBELTS = FBELTS_L.concat(FBELTS_L.map(b => b.map(q => [FIMG[0] - q[0], q[1]])));
        // центры станков (% от картинки)
        const FGEN_POS = [[16.1, 31.0], [15.6, 41.7], [15.2, 51.9], [14.7, 63.1]];
        const FGEN_DEFS = FGEN_POS.map(q => ({ x: q[0], y: q[1] })).concat(FGEN_POS.map(q => ({ x: 100 - q[0], y: q[1] })));

        const facCubesLayer = $('fac-cubes');
        const fview = { flying: [], gens: [], lastRender: 0 };

        const facCover = skill => Math.ceil(skill / 10);                    // сколько генераторов обслуживает ремонтник
        const facSalary = skill => FAC_SALARY[Math.ceil(skill / 10) - 1];   // зарплата в час

        // какие генераторы обслуживаются ремонтниками (первые K открытых)
        function factoryCovered(f) {
            let k = f.workers.reduce((sum, sk) => sum + facCover(sk), 0);
            const set = new Set();
            f.gens.forEach((g, i) => { if (g.owned && k > 0) { set.add(i); k--; } });
            return set;
        }

        function chargeMoney(n) {
            dollarCount = round2(dollarCount - n);   // баланс может уходить в минус
            if (window.yetiTrack) window.yetiTrack('moneySpent', n);
            renderResources();
            updatePriceColors();
        }

        // Продвигает завод от времени from до to: вода, ресурс, ремонт, кубики и зарплаты.
        // Работает одинаково и онлайн, и после долгого отсутствия.
        function factoryAdvance(f, from, to) {
            const out = { cubes: [0, 0, 0, 0, 0, 0, 0, 0], salary: 0 };
            if (to <= from) { f.lastT = Math.max(f.lastT, to); return out; }
            const covered = factoryCovered(f);
            let t = from, guard = 0;
            while (t < to && guard++ < 20000) {
                f.gens.forEach((g, i) => {
                    if (!g.owned) return;
                    if (g.repairEnd && t >= g.repairEnd) { g.res = FAC_RES_MS; g.repairEnd = 0; }
                    // обслуживаемый генератор ремонтируется сам и бесплатно
                    if (!g.repairEnd && g.res <= 0 && covered.has(i)) g.repairEnd = t + FAC_REPAIR_MS;
                });
                const running = f.gens.filter(g => g.owned && !g.repairEnd && g.res > 0);
                const waterOn = f.water > 0;
                let step = to - t;
                if (running.length && waterOn) {
                    step = Math.min(step, f.water / (running.length * FAC_WATER_PER_MS));
                    running.forEach(g => { step = Math.min(step, g.res); });
                }
                f.gens.forEach(g => { if (g.owned && g.repairEnd) step = Math.min(step, g.repairEnd - t); });
                step = Math.min(Math.max(step, 1), to - t);
                if (running.length && waterOn) {
                    f.water = Math.max(0, f.water - running.length * FAC_WATER_PER_MS * step);
                    running.forEach(g => {
                        g.res -= step;
                        g.acc += step;
                        const n = Math.floor(g.acc / FAC_CUBE_MS);
                        if (n) { g.acc -= n * FAC_CUBE_MS; out.cubes[g.index] += n; }
                    });
                }
                t += step;
            }
            // зарплаты: каждый час, независимо от работы завода
            if (f.workers.length) {
                if (to >= f.salaryAt) {
                    const n = Math.floor((to - f.salaryAt) / 3600000) + 1;
                    out.salary = n * f.workers.reduce((sum, sk) => sum + facSalary(sk), 0);
                    f.salaryAt += n * 3600000;
                }
            } else {
                f.salaryAt = to + 3600000;
            }
            f.lastT = to;
            return out;
        }

        function updateFactory(f, now) {
            const out = factoryAdvance(f, f.lastT, now);
            if (out.salary > 0) chargeMoney(out.salary);
            f.totalIce += out.cubes.reduce((a, b) => a + b, 0) * FAC_CUBE_VALUE;
            out.cubes.forEach((n, i) => {
                if (!n) return;
                if (farmVisible(f) && n <= 6) {
                    for (let k = 0; k < n; k++) spawnFlyingCube(i, k * 250, FAC_CUBE_VALUE);
                } else {
                    if (window.yetiTrack) window.yetiTrack('businessIce', n * FAC_CUBE_VALUE);
                    addIce(n * FAC_CUBE_VALUE);   // экран закрыт — лёд сразу на баланс
                }
            });
        }

        // кубик едет по конвейеру к яме и исчезает; лёд зачисляется, когда он упал в яму
        function spawnFlyingCube(i, delay, value) {
            const path = FBELTS[i].concat([FHOLE]);
            const pts = path.map(q => [q[0] / FIMG[0] * fW, q[1] / FIMG[1] * fH]);
            const seg = [0];
            let total = 0;
            for (let k = 1; k < pts.length; k++) {
                total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
                seg.push(total);
            }
            if (total <= 0) {
                if (window.yetiTrack) window.yetiTrack('businessIce', value);
                addIce(value);
                return;
            }
            const el = document.createElement('div');
            el.className = 'fcube';
            el.innerHTML = CUBE_SVG;
            el.style.left = pts[0][0] + 'px';
            el.style.top = pts[0][1] + 'px';
            facCubesLayer.appendChild(el);
            const rec = { el, value, done: false };
            fview.flying.push(rec);
            const last = pts.length - 1;
            const frames = pts.map((q, k) => ({
                transform: 'translate(calc(-50% + ' + (q[0] - pts[0][0]) + 'px), calc(-50% + ' + (q[1] - pts[0][1]) + 'px)) scale(' + (k === last ? 0.25 : 1) + ')',
                opacity: k === last ? 0.2 : 1,
                offset: seg[k] / total
            }));
            el.animate(frames, { duration: FAC_TRAVEL_MS, delay, easing: 'linear', fill: 'both' }).onfinish = () => finishFlying(rec);
        }

        function finishFlying(rec) {
            if (rec.done) return;
            rec.done = true;
            rec.el.remove();
            if (window.yetiTrack) window.yetiTrack('businessIce', rec.value);
            addIce(rec.value);
            const idx = fview.flying.indexOf(rec);
            if (idx >= 0) fview.flying.splice(idx, 1);
        }

        function clearFactoryView() {
            fview.flying.slice().forEach(finishFlying);   // летящие кубики засчитываем
            facCubesLayer.innerHTML = '';
        }

        // --- интерфейс завода ---
        FGEN_DEFS.forEach((d, i) => {
            const el = document.createElement('div');
            el.className = 'fgen';
            el.style.left = d.x + '%';
            el.style.top = d.y + '%';
            el.innerHTML =
                '<div class="fg-dim"></div>' +
                '<div class="lock-box">' + LOCK_SVG + '<div class="price">$' + fmt(FAC_GEN_PRICE) + '</div></div>' +
                '<div class="fg-badge"></div><div class="fg-bar"><div></div></div><div class="fg-repair"></div>';
            factoryMap.appendChild(el);
            const v = {
                el, lockBox: el.querySelector('.lock-box'), priceEl: el.querySelector('.lock-box .price'),
                badge: el.querySelector('.fg-badge'), barFill: el.querySelector('.fg-bar > div'),
                repair: el.querySelector('.fg-repair')
            };
            v.lockBox.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'factory') buyGen(viewFarm, i); });
            v.repair.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'factory') repairGen(viewFarm, i); });
            fview.gens.push(v);
        });

        const fwPanel = document.createElement('div');
        fwPanel.className = 'fw-panel';
        fwPanel.innerHTML =
            '<div class="fw-title"><span>💧</span><span id="fw-text">0 / 40 000 л</span></div>' +
            '<div class="fw-bar"><div id="fw-fill"></div></div>' +
            '<div class="fw-btns"><button data-add="5000"></button><button data-add="20000"></button><button data-add="full"></button></div>' +
            '<button class="fw-up" id="fw-up"></button>';
        factoryMap.appendChild(fwPanel);
        const fwTitle = fwPanel.querySelector('.fw-title');
        const fwText = fwPanel.querySelector('#fw-text');
        const fwFill = fwPanel.querySelector('#fw-fill');
        const fwBtns = Array.from(fwPanel.querySelectorAll('.fw-btns button'));
        const fwUp = fwPanel.querySelector('#fw-up');
        fwBtns.forEach(b => b.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'factory') buyWater(viewFarm, b.dataset.add); }));
        fwUp.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'factory') upgradeTank(viewFarm); });

        const fsCard = document.createElement('div');
        fsCard.className = 'fs-card';
        factoryMap.appendChild(fsCard);
        fsCard.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'factory') openFacModal('stats'); });

        const fhHit = document.createElement('div');
        fhHit.className = 'fh-hit';
        factoryMap.appendChild(fhHit);
        const fhBadge = document.createElement('div');
        fhBadge.className = 'fh-badge';
        factoryMap.appendChild(fhBadge);
        const openWorkers = () => { if (viewFarm && viewFarm.type === 'factory') openFacModal('workers'); };
        fhHit.addEventListener('click', openWorkers);
        fhBadge.addEventListener('click', openWorkers);

        function genStatus(f, g) {
            if (!g.owned) return 'locked';
            if (g.repairEnd) return 'repair';
            if (g.res <= 0) return 'broken';
            if (f.water <= 0) return 'nowater';
            return 'run';
        }

        const repairCost = g => round2((FAC_RES_MS - g.res) / 3600000 * FAC_REPAIR_PER_HOUR);

        // показатели в час для открытой фермы
        function factoryStats(f) {
            const covered = factoryCovered(f);
            const run = f.water > 0 ? f.gens.filter(g => g.owned && !g.repairEnd && g.res > 0).length : 0;
            const ice = run * (3600000 / FAC_CUBE_MS) * FAC_CUBE_VALUE;
            const price = priceAt(Date.now());
            const revenue = ice * price;
            const water = run * 100 * FAC_WATER_PRICE;
            const uncovered = f.gens.filter((g, i) => g.owned && !covered.has(i)).length;
            const repair = uncovered * FAC_REPAIR_PER_HOUR;
            const salary = f.workers.reduce((sum, sk) => sum + facSalary(sk), 0);
            return { run, ice, price, revenue, water, repair, salary, profit: revenue - water - repair - salary };
        }

        function renderFactory(f) {
            const covered = factoryCovered(f);
            const now = Date.now();
            // генераторы
            fview.gens.forEach((v, i) => {
                const g = f.gens[i];
                const st = genStatus(f, g);
                v.el.classList.toggle('owned', g.owned);
                v.el.classList.toggle('uncovered', g.owned && !covered.has(i));
                v.el.classList.toggle('broken', st === 'broken');
                if (!g.owned) {
                    v.priceEl.classList.toggle('poor', dollarCount < FAC_GEN_PRICE);
                    return;
                }
                const icons = { run: '⚙️', nowater: '💧', repair: '🔧', broken: '⛔' };
                v.badge.innerText = icons[st];
                v.badge.className = 'fg-badge ' + st;
                const pct = Math.max(0, Math.min(100, g.res / FAC_RES_MS * 100));
                v.barFill.style.width = pct + '%';
                v.barFill.style.background = pct > 50 ? '#4ade80' : (pct > 20 ? '#fbbf24' : '#ef4444');
                if (st === 'broken') {
                    const cost = repairCost(g);
                    v.repair.innerHTML = 'Ремонт $' + fmtMoney(cost);
                    v.repair.classList.toggle('poor', dollarCount < cost);
                }
            });
            // резервуар
            const cap = FAC_TANK[f.tank];
            fwText.innerText = fmt(f.water) + ' / ' + fmt(cap) + ' л';
            fwTitle.classList.toggle('empty', f.water <= 0);
            fwFill.style.width = Math.min(100, f.water / cap * 100) + '%';
            const space = cap - f.water;
            fwBtns.forEach(b => {
                const amount = b.dataset.add === 'full' ? Math.floor(space) : Math.min(parseInt(b.dataset.add, 10), Math.floor(space));
                const cost = amount * FAC_WATER_PRICE;
                b.innerHTML = (b.dataset.add === 'full' ? 'Заполнить' : '+' + fmt(parseInt(b.dataset.add, 10)) + ' л') +
                    '<span>$' + fmt(cost) + '</span>';
                b.disabled = amount <= 0;
                b.classList.toggle('poor', dollarCount < cost);
            });
            if (f.tank >= FAC_TANK.length - 1) {
                fwUp.classList.add('max');
            } else {
                fwUp.classList.remove('max');
                const price = FAC_TANK_UP[f.tank + 1];
                fwUp.innerHTML = 'Улучшить до ' + fmt(FAC_TANK[f.tank + 1]) + ' л<span>$' + fmt(price) + '</span>';
                fwUp.classList.toggle('poor', dollarCount < price);
            }
            // сводка и домик ремонтников
            const st = factoryStats(f);
            fsCard.innerHTML =
                'Лёд: <b>' + fmt(st.ice) + '/ч</b><br>' +
                'Выручка: <b>$' + fmt(st.revenue) + '/ч</b><br>' +
                'Расходы: <b class="bad">-$' + fmt(st.water + st.repair + st.salary) + '/ч</b><br>' +
                'Прибыль: <b class="' + (st.profit >= 0 ? 'good' : 'bad') + '">' + (st.profit < 0 ? '-' : '') + '$' + fmt(Math.abs(st.profit)) + '/ч</b>';
            fhBadge.innerText = '🛠 Ремонтники: ' + f.workers.length;
            if (facModalOpen && facModalType === 'stats') renderFacModal(f);
        }

        // --- покупки и действия ---
        function buyGen(f, i) {
            const g = f.gens[i];
            if (g.owned) return;
            if (dollarCount < FAC_GEN_PRICE) { denyFlash(fview.gens[i].lockBox); denyFlash(uiDollarBox); return; }
            spendDollars(FAC_GEN_PRICE);
            if (window.yetiTrack) window.yetiTrack('upgrade', FAC_GEN_PRICE);
            g.owned = true;
            g.res = FAC_RES_MS;
            g.acc = 0;
            g.repairEnd = 0;
            renderFactory(f);
            saveState();
        }

        function repairGen(f, i) {
            const g = f.gens[i];
            if (!g.owned || g.repairEnd) return;
            const cost = repairCost(g);
            if (dollarCount < cost) { denyFlash(fview.gens[i].repair); denyFlash(uiDollarBox); return; }
            spendDollars(cost);
            g.repairEnd = Date.now() + FAC_REPAIR_MS;
            renderFactory(f);
            saveState();
        }

        function buyWater(f, what) {
            const space = Math.floor(FAC_TANK[f.tank] - f.water);
            const amount = what === 'full' ? space : Math.min(parseInt(what, 10), space);
            if (amount <= 0) return;
            const cost = amount * FAC_WATER_PRICE;
            if (dollarCount < cost) { denyFlash(uiDollarBox); toast('Не хватает денег на воду'); return; }
            spendDollars(cost);
            f.water = Math.min(FAC_TANK[f.tank], f.water + amount);
            renderFactory(f);
            saveState();
        }

        function upgradeTank(f) {
            if (f.tank >= FAC_TANK.length - 1) return;
            const price = FAC_TANK_UP[f.tank + 1];
            if (dollarCount < price) { denyFlash(fwUp); denyFlash(uiDollarBox); return; }
            spendDollars(price);
            if (window.yetiTrack) window.yetiTrack('upgrade', price);
            f.tank++;
            renderFactory(f);
            saveState();
        }

        function randomSkill() {
            let r = Math.random() * 100, d = 0;
            for (let k = 0; k < FAC_PROB.length; k++) {
                r -= FAC_PROB[k];
                if (r < 0) { d = k; break; }
                d = k;
            }
            return d * 10 + 1 + Math.floor(Math.random() * 10);   // навык внутри десятка
        }

        function hireWorker(f) {
            if (dollarCount < FAC_HIRE) { denyFlash(uiDollarBox); toast('Не хватает денег на найм'); return; }
            spendDollars(FAC_HIRE);
            if (window.yetiTrack) window.yetiTrack('hire', 1);
            if (!f.workers.length) f.salaryAt = Date.now() + 3600000;
            const skill = randomSkill();
            f.workers.push(skill);
            toast('Навык ' + skill + ': обслуживает ' + facCover(skill) + ' ген.');
            renderFactory(f);
            renderFacModal(f);
            saveState();
        }

        function fireWorker(f, idx) {
            f.workers.splice(idx, 1);
            renderFactory(f);
            renderFacModal(f);
            saveState();
        }

        // --- окно: ремонтники / подробная статистика ---
        const facModal = $('fac-modal');
        const fmBody = $('fm-body');
        let facModalOpen = false, facModalType = '';

        function openFacModal(type) {
            facModalType = type;
            facModalOpen = true;
            facModal.classList.add('show');
            renderFacModal(viewFarm);
        }
        function closeFacModal() {
            facModalOpen = false;
            facModal.classList.remove('show');
        }
        $('fm-close').addEventListener('click', closeFacModal);
        facModal.addEventListener('pointerdown', (e) => { if (e.target === facModal) closeFacModal(); });

        function renderFacModal(f) {
            if (!facModalOpen || !f || f.type !== 'factory') return;
            const scroll = fmBody.scrollTop;
            if (facModalType === 'workers') {
                $('fm-title').innerText = 'Ремонтники';
                const covered = f.workers.reduce((sum, sk) => sum + facCover(sk), 0);
                let html = '<div class="fm-sub">Найм $' + fmt(FAC_HIRE) + ' · навык 1–80 случайный и не меняется · увольнение бесплатно. ' +
                    'Обслуживают ' + Math.min(8, covered) + ' из ' + f.gens.filter(g => g.owned).length + ' открытых генераторов.</div>';
                html += '<button class="fm-btn' + (dollarCount < FAC_HIRE ? ' poor' : '') + '" id="fm-hire">Нанять · $' + fmt(FAC_HIRE) + '</button>';
                f.workers.forEach((sk, idx) => {
                    html += '<div class="fm-worker"><div>Навык <b>' + sk + '</b><br>генераторов: ' + facCover(sk) + ' · $' + fmt(facSalary(sk)) + '/ч</div>' +
                        '<button class="fire" data-fire="' + idx + '">Уволить</button></div>';
                });
                if (!f.workers.length) html += '<div class="fm-sub">Пока никого нет. Генераторы чините вручную.</div>';
                fmBody.innerHTML = html;
                $('fm-hire').addEventListener('click', () => hireWorker(f));
                fmBody.querySelectorAll('[data-fire]').forEach(b => b.addEventListener('click', () => fireWorker(f, parseInt(b.dataset.fire, 10))));
            } else {
                $('fm-title').innerText = 'Ледозавод: в час';
                const st = factoryStats(f);
                const line = (name, val, cls) => '<div class="fm-line"><span>' + name + '</span><b class="' + (cls || '') + '">' + val + '</b></div>';
                fmBody.innerHTML =
                    line('Работает генераторов', st.run + ' из ' + f.gens.filter(g => g.owned).length) +
                    line('Производство льда', fmt(st.ice) + '/ч') +
                    line('Курс льда сейчас', '$' + st.price.toFixed(2).replace('.', ',')) +
                    line('Выручка', '$' + fmt(st.revenue) + '/ч') +
                    line('Вода (расход ' + fmt(st.run * 100) + ' л/ч)', '-$' + fmt(st.water) + '/ч', 'bad') +
                    line('Ремонт без ремонтников (в среднем)', '-$' + fmt(st.repair) + '/ч', 'bad') +
                    line('Зарплаты ремонтникам', '-$' + fmt(st.salary) + '/ч', 'bad') +
                    line('Итого', (st.profit < 0 ? '-' : '') + '$' + fmt(Math.abs(st.profit)) + '/ч', st.profit >= 0 ? 'good' : 'bad') +
                    '<div class="fm-sub">Зарплаты списываются каждый час, даже если завод стоит. Баланс может уходить в минус.</div>';
            }
            fmBody.scrollTop = scroll;
        }

        // ---------- Статистика и закрытие бизнеса (шестерёнка) ----------
        const CLOSE_RATE = 0.3;   // при закрытии возвращается 30% капитализации

        // Капитализация: разовые вложения (открытие + оборудование и улучшения),
        // без периодических расходов (вода, ремонт, зарплаты, найм ремонтников)
        function farmCapital(f) {
            const open = farmType(f.type).price;
            let up = 0;
            if (f.type === 'snow') {
                f.cannons.forEach((c, i) => { if (c.owned) up += CANNON_PRICES[i]; });
                if (f.foreman) up += FOREMAN_PRICE;
            } else if (f.type === 'cutter') {
                f.workers.forEach((w, i) => {
                    if (w.owned) up += HIRE_PRICES[i];
                    if (w.owned && w.saw) up += SAW_PRICES[i];
                });
                if (f.foreman) up += C_FOREMAN_PRICE;
                for (let k = 0; k < f.limitLevel; k++) up += LIMIT_PRICES[k];
            } else if (f.type === 'factory') {
                f.gens.forEach(g => { if (g.owned) up += FAC_GEN_PRICE; });
                for (let k = 1; k <= f.tank; k++) up += FAC_TANK_UP[k];
            }
            return { open, upgrades: up, total: open + up };
        }

        const bizModal = $('biz-modal');
        const bmBody = $('bm-body');
        let bizOpen = false, bizArmed = false, bizTimer = null;

        function openBizModal() {
            if (!viewFarm) return;
            bizOpen = true;
            bizArmed = false;
            renderBizModal(viewFarm);
            bizModal.classList.add('show');
        }
        function closeBizModal() {
            bizOpen = false;
            bizArmed = false;
            clearTimeout(bizTimer);
            bizModal.classList.remove('show');
        }
        $('farm-gear').addEventListener('click', openBizModal);
        $('bm-close').addEventListener('click', closeBizModal);
        bizModal.addEventListener('pointerdown', (e) => { if (e.target === bizModal) closeBizModal(); });

        const bizRateText = f => hubPassive(f) ? fmt(farmRate(f)) + '/ч' : '0/ч (только вручную)';
        const bizOpenedText = f => new Date(f.openedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
            ' (' + fmtDuration(Date.now() - f.openedAt) + ' назад)';

        function renderBizModal(f) {
            $('bm-title').innerText = farmType(f.type).name + ' №' + farmIndex(f);
            const cap = farmCapital(f);
            const payout = Math.round(cap.total * CLOSE_RATE);
            const line = (name, id) => '<div class="fm-line"><span>' + name + '</span><b id="' + id + '"></b></div>';
            bmBody.innerHTML =
                line('Добыча льда в час', 'bm-rate') +
                line('Лёд за всё время', 'bm-total') +
                line('Открыт', 'bm-opened') +
                line('Капитализация', 'bm-cap') +
                '<div class="fm-sub">Открытие $' + fmt(cap.open) + ' + оборудование и улучшения $' + fmt(cap.upgrades) +
                '. Без воды, ремонта и зарплат.</div>' +
                '<button class="fm-btn danger" id="bm-close-btn">Закрыть бизнес · +$' + fmt(payout) + '</button>' +
                '<div class="fm-sub">Вы получите 30% капитализации. Бизнес и все его улучшения исчезнут, слот освободится.</div>';
            updateBizModal(f);
            const btn = $('bm-close-btn');
            btn.addEventListener('click', () => {
                if (!bizArmed) {
                    bizArmed = true;
                    btn.classList.add('armed');
                    btn.innerText = 'Точно закрыть? +$' + fmt(payout);
                    bizTimer = setTimeout(() => {
                        bizArmed = false;
                        btn.classList.remove('armed');
                        btn.innerText = 'Закрыть бизнес · +$' + fmt(payout);
                    }, 3000);
                    return;
                }
                closeBusiness(f);
            });
        }

        function updateBizModal(f) {
            const set = (id, v) => { const el = $(id); if (el) el.innerText = v; };
            set('bm-rate', bizRateText(f));
            set('bm-total', fmt(f.totalIce));
            set('bm-opened', bizOpenedText(f));
            set('bm-cap', '$' + fmt(farmCapital(f).total));
        }
        setInterval(() => { if (bizOpen && viewFarm) updateBizModal(viewFarm); }, 1000);

        // Закрытие бизнеса: возвращается 30% капитализации, слот освобождается
        function closeBusiness(f) {
            const payout = Math.round(farmCapital(f).total * CLOSE_RATE);
            closeBizModal();
            showMineView('hub');                 // карта закрывается, летящие кубики засчитываются
            const i = farms.indexOf(f);
            if (i >= 0) farms.splice(i, 1);
            dollarCount = round2(dollarCount + payout);
            if (window.yetiTrack) window.yetiTrack('moneyEarned', payout);
            renderResources();
            updatePriceColors();
            renderHub();
            saveState();
            toast('Бизнес закрыт: +$' + fmt(payout));
        }

        // ---------- Оффлайн-прогресс (без ограничения по времени) ----------
        let lastTickAt = Date.now();

        function fmtDuration(ms) {
            const m = Math.floor(ms / 60000);
            const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
            const out = [];
            if (d) out.push(d + ' д');
            if (h) out.push(h + ' ч');
            if (mm || !out.length) out.push(mm + ' мин');
            return out.join(' ');
        }

        // Считает все фермы за прошедшее время. fromLoad — запуск игры (кучи берутся из сохранения)
        function applyOfflineAll(elapsed, fromLoad, options = {}) {
            const now = options.now || Date.now();
            const autoIce = options.includeAuto === false ? 0 : advanceAutoMining(now);
            let iceGained = 0, waiting = 0, facIce = 0, facSalary = 0;
            let anyActive = false, anyForeman = false, anyManual = false;

            farms.forEach(f => {
                if (f.type === 'factory') {
                    const hasAny = f.gens.some(g => g.owned) || f.workers.length > 0;
                    const out = factoryAdvance(f, f.lastT, now);
                    const cubes = out.cubes.reduce((a, b) => a + b, 0);
                    facIce += cubes * FAC_CUBE_VALUE;
                    f.totalIce += cubes * FAC_CUBE_VALUE;
                    facSalary += out.salary;
                    if (out.salary > 0) chargeMoney(out.salary);
                    if (hasAny) anyActive = true;
                    if (farmVisible(f)) renderFactory(f);
                    return;
                }
                if (f.type === 'cutter') {
                    const sawIdx = [];
                    f.workers.forEach((w, i) => { if (w.owned && w.saw) sawIdx.push(i); });
                    const per = Math.floor(elapsed / SAW_INTERVAL);          // кубиков на каждую пилу
                    const limit = cutterLimit(f);
                    const oldVals = f.cubeVals.slice();
                    const oldSum = oldVals.reduce((a, v) => a + v, 0);
                    const prodCount = per * sawIdx.length;
                    const prodSum = per * sawIdx.reduce((a, i) => a + SAW_CUBE[i], 0);
                    let gained = 0, rest = [];
                    if (f.foreman) {
                        const capacity = Math.floor(elapsed / FOREMAN_MS);   // прораб: кубик за 0.4 сек
                        const total = oldVals.length + prodCount;
                        if (total <= capacity) {
                            gained = oldSum + prodSum;
                        } else {
                            gained = Math.floor((oldSum + prodSum) * capacity / total);
                            rest = oldVals.slice(0, Math.min(limit, total - capacity));
                        }
                        if (sawIdx.length || gained) { anyActive = true; anyForeman = true; }
                    } else {
                        rest = oldVals.slice(0, limit);                       // лимит — нарезка стоит
                        for (let k = 0; k < prodCount && rest.length < limit; k++) rest.push(SAW_CUBE[sawIdx[k % sawIdx.length]]);
                        if (sawIdx.length) { anyActive = true; anyManual = true; waiting += rest.length; }
                    }
                    f.cubeVals = rest;
                    f.workers.forEach(w => { w.nextAt = now + SAW_INTERVAL; w.blocked = false; });
                    f.fNext = now + FOREMAN_MS;
                    iceGained += gained;
                    f.totalIce += gained;
                    if (farmVisible(f)) syncCutterView(f);
                    return;
                }

                const p0 = fromLoad ? f.savedPiles : f.piles.length;
                f.piles.forEach(p => { if (p.el) p.el.remove(); p.el = null; });
                f.piles.length = 0;
                f.fTask = null;
                f.fLast = 0;
                f.savedPiles = 0;
                if (farmVisible(f)) pilesLayer.innerHTML = '';

                const active = f.cannons.filter(c => c.owned);
                const n = active.length;
                const produced = Math.floor(n * elapsed / CANNON_INTERVAL);

                let collected = 0, remaining;
                if (f.foreman) {
                    const capacity = Math.floor(elapsed / HOLD_TIME); // прораб убирает кучу за 1.5 сек
                    collected = Math.min(p0 + produced, capacity);
                    remaining = Math.min(MAX_PILES, p0 + produced - collected);
                    if (n) { anyActive = true; anyForeman = true; }
                } else {
                    remaining = Math.min(MAX_PILES, p0 + produced); // карта заполнилась — пушки простаивают
                    if (n) { anyActive = true; anyManual = true; waiting += remaining; }
                }

                for (let i = 0; i < remaining; i++) {
                    const free = freeCells(f);
                    if (!free.length) break;
                    createPile(f, free[Math.floor(Math.random() * free.length)], null);
                }

                // таймеры пушек начинаются заново, чтобы не было двойного счёта
                active.forEach(c => { c.nextAt = now + CANNON_INTERVAL; c.blocked = false; });
                iceGained += collected * ICE_PER_PILE;
                f.totalIce += collected * ICE_PER_PILE;
            });

            if (iceGained > 0) {
                if (window.yetiTrack) window.yetiTrack('businessIce', iceGained);
                addIce(iceGained);
            }
            if (facIce > 0) {
                if (window.yetiTrack) window.yetiTrack('businessIce', facIce);
                addIce(facIce);
            }
            saveState();

            if (options.showReport !== false && elapsed >= 60000 && (anyActive || autoIce > 0)) {
                const lines = [];
                if (anyForeman) lines.push('Прорабы собрали лёд: +' + fmt(iceGained));
                if (anyManual) lines.push('Без прораба ждёт сбора: ' + fmt(waiting) + ' шт.');
                if (facIce > 0) lines.push('Ледозавод произвёл: +' + fmt(facIce) + ' льда');
                if (facSalary > 0) lines.push('Зарплаты ремонтникам: -$' + fmtMoney(facSalary));
                if (autoIce > 0) lines.push('Автомайнер добыл: +' + fmt(autoIce) + ' льда');
                showOfflinePopup(elapsed, lines);
            }
            return { iceGained, facIce, facSalary, waiting, autoIce, anyActive };
        }

        function rewindBusinessClocks(duration, actualNow) {
            farms.forEach(f => {
                if (f.type === 'factory') {
                    f.lastT -= duration;
                    f.salaryAt -= duration;
                    f.gens.forEach(g => { if (g.repairEnd) g.repairEnd -= duration; });
                } else if (f.type === 'cutter') {
                    f.fNext -= duration;
                    f.workers.forEach(w => { w.nextAt -= duration; });
                } else {
                    f.cannons.forEach(c => { if (c.owned) c.nextAt -= duration; });
                }
            });
            lastTickAt = actualNow;
            saveState();
        }

        function buyShopProduct(product) {
            if (dollarCount < product.price) {
                denyFlash(uiDollarBox);
                toast('Не хватает долларов');
                return;
            }
            const now = Date.now();
            if (product.kind === 'time') {
                spendDollars(product.price);
                const result = applyOfflineAll(product.duration, false, {
                    now: now + product.duration, includeAuto: false, showReport: false
                });
                rewindBusinessClocks(product.duration, now);
                const gained = result.iceGained + result.facIce;
                toast(gained > 0
                    ? 'Рассчитано ' + (product.duration / 3600000) + ' ч · +' + fmt(gained) + ' льда'
                    : 'Период рассчитан · предприятия не произвели лёд');
                renderHub();
            } else if (product.kind === 'auto') {
                advanceAutoMining(now);
                spendDollars(product.price);
                autoMinerUntil = Math.max(now, autoMinerUntil) + product.duration;
                autoMinerImage = product.image;
                autoMinerLastAt = now;
                syncMinerVisual();
                toast('Автомайнер запущен: ' + shopCountdown(autoMinerUntil - now));
                saveState();
            } else if (product.kind === 'boost') {
                advanceAutoMining(now);
                spendDollars(product.price);
                if (boostUntil > now && boostMultiplier === product.multiplier) {
                    boostUntil += product.duration;
                } else {
                    boostMultiplier = product.multiplier;
                    boostUntil = now + product.duration;
                }
                toast('Добыча ×' + product.multiplier + ' на ' + product.durationLabel);
                saveState();
            }
            updateShopStatus();
            if (shopCategoryId) renderShopCarousel();
        }

        const offlinePopup = $('offline-popup');
        $('offline-ok').addEventListener('click', () => offlinePopup.classList.remove('show'));

        function showOfflinePopup(elapsed, lines) {
            $('offline-time').innerText = 'Вас не было: ' + fmtDuration(elapsed);
            $('offline-lines').innerHTML = lines.join('<br>');
            offlinePopup.classList.add('show');
        }

        // ---------- Главный цикл ----------
        function tick() {
            const now = Date.now();
            // Если страницу «заморозили» (свернули приложение, фон) — досчитываем пропущенное время
            if (now - lastTickAt > 5000) {
                const gap = now - lastTickAt;
                lastTickAt = now;
                applyOfflineAll(gap, false);
                return;
            }
            lastTickAt = now;
            advanceAutoMining(now);
            farms.forEach(f => {
                if (f.type === 'factory') { updateFactory(f, now); return; }
                if (f.type === 'cutter') { updateCutter(f, now); return; }
                updateCannons(f, now);
                updateGrowth(f, now);
                updatePlayerHolds(f, now);
                updateForeman(f, now);
            });
        }

        let lastFx = Date.now();
        let lastTickRun = 0;
        function renderBars() {
            const now = Date.now();
            const dt = Math.min(100, now - lastFx);
            lastFx = now;
            if (farmDomAttached && viewFarm) {
                for (const p of viewFarm.piles) {
                    if (p.holder && p.bar) {
                        const k = clamp01((now - p.startAt) / HOLD_TIME);
                        p.bar.style.width = (k * 100) + '%';
                    }
                }
            }
            if (farmDomAttached && viewFarm && viewFarm.type === 'factory' && now - fview.lastRender > 250) {
                fview.lastRender = now;
                renderFactory(viewFarm);
            }
            if (now - lastTickRun >= 100) { lastTickRun = now; tick(); }   // логика не чаще 10 раз в секунду
            renderFx(now, dt);
            requestAnimationFrame(renderBars);
        }
        requestAnimationFrame(renderBars);
        // запасной таймер: фермы работают, даже когда вкладка браузера в фоне
        setInterval(tick, 500);

        // Оффлайн-прогресс после закрытия игры
        if (savedAtLoaded) applyOfflineAll(Math.max(0, Date.now() - savedAtLoaded), true);
        lastTickAt = Date.now();
        updatePriceColors();

        // Ловим отпускание пальца/мыши вне кучи
        const releaseHeld = (e) => {
            if (farmDomAttached && viewFarm) {
                viewFarm.piles.forEach(p => { if (p.holder === 'player' && p.pointerId === e.pointerId) releasePile(p); });
            }
        };
        window.addEventListener('pointerup', releaseHeld);
        window.addEventListener('pointercancel', releaseHeld);

        // Запрет контекстного меню (долгое нажатие на телефоне)
        document.addEventListener('contextmenu', e => e.preventDefault());
