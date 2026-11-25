        // ==========================================
        // 3. ВКЛАДКИ
        // ==========================================
        const screens = {
            bourse: document.getElementById('screen-bourse'),
            glacier: document.getElementById('screen-glacier'),
            mining: document.getElementById('screen-mining'),
            shop: document.getElementById('screen-shop'),
            den: document.getElementById('screen-den')
        };
        let currentTab = 'glacier';

        function setTab(name) {
            if (!screens[name]) { toast('Скоро'); return; }
            if (name === currentTab) {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
                if (name === 'shop') showShopCategories();
                return;
            }
            if (currentTab === 'glacier') stopMining();
            if (currentTab === 'mining') showMineView('hub'); // при возврате в «Добыча» — стартовый экран
            if (currentTab === 'shop') showShopCategories();

            currentTab = name;
            if (name === 'bourse' && window.yetiTrack) window.yetiTrack('visitMarket');
            Object.keys(screens).forEach(k => screens[k].classList.toggle('hidden', k !== name));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));

            refreshMine();
            if (name === 'bourse') renderBourse();
            if (name === 'shop') showShopCategories();
        }

        document.querySelectorAll('.nav-btn').forEach(b => {
            b.addEventListener('click', () => {
                if (window.yetiCloseSectionPages) window.yetiCloseSectionPages();
                if (b.dataset.tab === 'shop' && currentTab === 'shop') {
                    setTab('shop');
                    return;
                }
                // повторное нажатие на «Добыча» возвращает к списку ферм
                if (b.dataset.tab === 'mining' && currentTab === 'mining' && mineView !== 'hub') showMineView('hub');
                else setTab(b.dataset.tab);
            });
        });

        const isMiningVisible = () => currentTab === 'mining';
