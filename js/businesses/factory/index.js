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
            f.totalIce += out.cubes.reduce((a, b) => a + b, 0) * FAC_CUBE_VALUE * productionMultiplier();
            out.cubes.forEach((n, i) => {
                if (!n) return;
                if (farmVisible(f) && n <= 6) {
                    for (let k = 0; k < n; k++) spawnFlyingCube(i, k * 250, FAC_CUBE_VALUE * productionMultiplier());
                } else {
                    if (window.yetiTrack) window.yetiTrack('businessIce', n * FAC_CUBE_VALUE * productionMultiplier());
                    addIce(n * FAC_CUBE_VALUE * productionMultiplier());   // экран закрыт — лёд сразу на баланс
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
