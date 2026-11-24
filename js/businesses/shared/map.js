        // ---------- Слоты пушек на карте ----------
        // позиции площадок (% от карты); side: куда смотрит пушка (+1 вправо, -1 влево)
        const SLOT_DEFS = [
            { x: 10.8, y: 33.8, side: 1 },   // 1 — слева сверху
            { x: 89.2, y: 33.8, side: -1 },  // 2 — справа сверху
            { x: 10.6, y: 60.1, side: 1 },   // 3 — слева снизу
            { x: 89.6, y: 60.1, side: -1 }   // 4 — справа снизу
        ];

        const LOCK_SVG = `
            <svg class="lock-icon" viewBox="0 0 24 24">
                <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="#e5e7eb" stroke-width="2.6" stroke-linecap="round"/>
                <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/>
                <circle cx="12" cy="15.2" r="1.6" fill="#92400e"/>
                <rect x="11.2" y="15.5" width="1.6" height="3" rx="0.8" fill="#92400e"/>
            </svg>`;

        // Вид (DOM) пушек — один на всех, показывает состояние открытой фермы
        const cannonViews = SLOT_DEFS.map((def, i) => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.style.left = def.x + '%';
            slot.style.top = def.y + '%';

            const cannonEl = document.createElement('div');
            cannonEl.className = 'cannon' + (def.side === -1 ? ' flip' : '');
            const img = document.createElement('img');
            img.dataset.src = 'pushka';
            lazyImg(img);
            img.draggable = false;
            cannonEl.appendChild(img);

            const lockBox = document.createElement('div');
            lockBox.className = 'lock-box';
            lockBox.innerHTML = LOCK_SVG + '<div class="price">$' + fmt(CANNON_PRICES[i]) + '</div>';

            slot.appendChild(cannonEl);
            slot.appendChild(lockBox);
            map.appendChild(slot);

            const v = { index: i, def, slot, cannonEl, img, lockBox, priceEl: lockBox.querySelector('.price') };
            lockBox.addEventListener('click', () => { if (viewFarm) buyCannon(viewFarm, i); });
            return v;
        });

        function buyCannon(f, i) {
            const c = f.cannons[i];
            if (c.owned) return;
            const v = cannonViews[i];
            const price = CANNON_PRICES[i];
            if (dollarCount < price) {
                denyFlash(v.lockBox);
                denyFlash(uiDollarBox);
                return;
            }
            spendDollars(price);
            if (window.yetiTrack) window.yetiTrack('upgrade', price);
            c.owned = true;
            c.nextAt = Date.now() + CANNON_INTERVAL;
            c.blocked = false;
            v.slot.classList.add('unlocked');
            const flip = v.cannonEl.classList.contains('flip');
            v.cannonEl.animate(
                [{ opacity: 0, transform: 'translate(-50%, -80%)' + (flip ? ' scaleX(-1)' : '') },
                 { opacity: 1, transform: 'translate(-50%, -56%)' + (flip ? ' scaleX(-1)' : '') }],
                { duration: 300, easing: 'ease-out' }
            );
            updateForemanRate();
            saveState();
        }
