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
