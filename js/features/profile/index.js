        // ==========================================
        // 4.6 ПРОФИЛЬ: кнопка «Сбросить прогресс»
        // ==========================================
        const profileBox = document.querySelector('.profile-box');
        const profileMenu = document.getElementById('profile-menu');
        const resetBtn = document.getElementById('reset-btn');
        const telegramPhotoUrl = typeof window.yetiTelegramPhotoUrl === 'function' ? window.yetiTelegramPhotoUrl() : '';
        if (telegramPhotoUrl) {
            const telegramPhoto = new Image();
            telegramPhoto.onload = () => { profileBox.style.backgroundImage = 'url("' + telegramPhotoUrl + '")'; };
            telegramPhoto.src = telegramPhotoUrl;
        }
        function renderVipProfile() {
            const badge = document.getElementById('profile-vip');
            const tier = activeVipTier();
            const permanent = vipPermanentTier >= tier;
            badge.textContent = tier ? ('VIP ' + ['','I','II','III','IV','V'][tier] + (!permanent && vipUntil ? ' · до ' + new Date(vipUntil).toLocaleDateString('ru-RU') : '')) : '';
            badge.title = tier ? ('VIP ' + tier + (permanent ? ' · навсегда' : ' · действует до ' + new Date(vipUntil).toLocaleDateString('ru-RU'))) : '';
        }
        renderVipProfile();
        setInterval(renderVipProfile, 60000);
        let resetArmed = false, armTimer = null;

        function disarmReset() {
            resetArmed = false;
            clearTimeout(armTimer);
            resetBtn.classList.remove('armed');
            resetBtn.innerText = 'Сбросить прогресс';
        }

        profileBox.addEventListener('click', () => {
            profileMenu.classList.toggle('show');
            disarmReset();
        });

        document.addEventListener('pointerdown', (e) => {
            if (profileMenu.contains(e.target) || profileBox.contains(e.target)) return;
            profileMenu.classList.remove('show');
            disarmReset();
        });

        // ВРЕМЕННО, для тестов: начислить себе любую сумму
        const moneyInput = document.getElementById('money-input');
        const moneyBtn = document.getElementById('money-btn');
        function addMoney() {
            const amount = parseFloat(String(moneyInput.value).replace(/\s/g, '').replace(',', '.'));
            if (!isFinite(amount) || amount <= 0) { toast('Введите сумму'); return; }
            dollarCount = round2(dollarCount + Math.min(amount, 1e12));
            renderResources();
            updatePriceColors();
            saveState();
            toast('+$' + fmtMoney(Math.min(amount, 1e12)));
            moneyInput.value = '';
        }
        moneyBtn.addEventListener('click', addMoney);
        moneyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMoney(); });

        resetBtn.addEventListener('click', () => {
            if (!resetArmed) {
                resetArmed = true;
                resetBtn.classList.add('armed');
                resetBtn.innerText = 'Нажмите ещё раз';
                armTimer = setTimeout(disarmReset, 3000);
                return;
            }
            resetting = true; // не даём автосохранению перезаписать сброс
            try {
                localStorage.setItem(SAVE_KEY, JSON.stringify({
                    ice: 0, dollars: RESET_DOLLARS, slots: SLOT_BASE, farms: []
                }));
                localStorage.removeItem('iceMiner_berloga_v1');
            } catch (e) {}
            location.reload();
        });
