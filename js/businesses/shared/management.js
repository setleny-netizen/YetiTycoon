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
                for (let k = 0; k < f.legacyLimitLevel; k++) up += LEGACY_CUTTER_LIMIT_PRICES[k];
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
        const bizOpenedText = f => new Date(f.openedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
