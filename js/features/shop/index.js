        // ---------- Магазин ----------
        const AUTO_MINER_ICE_PER_SECOND = 15;
        const SHOP_CATALOG = {
            autominer: {
                title: 'Автомайнер',
                products: [
                    { id: 'auto-1h', kind: 'auto', image: 'miner1h', title: 'Автомайнер · 1 час', duration: 1 * 3600000, priceStars: 3, desc: 'Йети добывает по 15 льда в секунду. Работает онлайн и офлайн.' },
                    { id: 'auto-6h', kind: 'auto', image: 'miner6h', title: 'Автомайнер · 6 часов', duration: 6 * 3600000, priceStars: 14, desc: 'Автоматическая добыча льда в течение шести часов.' },
                    { id: 'auto-24h', kind: 'auto', image: 'miner24h', title: 'Автомайнер · 24 часа', duration: 24 * 3600000, priceStars: 50, desc: 'Автоматическая добыча льда в течение суток.' }
                ]
            },
            vip: {
                title: 'VIP',
                products: [
                    { id: 'vip1', kind: 'vip', tier: 1, image: 'vip1', title: 'VIP I', price: 210, rentPrice: 8, desc: '4-й слот бизнеса · переводы до $100 000 раз в 6 часов · ежедневный автомайнер на 30 минут.' },
                    { id: 'vip2', kind: 'vip', tier: 2, image: 'vip2', title: 'VIP II', price: 525, rentPrice: 20, desc: '5-й слот бизнеса · переводы до $300 000 раз в 6 часов · ежедневный автомайнер на 2 часа.' },
                    { id: 'vip3', kind: 'vip', tier: 3, image: 'vip3', title: 'VIP III', price: 1045, rentPrice: 39, desc: '6-й слот · переводы до $1 млн раз в 6 часов · бонус 4 часа · ×2 ко всей добыче.' },
                    { id: 'vip4', kind: 'vip', tier: 4, image: 'vip4', title: 'VIP IV', price: 2085, rentPrice: 77, desc: '7-й слот · переводы до $6 млн раз в 6 часов · бонус 8 часов · ×3 ко всей добыче.' },
                    { id: 'vip5', kind: 'vip', tier: 5, image: 'vip5', title: 'VIP V', price: 4165, rentPrice: 154, desc: '8 слотов · переводы до $20 млн раз в 6 часов · бонус 12 часов · ×5 ко всей добыче.' }
                ]
            }
        };
        const shopCategoryView = document.getElementById('shop-category-view');
        const shopProductView = document.getElementById('shop-product-view');
        const shopCarousel = document.getElementById('shop-carousel');
        let shopCategoryId = null;
        let shopProductIndex = 0;
        let shopSwipeStart = null;
        let shopSwipePointer = null;
        let shopSwipeMoved = false;
        let shopAnimating = false;
        let shopAnimationTimer = null;

        function shopCountdown(ms) {
            const seconds = Math.max(0, Math.ceil(ms / 1000));
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hours) return hours + ' ч ' + String(minutes).padStart(2, '0') + ' мин';
            if (minutes) return minutes + ' мин ' + String(secs).padStart(2, '0') + ' сек';
            return secs + ' сек';
        }

        function shopEffectsText() {
            const now = Date.now();
            const effects = [];
            if (autoMinerUntil > now) effects.push('Автомайнер: ' + shopCountdown(autoMinerUntil - now));
            else effects.push('Автомайнер выключен');
            const activeTier = activeVipTier(now);
            if (activeTier) effects.push('VIP ' + activeTier + (vipPermanentTier >= activeTier ? ' · навсегда' : ' · ' + shopCountdown(vipUntil - now)));
            return effects.join(' · ');
        }

        function updateShopStatus() {
            const value = shopEffectsText();
            ['shop-effects', 'shop-effects-products'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
        }

        function currentShopProduct() {
            const category = SHOP_CATALOG[shopCategoryId];
            return category && category.products[shopProductIndex];
        }

        function shopProductStatus(product) {
            const now = Date.now();
            if (product.kind === 'auto') {
                return autoMinerUntil > now ? 'Уже активен ещё ' + shopCountdown(autoMinerUntil - now) : 'Скорость: 15 льда в секунду';
            }
            if (product.kind === 'vip') {
                const tier = activeVipTier(now);
                if (!tier) return 'Оплата Stars появится после подключения игры к Telegram';
                return 'Активен VIP ' + tier + (vipPermanentTier >= tier ? ' · навсегда' : ' · осталось ' + shopCountdown(vipUntil - now));
            }
            return 'Расчёт учитывает состояние каждого предприятия';
        }

        function renderShopCarousel() {
            const category = SHOP_CATALOG[shopCategoryId];
            if (!category) return;
            const products = category.products;
            shopProductIndex = (shopProductIndex + products.length) % products.length;
            document.getElementById('shop-category-title').textContent = category.title;
            shopCarousel.innerHTML = '';

            [-1, 0, 1].forEach(offset => {
                const index = (shopProductIndex + offset + products.length) % products.length;
                const product = products[index];
                const card = document.createElement('article');
                card.className = 'shop-product-card' + (product.kind === 'vip' ? ' vip-card' : '') + ' ' + (offset === 0 ? 'center' : offset < 0 ? 'prev' : 'next');
                card.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
                card.innerHTML =
                    '<img class="shop-product-art" src="' + A(product.image) + '" alt="' + product.title + '" draggable="false">' +
                    '<div class="shop-product-title">' + product.title + '</div>' +
                    '<div class="shop-product-desc">' + product.desc + '</div>' +
                    '<div class="shop-product-status">' + (offset === 0 ? shopProductStatus(product) : '') + '</div>' +
                    '<div class="shop-product-price">' + (product.kind === 'vip' ? product.price + ' ⭐ навсегда' : product.kind === 'auto' ? product.priceStars + ' ⭐' : '$' + fmt(product.price)) + '</div>' +
                    (offset === 0 ? (product.kind === 'vip'
                        ? ((activeVipTier() ? '<button class="vip-bonus-claim" type="button">Забрать ежедневный бонус автомайнера</button>' : '') +
                           '<div class="vip-buy-row"><button class="shop-buy vip-buy-permanent" type="button">Навсегда · ' + product.price + ' ⭐</button><button class="shop-buy vip-buy-rent" type="button">24 часа · ' + product.rentPrice + ' ⭐</button></div>')
                        : '<button class="shop-buy" type="button">' + (product.kind === 'auto' ? 'Купить за ' + product.priceStars + ' ⭐' : 'Купить') + '</button>') : '');
                const buyButton = card.querySelector('.shop-buy');
                if (buyButton && product.kind === 'auto') buyButton.addEventListener('click', () => toast('Оплата Stars станет доступна после подключения Telegram-бота'));
                else if (buyButton && product.kind !== 'vip') buyButton.addEventListener('click', () => buyShopProduct(product));
                card.querySelectorAll('.vip-buy-permanent, .vip-buy-rent').forEach(button => button.addEventListener('click', event => {
                    event.stopPropagation();
                    toast('Оплата Stars станет доступна после подключения Telegram-бота');
                }));
                const bonusButton = card.querySelector('.vip-bonus-claim');
                if (bonusButton) bonusButton.addEventListener('click', event => {
                    event.stopPropagation();
                    const today = new Date().toLocaleDateString('sv-SE');
                    const tier = activeVipTier();
                    if (vipBonusClaimDate === today) { toast('Ежедневный бонус уже получен'); return; }
                    const minutes = [0, 30, 120, 240, 480, 720][tier];
                    advanceAutoMining(Date.now());
                    autoMinerUntil = Math.max(Date.now(), autoMinerUntil) + minutes * 60000;
                    autoMinerPaused = false;
                    autoMinerImage = tier >= 5 ? 'miner24h' : tier >= 4 ? 'miner6h' : 'miner1h';
                    autoMinerLastAt = Date.now();
                    vipBonusClaimDate = today;
                    syncMinerVisual();
                    saveState();
                    toast('Бонус автомайнера активирован');
                    renderShopCarousel();
                });
                shopCarousel.appendChild(card);
            });

            const dots = document.getElementById('shop-dots');
            dots.innerHTML = products.map((_, i) => '<span class="shop-dot' + (i === shopProductIndex ? ' active' : '') + '"></span>').join('');
            updateShopStatus();
        }

        function cancelShopAnimation() {
            if (shopAnimationTimer) clearTimeout(shopAnimationTimer);
            shopAnimationTimer = null;
            shopAnimating = false;
            shopCarousel.classList.remove('slide-next', 'slide-prev', 'is-settling');
            shopCarousel.style.removeProperty('--shop-drag-x');
            shopCarousel.style.removeProperty('--shop-slide-distance');
            shopCarousel.style.removeProperty('--shop-center-tilt');
        }

        function openShopCategory(categoryId) {
            if (!SHOP_CATALOG[categoryId]) return;
            cancelShopAnimation();
            shopCategoryId = categoryId;
            shopProductIndex = 0;
            shopCategoryView.classList.add('hidden');
            shopProductView.classList.remove('hidden');
            renderShopCarousel();
        }

        function showShopCategories() {
            cancelShopAnimation();
            shopCategoryId = null;
            shopProductIndex = 0;
            shopProductView.classList.add('hidden');
            shopCategoryView.classList.remove('hidden');
            updateShopStatus();
        }

        function stepShopProduct(direction) {
            if (!shopCategoryId || shopAnimating) return;
            const products = SHOP_CATALOG[shopCategoryId].products;
            if (products.length < 2) return;
            shopAnimating = true;
            shopCarousel.classList.remove('slide-next', 'slide-prev', 'is-settling');
            const slideDistance = Math.round(shopCarousel.querySelector('.shop-product-card.center').offsetWidth * 0.72);
            shopCarousel.style.setProperty('--shop-slide-distance', slideDistance + 'px');
            void shopCarousel.offsetWidth;
            shopCarousel.classList.add(direction > 0 ? 'slide-next' : 'slide-prev');
            shopCarousel.classList.add('is-settling');
            shopCarousel.style.setProperty('--shop-drag-x', (direction > 0 ? -slideDistance : slideDistance) + 'px');
            shopAnimationTimer = setTimeout(() => {
                shopProductIndex = (shopProductIndex + direction + products.length) % products.length;
                cancelShopAnimation();
                renderShopCarousel();
            }, 260);
        }

        document.querySelectorAll('[data-shop-category]').forEach(button => {
            button.addEventListener('click', () => openShopCategory(button.dataset.shopCategory));
        });
        document.getElementById('shop-prev').addEventListener('click', () => stepShopProduct(-1));
        document.getElementById('shop-next').addEventListener('click', () => stepShopProduct(1));
        shopCarousel.addEventListener('pointerdown', event => {
            if (event.target.closest('button')) return;
            shopSwipeStart = event.clientX;
            shopSwipePointer = event.pointerId;
            shopSwipeMoved = false;
            shopCarousel.setPointerCapture(event.pointerId);
        });
        shopCarousel.addEventListener('pointermove', event => {
            if (shopSwipeStart == null || event.pointerId !== shopSwipePointer || shopAnimating) return;
            const delta = event.clientX - shopSwipeStart;
            if (Math.abs(delta) < 3 && !shopSwipeMoved) return;
            shopSwipeMoved = true;
            if (event.cancelable) event.preventDefault();
            const maxDrag = shopCarousel.querySelector('.shop-product-card.center').offsetWidth * 0.9;
            const drag = Math.max(-maxDrag, Math.min(maxDrag, delta));
            shopCarousel.style.setProperty('--shop-drag-x', drag + 'px');
            shopCarousel.style.setProperty('--shop-center-tilt', (drag / maxDrag * 2.4) + 'deg');
        });
        shopCarousel.addEventListener('pointerup', event => {
            if (shopSwipeStart == null || event.pointerId !== shopSwipePointer) return;
            const distance = event.clientX - shopSwipeStart;
            shopSwipeStart = null;
            shopSwipePointer = null;
            if (!shopSwipeMoved) return;
            const threshold = shopCarousel.querySelector('.shop-product-card.center').offsetWidth * 0.16;
            if (Math.abs(distance) > threshold) {
                stepShopProduct(distance < 0 ? 1 : -1);
            } else {
                shopCarousel.classList.add('is-settling');
                shopCarousel.style.setProperty('--shop-drag-x', '0px');
                shopCarousel.style.setProperty('--shop-center-tilt', '0deg');
                shopAnimationTimer = setTimeout(cancelShopAnimation, 250);
            }
        });
        shopCarousel.addEventListener('pointercancel', () => {
            shopSwipeStart = null;
            shopSwipePointer = null;
            if (shopSwipeMoved) {
                shopCarousel.classList.add('is-settling');
                shopCarousel.style.setProperty('--shop-drag-x', '0px');
                shopCarousel.style.setProperty('--shop-center-tilt', '0deg');
                shopAnimationTimer = setTimeout(cancelShopAnimation, 250);
            }
            shopSwipeMoved = false;
        });
        setInterval(() => {
            updateShopStatus();
            const product = currentShopProduct();
            const status = shopCarousel.querySelector('.shop-product-card.center .shop-product-status');
            if (product && status) status.textContent = shopProductStatus(product);
            const claim = shopCarousel.querySelector('.vip-bonus-claim');
            if (claim) claim.hidden = !activeVipTier() || vipBonusClaimDate === new Date().toLocaleDateString('sv-SE');
        }, 1000);
