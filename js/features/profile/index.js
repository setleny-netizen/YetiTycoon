        // ==========================================
        // 4.6 ПРОФИЛЬ: кнопка «Сбросить прогресс»
        // ==========================================
        const profileBox = document.querySelector('.profile-box');
        const profileMenu = document.getElementById('profile-menu');
        const resetBtn = document.getElementById('reset-btn');
        const telegramUserId = document.getElementById('telegram-user-id');
        const telegramUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
        const userId = telegramUser && telegramUser.id;
        if (telegramUserId && userId) telegramUserId.textContent = String(userId);
        const playerNameKey = 'shaggyTycoonPlayerName';
        const playerNameInput = document.getElementById('player-name-input');
        const playerDisplayName = document.getElementById('player-display-name');
        const savePlayerNameButton = document.getElementById('save-player-name');
        const telegramDefaultName = telegramUser && (telegramUser.first_name || telegramUser.username);
        function storedPlayerName() {
            try { return localStorage.getItem(playerNameKey) || ''; } catch (e) { return ''; }
        }
        function renderPlayerName() {
            const name = storedPlayerName() || telegramDefaultName || 'Игрок';
            playerDisplayName.textContent = name;
            playerNameInput.value = storedPlayerName() || telegramDefaultName || '';
        }
        function formatLevelNumber(value) {
            return String(Math.floor(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
        function renderPlayerProgress() {
            const total = Math.max(0, Number(window.yetiManualIceTotal && window.yetiManualIceTotal()) || 0);
            const level = Math.floor((Math.sqrt(1 + 8 * total / 1000) - 1) / 2);
            const previousThreshold = 1000 * level * (level + 1) / 2;
            const nextRequirement = 1000 * (level + 1);
            const currentProgress = Math.max(0, total - previousThreshold);
            document.getElementById('player-level-label').textContent = 'Уровень ' + level;
            document.getElementById('player-level-progress').textContent = formatLevelNumber(currentProgress) + ' / ' + formatLevelNumber(nextRequirement);
            document.getElementById('player-level-bar').style.width = Math.min(100, currentProgress / nextRequirement * 100) + '%';
        }
        renderPlayerName();
        renderPlayerProgress();
        window.yetiRefreshProfileProgress = renderPlayerProgress;
        savePlayerNameButton.addEventListener('click', () => {
            const name = playerNameInput.value.trim().replace(/\s+/g, ' ').slice(0, 22);
            if (!name) { toast('Имя не может быть пустым'); return; }
            try { localStorage.setItem(playerNameKey, name); } catch (e) {}
            renderPlayerName();
            toast('Имя сохранено');
        });
        playerNameInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') { event.preventDefault(); savePlayerNameButton.click(); }
        });
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
