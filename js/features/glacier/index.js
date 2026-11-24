        // ==========================================
        // 4. ЭКРАН «ЛЕДНИК» (ручная добыча)
        // ==========================================
        const miner = document.getElementById('miner');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const starsContainer = document.getElementById('stars-container');
        const autoMinerToggle = document.getElementById('auto-miner-toggle');
        const leaderboardTrophy = document.getElementById('leaderboard-open');
        const clanEntry = document.getElementById('clan-entry');
        const clanEntryQuestion = document.getElementById('clan-entry-question');
        const clanEntryEmblem = document.getElementById('clan-entry-emblem');

        let isMining = false;
        let isOverheated = false;
        function syncMinerVisual() {
            const autoActive = autoMinerUntil > Date.now() && !autoMinerPaused;
            const active = isMining || autoActive;
            const hasAutoMiner = autoMinerUntil > Date.now();
            const asset = hasAutoMiner ? autoMinerImage : 'miner';
            const src = A(asset);
            if (miner.getAttribute('src') !== src) miner.src = src;
            miner.classList.toggle('shake', active);
            autoMinerToggle.classList.toggle('hidden', !hasAutoMiner);
            autoMinerToggle.textContent = autoMinerPaused ? 'Старт' : 'Стоп';
            autoMinerToggle.setAttribute('aria-pressed', String(!autoMinerPaused));
        }

        function toggleAutoMiner(event) {
            event.preventDefault();
            event.stopPropagation();
            if (autoMinerUntil <= Date.now()) { syncMinerVisual(); return; }
            if (autoMinerPaused) {
                autoMinerPaused = false;
                autoMinerLastAt = Date.now();
                toast('Автомайнер запущен');
            } else {
                advanceAutoMining(Date.now());
                autoMinerPaused = true;
                toast('Автомайнер остановлен');
            }
            syncMinerVisual();
            saveState();
        }
        ['pointerdown', 'touchstart', 'mousedown'].forEach(name => autoMinerToggle.addEventListener(name, event => event.stopPropagation(), { passive: false }));
        autoMinerToggle.addEventListener('click', toggleAutoMiner);
        ['pointerdown', 'touchstart', 'mousedown'].forEach(name => leaderboardTrophy.addEventListener(name, event => event.stopPropagation(), { passive: false }));
        ['pointerdown', 'touchstart', 'mousedown'].forEach(name => clanEntry.addEventListener(name, event => event.stopPropagation(), { passive: false }));
        clanEntry.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toast('Кланы появятся позже');
        });
        window.yetiSetClanEmblem = function (imageUrl) {
            if (!imageUrl) {
                clanEntryEmblem.removeAttribute('src');
                clanEntryEmblem.hidden = true;
                clanEntryQuestion.hidden = false;
                return;
            }
            clanEntryEmblem.onload = () => { clanEntryEmblem.hidden = false; clanEntryQuestion.hidden = true; };
            clanEntryEmblem.onerror = () => { clanEntryEmblem.removeAttribute('src'); clanEntryEmblem.hidden = true; clanEntryQuestion.hidden = false; };
            clanEntryEmblem.src = imageUrl;
        };

        let progress = 0;
        let lastFrameTime = 0;
        let accumulatedProgress = 0;

        function getSpawnRate(progressPercent) {
            let rate;
            if (progressPercent < 20) rate = 2;
            else if (progressPercent < 40) rate = 4;
            else if (progressPercent < 60) rate = 6;
            else if (progressPercent < 80) rate = 12;
            else rate = 24;
            return rate;
        }

        function spawnIce() {
            const minerRect = miner.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();
            const startX = (minerRect.left - containerRect.left) + (minerRect.width / 2);
            const startY = (minerRect.top - containerRect.top) + minerRect.height * 0.85;
            flyIce(startX, startY, () => {
                const amount = productionMultiplier();
                if (window.yetiTrack) window.yetiTrack('manualIce', amount);
                addIce(amount);
            }, 100);
        }

        function gameLoop(timestamp) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const deltaTime = timestamp - lastFrameTime;
            lastFrameTime = timestamp;

            if (isMining && !isOverheated) {
                progress += deltaTime * 0.02;
                if (progress > 100) progress = 100;
                progressBar.style.width = progress + '%';

                const currentRate = getSpawnRate(progress);
                const ratePerMs = currentRate / 1000;

                accumulatedProgress += deltaTime * ratePerMs;

                while (accumulatedProgress >= 1) {
                    spawnIce();
                    accumulatedProgress -= 1;
                }

                if (progress >= 100) {
                    triggerOverheat();
                }

            } else if (!isMining && !isOverheated) {
                if (progress > 0) {
                    progress -= deltaTime * 0.05;
                    if (progress < 0) progress = 0;
                    progressBar.style.width = progress + '%';
                    if (progress === 0) progressContainer.style.opacity = 0;
                }
            }

            requestAnimationFrame(gameLoop);
        }

        function startMining(e) {
            if (e.cancelable) e.preventDefault();
            if (currentTab !== 'glacier') return;
            if (isOverheated || isMining) return;

            isMining = true;
            syncMinerVisual();
            progressContainer.style.opacity = 1;
            lastFrameTime = 0;
        }

        function stopMining(e) {
            if (e && e.cancelable) e.preventDefault();
            if (isOverheated || !isMining) return;

            isMining = false;
            syncMinerVisual();
        }

        function triggerOverheat() {
            isOverheated = true;
            isMining = false;

            syncMinerVisual();
            starsContainer.style.display = 'flex';

            let cooldownTimer = setInterval(() => {
                progress -= 2;
                if (progress <= 0) {
                    progress = 0;
                    clearInterval(cooldownTimer);
                    isOverheated = false;
                    starsContainer.style.display = 'none';
                    progressContainer.style.opacity = 0;
                    progressBar.style.width = '0%';
                }
                progressBar.style.width = progress + '%';
            }, 50);
        }

        // Ручная добыча — только на экране «Ледник»
        const glacierScreen = screens.glacier;
        glacierScreen.addEventListener('touchstart', startMining, { passive: false });
        glacierScreen.addEventListener('touchend', stopMining);
        glacierScreen.addEventListener('touchcancel', stopMining);

        glacierScreen.addEventListener('mousedown', startMining);
        glacierScreen.addEventListener('mouseup', stopMining);
        glacierScreen.addEventListener('mouseleave', stopMining);
