        // ---------- Переключение видов вкладки «Добыча» ----------
        const mineViews = { hub: $('mine-hub'), build: $('mine-build'), farm: $('mine-farm') };

        function showMineView(view, farm) {
            if (farmDomAttached) detachFarmDom();
            openTip = null;
            mineView = view;
            viewFarm = view === 'farm' ? (farm || viewFarm) : null;
            Object.keys(mineViews).forEach(k => mineViews[k].classList.toggle('hidden', k !== view));
            refreshMine();
        }

        // Показывает/прячет карту фермы в зависимости от текущей вкладки и вида
        function refreshMine() {
            const should = currentTab === 'mining' && mineView === 'farm' && !!viewFarm;
            if (should && !farmDomAttached) attachFarmDom();
            else if (!should && farmDomAttached) detachFarmDom();
            if (currentTab === 'mining') {
                if (mineView === 'hub') renderHub();
                else if (mineView === 'build') renderBuild();
            }
        }

        function attachFarmDom() {
            const f = viewFarm;
            mapArea.classList.toggle('hidden', f.type !== 'snow');
            cutterArea.classList.toggle('hidden', f.type !== 'cutter');
            factoryArea.classList.toggle('hidden', f.type !== 'factory');
            fitMap();
            farmDomAttached = true;
            $('farm-title').innerText = farmType(f.type).name + ' №' + farmIndex(f);
            if (f.type === 'cutter') {
                syncCutterView(f);
                updatePriceColors();
                return;
            }
            if (f.type === 'factory') {
                renderFactory(f);
                return;
            }
            cannonViews.forEach((v, i) => {
                const c = f.cannons[i];
                v.slot.classList.toggle('unlocked', c.owned);
                v.cannonEl.classList.toggle('idle', c.blocked);
            });
            foremanEl.classList.toggle('locked', !f.foreman);
            foremanEl.classList.toggle('working', !!f.fTask);
            foremanLock.classList.toggle('show', !f.foreman);
            updateForemanRate();
            f.piles.forEach(attachPileView);
            updatePriceColors();
        }

        function detachFarmDom() {
            if (viewFarm) viewFarm.piles.forEach(p => { releasePile(p); p.el = null; p.body = null; p.bar = null; });
            pilesLayer.innerHTML = '';
            parts.length = 0;
            streams.length = 0;
            clearCutterView();
            clearFactoryView();
            closeFacModal();
            closeBizModal();
            farmDomAttached = false;
        }
