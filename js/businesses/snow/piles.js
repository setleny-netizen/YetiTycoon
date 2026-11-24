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
                k: 1, born: now, life: strong ? 0.65 + Math.random() * 0.3 : 0.75 + Math.random() * 0.35,
                x: m.x, y: m.y,
                vx: def.side * U * (2 + Math.random() * 3.2),
                vy: -U * (0.7 + Math.random() * 2.3),
                r: U * (1.25 + Math.random() * 1.1),
                a: strong ? 0.68 : 0.38
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
                    c.mistAcc = (c.mistAcc || 0) + dt * 0.009;
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
            const amount = ICE_PER_PILE * productionMultiplier();
            f.totalIce += amount;
            if (window.yetiTrack) window.yetiTrack('businessIce', amount);

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
                for (let i = 0; i < amount; i++) {
                    setTimeout(() => flyIce(sx, sy, () => addIce(1), 70), i * 45);
                }
            } else {
                if (p.el) p.el.remove();
                addIce(ICE_PER_PILE);
            }
            p.el = null;
        }
