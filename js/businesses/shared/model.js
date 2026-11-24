        // ==========================================
        // 5. ВКЛАДКА «ДОБЫЧА»: хаб ферм, выбор вида, экран фермы
        // ==========================================
        // Каждая ферма — это набор данных (пушки, прораб, кучи, таймеры). Считаются все фермы сразу,
        // а на экране рисуется только та, что открыта.
        const $ = id => document.getElementById(id);
        const mapArea = $('map-area');
        const map = $('map');
        const mapImg = $('map-img');
        const pilesLayer = $('piles-layer');

        let mapRatio = 1088 / 1428; // ширина / высота картинки (уточняется после загрузки)
        let mapW = 1, mapH = 1, U = 1;

        // Сетка внутри карты (в % от размеров карты)
        const COLS = 6, ROWS = 9;
        const GRID = { l: 18.0, r: 83.2, t: 20.0, b: 83.5 };
        // клетки в правом нижнем углу заняты площадкой прораба
        const isBlockedCell = (c, r) => c >= 4 && r >= 7;
        const MAX_PILES = COLS * ROWS - 4;

        function cellCenter(c, r) {
            return {
                x: GRID.l + (c + 0.5) * (GRID.r - GRID.l) / COLS,
                y: GRID.t + (r + 0.5) * (GRID.b - GRID.t) / ROWS
            };
        }

        // Карта озера «Ледореза»
        const cutterArea = $('cutter-area');
        const cutterMap = $('cutter-map');
        const cutterImg = $('cutter-img');
        const cubesLayer = $('cubes-layer');
        const stacksLayer = $('stacks-layer');
        let cRatio = 1088 / 1450;
        let cW = 1, cH = 1, cU = 1;

        // Адаптивная подгонка карт: всегда целиком в области, с сохранением пропорций
        function fitArea(area, el, ratio) {
            const w = area.clientWidth;
            const h = area.clientHeight;
            if (!w || !h) return null;
            let mw = w, mh = w / ratio;
            if (mh > h) { mh = h; mw = h * ratio; }
            el.style.width = mw + 'px';
            el.style.height = mh + 'px';
            return { w: mw, h: mh };
        }

        const factoryArea = $('factory-area');
        const factoryMap = $('factory-map');
        const facImg = $('factory-img');
        let fRatio = 1088 / 1450;
        let fW = 1, fH = 1, fU = 1;

        function fitMap() {
            const fa = fitArea(factoryArea, factoryMap, fRatio);
            if (fa) {
                fW = fa.w; fH = fa.h; fU = fa.w / 100;
                factoryMap.style.setProperty('--u', fU + 'px');
            }
            const a = fitArea(mapArea, map, mapRatio);
            if (a) {
                mapW = a.w; mapH = a.h; U = a.w / 100;
                map.style.setProperty('--u', U + 'px');
                sizeFx();
            }
            const b = fitArea(cutterArea, cutterMap, cRatio);
            if (b) {
                cW = b.w; cH = b.h; cU = b.w / 100;
                cutterMap.style.setProperty('--u', cU + 'px');
            }
        }

        mapImg.addEventListener('load', () => {
            if (mapImg.naturalWidth && mapImg.naturalHeight) {
                mapRatio = mapImg.naturalWidth / mapImg.naturalHeight;
            }
            fitMap();
        });
        facImg.addEventListener('load', () => {
            if (facImg.naturalWidth && facImg.naturalHeight) fRatio = facImg.naturalWidth / facImg.naturalHeight;
            fitMap();
        });
        cutterImg.addEventListener('load', () => {
            if (cutterImg.naturalWidth && cutterImg.naturalHeight) {
                cRatio = cutterImg.naturalWidth / cutterImg.naturalHeight;
            }
            fitMap();
        });
        window.addEventListener('resize', fitMap);
        window.addEventListener('orientationchange', () => setTimeout(fitMap, 200));
