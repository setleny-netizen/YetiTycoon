// ==========================================
        // 0. КАРТИНКИ: формат, ленивая загрузка
        // ==========================================
        // Скрипт optimize_assets.py сжимает картинки в WebP и сам меняет 'png' на 'webp' в этой строке.
        const ASSET_EXT = 'png';
        const A = n => 'assets/' + n + '.' + ASSET_EXT;

        // Нужны для первого экрана («Ледник») — именно их ждёт экран загрузки
        const CRITICAL_ASSETS = ['loading', 'fon', 'pol', 'miner', 'ice', 'profile'];
        // Остальные грузятся фоном уже после старта игры
        const BACKGROUND_ASSETS = ['pole', 'pushka', 'prorab', 'snow', 'lake', 'yeti_axe', 'yeti_saw', 'factory'];

        let gameStarted = false;
        const deferredImgs = [];

        // <img data-src="имя"> без расширения: критичные грузим сразу, остальные после старта
        function lazyImg(img) {
            const n = img.dataset && img.dataset.src;
            if (!n) return;
            if (gameStarted || CRITICAL_ASSETS.includes(n)) {
                img.decoding = 'async';
                img.src = A(n);
                img.removeAttribute('data-src');
            } else {
                deferredImgs.push(img);
            }
        }
        function lazyAll(root) { root.querySelectorAll('img[data-src]').forEach(lazyImg); }
        lazyAll(document);

        function startBackgroundLoad() {
            gameStarted = true;
            deferredImgs.splice(0).forEach((img, i) => setTimeout(() => lazyImg(img), i * 120));
            BACKGROUND_ASSETS.forEach((n, i) => setTimeout(() => {
                const im = new Image();
                im.decoding = 'async';
                im.src = A(n);
            }, 400 + i * 250));
        }

        // ==========================================
        // 1. ЛОГИКА ЗАГРУЗКИ (МИНИМУМ 2 СЕКУНДЫ)
        // ==========================================
        const assetsToLoad = CRITICAL_ASSETS.map(A);

        let loadedCount = 0;
        const totalAssets = assetsToLoad.length;
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        const loadingScreen = document.getElementById('loading-screen');

        const MIN_LOADING_TIME = 2000;
        const startTime = Date.now();
        let allAssetsReady = false;

        function checkLoadingStatus() {
            const elapsedTime = Date.now() - startTime;

            if (allAssetsReady && elapsedTime >= MIN_LOADING_TIME) {
                loadingBar.style.width = '100%';
                loadingText.innerText = '100%';

                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    if (typeof window.yetiTelegramReady === 'function') window.yetiTelegramReady();
                    lastFrameTime = 0;
                    requestAnimationFrame(gameLoop);
                    startBackgroundLoad();
                }, 300);
            } else {
                if (allAssetsReady) {
                    loadingBar.style.width = '99%';
                    loadingText.innerText = '99%';
                }
            }
        }

        function assetLoaded() {
            loadedCount++;
            const percent = Math.floor((loadedCount / totalAssets) * 100);

            if (!allAssetsReady) {
                loadingBar.style.width = percent + '%';
                loadingText.innerText = percent + '%';
            }

            if (loadedCount === totalAssets) {
                allAssetsReady = true;
            }
            checkLoadingStatus();
        }

        assetsToLoad.forEach(src => {
            const img = new Image();
            img.onload = assetLoaded;
            img.onerror = assetLoaded;
            img.src = src;
        });

        const loadingInterval = setInterval(() => {
            checkLoadingStatus();
            if (allAssetsReady && Date.now() - startTime >= MIN_LOADING_TIME) {
                clearInterval(loadingInterval);
            }
        }, 100);
