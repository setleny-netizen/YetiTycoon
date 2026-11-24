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
