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
