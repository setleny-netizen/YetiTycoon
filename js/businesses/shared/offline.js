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
                    facIce += cubes * FAC_CUBE_VALUE * productionMultiplier();
                    f.totalIce += cubes * FAC_CUBE_VALUE * productionMultiplier();
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
                    const limit = CUTTER_CAPACITY;
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
                    iceGained += gained * productionMultiplier();
                    f.totalIce += gained * productionMultiplier();
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
                iceGained += collected * ICE_PER_PILE * productionMultiplier();
                f.totalIce += collected * ICE_PER_PILE * productionMultiplier();
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
            if (product.kind === 'auto') {
                advanceAutoMining(now);
                spendDollars(product.price);
                autoMinerUntil = Math.max(now, autoMinerUntil) + product.duration;
                autoMinerImage = product.image;
                autoMinerPaused = false;
                autoMinerLastAt = now;
                syncMinerVisual();
                toast('Автомайнер запущен: ' + shopCountdown(autoMinerUntil - now));
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
