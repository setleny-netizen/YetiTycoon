        // ---------- Виды ферм ----------
        const FARM_TYPES = [
            { id: 'snow', name: 'Снежная ферма', price: 10000,
              desc: 'Пушки насыпают кучи снега. Убирайте их вручную или наймите прораба — он делает это сам.' },
            { id: 'cutter', name: 'Ледорез', price: 100000,
              desc: 'Йети рубят лёд на озере. Начните с топора, купите бензопилы, наймите ещё йети и прораба.' },
            { id: 'factory', name: 'Ледозавод', price: 1000000,
              desc: 'Автоматический завод: ледогенераторы, вода, ремонт и ремонтники. Лёд едет по конвейерам в чёрную яму.' }
        ];

        // Параметры «Ледозавода» (цены и скорости можно менять здесь)
        const FAC_GEN_PRICE = 500000;                // открытие одного генератора
        const FAC_WATER_PER_MS = 100 / 3600000;      // 100 л воды в час на генератор
        const FAC_RES_MS = 100 * 3600000;            // ресурс до ремонта: 100 часов
        const FAC_REPAIR_MS = 2 * 60000;             // ремонт занимает 2 минуты
        const FAC_REPAIR_PER_HOUR = 500;             // самостоятельный ремонт: $500 за каждый отработанный час
        const FAC_CUBE_MS = 6000;                    // генератор делает кубик каждые 6 сек
        const FAC_CUBE_VALUE = 16;                   // лёд за кубик (160 льда/мин = 9 600 льда/ч на генератор)
        const FAC_TRAVEL_MS = 4000;                  // кубик едет по конвейеру
        const FAC_TANK = [40000, 60000, 80000, 100000];   // вместимость по уровням, л
        const FAC_TANK_UP = [0, 200000, 350000, 500000];  // цена улучшения до уровня
        const FAC_WATER_PRICE = 1;                   // $ за литр
        const FAC_HIRE = 500;                        // найм ремонтника
        const FAC_SALARY = [800, 1500, 2100, 2600, 3000, 3300, 3500, 3600];  // зарплата в час по навыку (десятки 1–10 … 71–80)
        const FAC_PROB = [30, 25, 18, 12, 7, 5, 2, 1];                       // вероятность навыка по десяткам, %

        // Параметры «Ледореза» (цены и скорости можно менять здесь)
        const AXE_CUBE = [20, 30, 50];               // лёд за кубик у йети 1/2/3 с топором
        const SAW_CUBE = [100, 150, 195];            // лёд за кубик у йети 1/2/3 с бензопилой
        const SAW_INTERVAL = 60000;                  // бензопила: один кубик в минуту
        const AXE_COOLDOWN = 1000 / 15;              // топор: не чаще 15 ударов в секунду
        const FOREMAN_MS = 400;                      // прораб собирает один кубик за 0.4 сек
        const HIRE_PRICES = [30000, 90000, 180000];  // йети 1/2/3 с топором
        const SAW_PRICES = [70000, 180000, 500000];  // бензопила для йети 1/2/3
        const C_FOREMAN_PRICE = 194000;              // прораб
        const CUTTER_CAPACITY = 80;                  // постоянная вместимость «Ледореза»
        const LEGACY_CUTTER_LIMIT_PRICES = [4000, 10000, 25000, 60000, 150000]; // учёт старых покупок в капитализации
        const FIELD_MAX = 10;                        // кубиков на озере одновременно (остальные — штабелями)
        const farmType = id => FARM_TYPES.find(t => t.id === id) || FARM_TYPES[0];
        const FOREMAN_MAX_PER_HOUR = (3600000 / HOLD_TIME) * ICE_PER_PILE;

        let farmIdSeq = 0;
        function newFarm(type, saved) {
            if (type === 'cutter') return newCutter(saved);
            if (type === 'factory') return newFactory(saved);
            const sv = saved || {};
            const now = Date.now();
            return {
                id: ++farmIdSeq, type: type || 'snow',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                foreman: !!sv.foreman,
                piles: [], fTask: null, fLast: 0,
                savedPiles: sv.piles || 0,
                cannons: [0, 1, 2, 3].map(i => ({
                    index: i, owned: !!(sv.cannons && sv.cannons[i]),
                    nextAt: now + CANNON_INTERVAL, blocked: false, mistAcc: 0
                }))
            };
        }

        function newFactory(saved) {
            const sv = saved || {};
            const now = Date.now();
            return {
                id: ++farmIdSeq, type: 'factory',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                piles: [], foreman: false,     // нужно общему коду
                water: sv.water || 0,
                tank: Math.min(sv.tank || 0, FAC_TANK.length - 1),
                workers: Array.isArray(sv.workers) ? sv.workers.map(Number) : [],
                salaryAt: sv.salaryAt || now + 3600000,
                lastT: sv.lastT || now,
                gens: [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                    const g = (sv.gens && sv.gens[i]) || {};
                    return { index: i, owned: !!g.owned, res: g.res != null ? g.res : FAC_RES_MS, repairEnd: g.repairEnd || 0, acc: g.acc || 0 };
                })
            };
        }

        function newCutter(saved) {
            const sv = saved || {};
            const now = Date.now();
            const vals = Array.isArray(sv.cubeVals) ? sv.cubeVals.slice(0, CUTTER_CAPACITY).map(Number)
                       : new Array(Math.min(Math.max(0, Number(sv.cubes) || 0), CUTTER_CAPACITY)).fill(AXE_CUBE[0]);
            return {
                id: ++farmIdSeq, type: 'cutter',
                openedAt: sv.openedAt || now, totalIce: sv.totalIce || 0,
                foreman: !!sv.foreman,
                cubeVals: vals,                       // стоимость каждого несобранного кубика
                get cubes() { return this.cubeVals.length; },
                legacyLimitLevel: Math.min(Number(sv.limitLevel) || 0, LEGACY_CUTTER_LIMIT_PRICES.length),
                fNext: now + FOREMAN_MS,
                piles: [],   // нужно общему коду, у Ледореза пусто
                workers: [0, 1, 2].map(i => ({
                    index: i,
                    owned: Array.isArray(sv.workers) ? !!sv.workers[i] : false,
                    saw: Array.isArray(sv.saws) ? !!sv.saws[i] : false,
                    nextAt: now + SAW_INTERVAL, blocked: false, hitAt: 0
                }))
            };
        }

        const farms = loadedFarms.slice(0, SLOT_MAX).map(sf => newFarm(sf.type, sf));
        slotsOwned = Math.max(slotsOwned, farms.length);

        function serializeFarms() {
            try {
                return farms.map(f => Object.assign({ openedAt: f.openedAt, totalIce: f.totalIce }, f.type === 'factory' ? ({
                    type: 'factory', water: f.water, tank: f.tank, workers: f.workers,
                    salaryAt: f.salaryAt, lastT: f.lastT,
                    gens: f.gens.map(g => ({ owned: g.owned, res: g.res, repairEnd: g.repairEnd, acc: g.acc }))
                }) : f.type === 'cutter' ? ({
                    type: 'cutter', workers: f.workers.map(w => w.owned), saws: f.workers.map(w => w.saw),
                    foreman: f.foreman, cubeVals: f.cubeVals, limitLevel: f.legacyLimitLevel
                }) : ({
                    type: f.type, cannons: f.cannons.map(c => c.owned),
                    foreman: f.foreman, piles: f.piles.length
                })));
            } catch (e) { return loadedFarms; }
        }

        let mineView = 'hub';          // 'hub' | 'build' | 'farm'
        let viewFarm = null;           // открытая ферма
        let farmDomAttached = false;   // карта фермы сейчас на экране
        const farmVisible = f => farmDomAttached && f === viewFarm;
        const farmIndex = f => farms.indexOf(f) + 1;
        const ownedCannons = f => f.cannons.filter(c => c.owned).length;

        // Лёд/час: только пассивный способ (с прорабом), его ограничивают пушки и скорость прораба
        function farmRate(f) {
            if (f.type === 'factory') {
                // сколько генераторов работает сейчас (есть вода, ресурс, не в ремонте)
                const run = f.water > 0 ? f.gens.filter(g => g.owned && !g.repairEnd && g.res > 0).length : 0;
                return run * (3600000 / FAC_CUBE_MS) * FAC_CUBE_VALUE;
            }
            if (f.type === 'cutter') {
                if (!f.foreman) return 0;
                // пассивный доход: кубики пил (по минуте на йети) × стоимость кубика
                return f.workers.reduce((sum, w, i) => sum + (w.owned && w.saw ? SAW_CUBE[i] * (3600000 / SAW_INTERVAL) : 0), 0);
            }
            if (!f.foreman) return 0;
            const supply = ownedCannons(f) * PILES_PER_MIN_PER_CANNON * 60 * ICE_PER_PILE;
            return Math.min(supply, FOREMAN_MAX_PER_HOUR);
        }
        const totalRate = () => farms.reduce((sum, f) => sum + farmRate(f), 0) * productionMultiplier();
