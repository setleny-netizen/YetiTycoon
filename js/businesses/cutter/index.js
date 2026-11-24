        // ---------- Ферма «Ледорез» ----------
        const CUBE_SVG = '<svg viewBox="0 0 40 44"><polygon points="20,2 38,12 20,22 2,12" fill="#e6f7ff"/><polygon points="2,12 20,22 20,42 2,32" fill="#7fd0f5"/><polygon points="38,12 20,22 20,42 38,32" fill="#4fb3e8"/><path d="M20 22V42M2 12L20 22L38 12" stroke="rgba(255,255,255,0.75)" stroke-width="1.2" fill="none"/><polygon points="20,2 38,12 38,32 20,42 2,32 2,12" fill="none" stroke="#2b8fd0" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 15L14 18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/></svg>';

        // центры рабочих мест йети (% от карты озера)
        const CW_DEFS = [{ x: 24, y: 31 }, { x: 24, y: 53 }, { x: 24, y: 75 }];
        const cview = { field: [] };   // кубики, нарисованные на озере (для открытой фермы)

        const cutterLimit = () => CUTTER_CAPACITY;

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

        // счётчик несобранного льда
        const cCountEl = document.createElement('div');
        cCountEl.className = 'c-count';
            cCountEl.innerHTML = '<div class="ico"></div><div class="txt">0/80</div>';
            cutterMap.appendChild(cCountEl);

            cForeLock.addEventListener('click', () => { if (viewFarm && viewFarm.type === 'cutter') buyCForeman(viewFarm); });

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
            const v = f.cubeVals.shift() * productionMultiplier();
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
                    const val = f.cubeVals.splice(idx, 1)[0] * productionMultiplier();   // кубик на озере i — это cubeVals[i]
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
