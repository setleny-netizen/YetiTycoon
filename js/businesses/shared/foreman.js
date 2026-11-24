        // ---------- Прораб ----------
        const foremanEl = document.createElement('div');
        foremanEl.id = 'foreman';
        foremanEl.className = 'locked';
        foremanEl.innerHTML = '<img id="foreman-img" data-src="prorab" alt="" draggable="false">';
        lazyAll(foremanEl);
        map.appendChild(foremanEl);

        const foremanLock = document.createElement('div');
        foremanLock.id = 'foreman-lock';
        foremanLock.innerHTML = LOCK_SVG + '<div class="price">$' + fmt(FOREMAN_PRICE) + '</div>';
        map.appendChild(foremanLock);

        const foremanRateEl = document.createElement('div');
        foremanRateEl.id = 'foreman-rate';
        foremanRateEl.innerHTML = '<div class="ico"></div><div class="txt">0/ч</div>';
        map.appendChild(foremanRateEl);
        const foremanRateTxt = foremanRateEl.querySelector('.txt');

        function updateForemanRate() {
            if (farmDomAttached && viewFarm && viewFarm.foreman) {
                foremanRateTxt.innerText = fmt(farmRate(viewFarm)) + '/ч';
                foremanRateEl.classList.add('show');
            } else {
                foremanRateEl.classList.remove('show');
            }
        }

        function buyForeman(f) {
            if (f.foreman) return;
            if (dollarCount < FOREMAN_PRICE) {
                denyFlash(foremanLock);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(FOREMAN_PRICE);
            if (window.yetiTrack) window.yetiTrack('upgrade', FOREMAN_PRICE);
            f.foreman = true;
            foremanEl.classList.remove('locked');
            foremanLock.classList.remove('show');
            updateForemanRate();
            saveState();
        }
        foremanLock.addEventListener('click', () => { if (viewFarm) buyForeman(viewFarm); });

        // Цены краснеют, если не хватает денег; хаб и выбор вида перерисовываются
        function updatePriceColors() {
            if (farmDomAttached && viewFarm && viewFarm.type === 'cutter') updateCutterPrices(viewFarm);
            if (farmDomAttached && viewFarm && viewFarm.type === 'factory') renderFactory(viewFarm);
            if (farmDomAttached && viewFarm && viewFarm.type === 'snow') {
                cannonViews.forEach((v, i) => {
                    if (!viewFarm.cannons[i].owned) v.priceEl.classList.toggle('poor', dollarCount < CANNON_PRICES[i]);
                });
                if (!viewFarm.foreman) foremanLock.querySelector('.price').classList.toggle('poor', dollarCount < FOREMAN_PRICE);
            }
            if (currentTab === 'mining') {
                if (mineView === 'hub') renderHub();
                else if (mineView === 'build') renderBuild();
            }
        }
