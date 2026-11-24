        // ---------- Хаб: общая добыча и список слотов ----------
        const hubRateVal = $('hub-rate');
        const hubCount = $('hub-count');
        const hubList = $('hub-list');
        const hubBuild = $('hub-build');
        const hubPageLabel = $('hub-page-label');
        let hubPage = 0;

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
            const unlockedSlots = availableBusinessSlots();
            hubRateVal.innerText = fmt(totalRate());
            hubCount.innerText = farms.length + '/' + unlockedSlots;
            hubBuild.classList.toggle('disabled', farms.length >= unlockedSlots);
            hubPageLabel.textContent = 'Страница ' + (hubPage + 1) + ' из 2';
            $('hub-page-prev').disabled = hubPage === 0;
            $('hub-page-next').disabled = hubPage === 1;
            hubList.innerHTML = '';

            for (let i = hubPage * 4; i < Math.min(SLOT_MAX, hubPage * 4 + 4); i++) {
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
                } else if (i < unlockedSlots) {
                    card.className = 'slot-card empty';
                    card.innerHTML =
                        '<div class="slot-ico">+</div>' +
                        '<div class="slot-main"><div class="slot-name">Свободный слот</div>' +
                        '<div class="slot-sub">Нажмите, чтобы построить ферму</div></div>';
                    card.addEventListener('click', () => showMineView('build'));
                } else {
                    const n = i + 1;
                    card.className = 'slot-card locked';
                    card.innerHTML =
                        '<div class="slot-ico">' + LOCK_SVG.replace('class="lock-icon"', '') + '</div>' +
                        '<div class="slot-main"><div class="slot-name">Слот ' + n + '</div>' +
                        '<div class="slot-sub">Требуется VIP ' + Math.max(1, n - 3) + '</div></div>';
                }
                hubList.appendChild(card);
            }
        }

        $('hub-page-prev').addEventListener('click', () => {
            if (hubPage === 0) return;
            hubPage = 0;
            renderHub();
        });
        $('hub-page-next').addEventListener('click', () => {
            if (hubPage === 1) return;
            hubPage = 1;
            renderHub();
        });

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
            const unlockedSlots = availableBusinessSlots();
            if (farms.length >= unlockedSlots) {
                denyFlash(hubBuild);
                toast(unlockedSlots < SLOT_MAX ? 'Нет свободных слотов — улучшите VIP' : 'Нет свободных слотов');
                return;
            }
            showMineView('build');
        });
