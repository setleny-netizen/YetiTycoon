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
