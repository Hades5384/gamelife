// ============================================================================
// js/systems/base.js - GameLife 16-Bit Pokémon GBA Sanctuary Engine (V4.3)
// Authentic GBA-era visuals, AABB hitboxes, Corner-Slip & Sanctuary Evolution (Tiers 1-3)
// ============================================================================

const BaseUI = {
    canvas: null,
    ctx: null,
    container: null,
    animationFrameId: null,
    isRunning: false,
    isFullscreen: false,

    // Resolution: 24x16 grid (24px tiles) = 576 x 384
    WIDTH: 576,
    HEIGHT: 384,
    TILE_SIZE: 24,

    currentMap: 'exterior', // 'exterior' | 'interior'
    tick: 0,

    // ------------------------------------------------------------------------
    // SANCTUARY TIERS CATALOG (PROGRESIÓN Y EVOLUCIÓN)
    // ------------------------------------------------------------------------
    TIERS: {
        1: {
            id: 1,
            name: 'Cabaña Rústica',
            subtitle: 'Refugio del Principiante',
            desc: 'Una acogedora cabaña de madera en un claro del bosque con chimenea cálida y cama de descanso.',
            reqLevel: 1,
            reqMissions: 0,
            cost: 0,
            perks: [
                'Guardado de partida en cama acogedora',
                'Acceso directo a misiones, perfil y crónicas',
                'Mascota Chispa en etapa inicial'
            ]
        },
        2: {
            id: 2,
            name: 'Villa del Aventurero',
            subtitle: 'Hogar del Héroe Forjado',
            desc: 'Residencia señorial ampliada con farolas de forja, huerto zen y estanque de carpas koi.',
            reqLevel: 4,
            reqMissions: 10,
            cost: 150,
            perks: [
                'Fachada ampliada con farolas de forja y jardineras florales',
                'Estanque de Carpas Koi con fuente zen de piedra',
                'Huerto Zen interactivo: cosecha diaria de +15 XP y +10 Oro',
                'Gramófono de la Bardo: selector musical retro en casa',
                'Maniquí blindado con cota de malla y escudo heráldico',
                '+10% de Oro adicional en todas las misiones'
            ]
        },
        3: {
            id: 3,
            name: 'Santuario Legendario',
            subtitle: 'Ciudadela Mítica del Campeón',
            desc: 'Templo señorial de piedra noble con estatua monumental, vidrieras góticas y portal rúnico.',
            reqLevel: 10,
            reqMissions: 30,
            cost: 350,
            perks: [
                'Mansión señorial con vidrieras góticas y pebeteros de fuego azul',
                'Estatua Monumental del Héroe en mármol y oro macizo',
                'Bendición de la Estatua: +30 XP una vez al día',
                'Expositor de armadura legendaria y estandarte de armas',
                'Portal Rúnico místico que resuena con energía arcana',
                '+25% de Oro adicional en todas las misiones'
            ]
        }
    },

    getBaseLevel() {
        return StateManager.data?.base?.level || 1;
    },

    // Player State (Pokémon GBA Trainer)
    player: {
        x: 264,
        y: 200,
        vx: 0,
        vy: 0,
        speed: 2.2,
        runMultiplier: 1.6,
        dir: 'down', // 'down' | 'up' | 'left' | 'right'
        walkDistance: 0,
        walkFrame: 0,
        isMoving: false,
        width: 20,
        height: 26,
        targetX: null,
        targetY: null
    },

    // Pet Companion State (Chispa - Fire Pokémon Style)
    pet: {
        x: 204,
        y: 200,
        dir: 'down',
        wanderTimer: 0,
        targetX: null,
        targetY: null,
        hearts: [],
        loveCount: 0,
        hopOffset: 0
    },

    // Weather & Atmosphere particles
    particles: [],
    weatherType: 'clear', // 'rain' | 'mist' | 'clear' | 'sunny'

    // Warp transition state (Fade to black)
    warp: {
        active: false,
        alpha: 0,
        stage: 'in', // 'in' or 'out'
        targetMap: null,
        targetX: 0,
        targetY: 0,
        targetDir: 'down'
    },

    // Focused interactive object
    currentInteractive: null,

    // Input state
    keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        interact: false,
        sprint: false
    },

    // In-world floating numbers / texts
    floatingTexts: [],

    // Dialogue popup state
    dialogue: {
        active: false,
        title: '',
        text: ''
    },

    // ------------------------------------------------------------------------
    // INITIALIZATION & LIFECYCLE
    // ------------------------------------------------------------------------
    init() {
        if (typeof StateManager === 'undefined' || !StateManager.data) return;
        if (!StateManager.data.pet) {
            StateManager.data.pet = { level: 1, exp: 0, state: 'happy', name: 'Chispa' };
        }
        if (!StateManager.data.base) {
            StateManager.data.base = { level: 1, lastZenHarvest: null, lastStatueBlessing: null };
        }
    },

    renderV4() {
        this.start();
    },

    start() {
        this.init();
        const viewport = document.getElementById('base-viewport');
        if (!viewport) return;

        this.container = viewport;

        if (!this.canvas) {
            this.buildDOM();
            this.bindEvents();
        }

        this.updateWeather();
        this.updateLocationBadge();
        this.isRunning = true;

        if (!this.animationFrameId) {
            this.lastTime = performance.now();
            this.gameLoop = this.loop.bind(this);
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    },

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    buildDOM() {
        this.container.innerHTML = '';

        // 1. Pixel Art Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;
        this.canvas.className = 'sanctuary-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.container.appendChild(this.canvas);

        // 2. Fullscreen Floating Close Button (Only visible in fullscreen mode)
        const fsCloseBtn = document.createElement('button');
        fsCloseBtn.className = 'sanctuary-fs-close';
        fsCloseBtn.id = 'sanctuary-fs-close';
        fsCloseBtn.textContent = '✕ SALIR DE PANTALLA COMPLETA';
        fsCloseBtn.onclick = () => this.toggleFullscreen();
        this.container.appendChild(fsCloseBtn);

        // 3. Controls Help Banner
        const controlsHelp = document.createElement('div');
        controlsHelp.className = 'sanctuary-controls-help';
        controlsHelp.id = 'sanctuary-controls-help';
        controlsHelp.textContent = 'WASD / FLECHAS: Moverse • E / ESPACIO: Interactuar • SHIFT: Correr • CLIC: Caminar';
        this.container.appendChild(controlsHelp);

        // 4. Virtual D-pad (Mobile / Touch devices only)
        const dpad = document.createElement('div');
        dpad.className = 'sanctuary-dpad';
        dpad.innerHTML = `
            <button class="dpad-btn dpad-up" onpointerdown="BaseUI.keys.up=true" onpointerup="BaseUI.keys.up=false" onpointerleave="BaseUI.keys.up=false">▲</button>
            <button class="dpad-btn dpad-left" onpointerdown="BaseUI.keys.left=true" onpointerup="BaseUI.keys.left=false" onpointerleave="BaseUI.keys.left=false">◀</button>
            <button class="dpad-btn dpad-right" onpointerdown="BaseUI.keys.right=true" onpointerup="BaseUI.keys.right=false" onpointerleave="BaseUI.keys.right=false">▶</button>
            <button class="dpad-btn dpad-down" onpointerdown="BaseUI.keys.down=true" onpointerup="BaseUI.keys.down=false" onpointerleave="BaseUI.keys.down=false">▼</button>
        `;
        this.container.appendChild(dpad);

        // 5. Virtual Action Button (Mobile / Touch devices only)
        const actionBtn = document.createElement('button');
        actionBtn.className = 'sanctuary-action-btn';
        actionBtn.textContent = 'E';
        actionBtn.title = 'Interactuar';
        actionBtn.onpointerdown = () => this.handleInteraction();
        this.container.appendChild(actionBtn);

        // 6. Dialogue Box
        const dialogueBox = document.createElement('div');
        dialogueBox.className = 'sanctuary-dialogue-box';
        dialogueBox.id = 'sanctuary-dialogue-box';
        dialogueBox.innerHTML = `
            <div class="sanctuary-dialogue-title" id="sanctuary-dialogue-title">> INTERACCIÓN</div>
            <div class="sanctuary-dialogue-text" id="sanctuary-dialogue-text">...</div>
            <button class="sanctuary-dialogue-close" onclick="BaseUI.closeDialogue()">[ CERRAR ]</button>
        `;
        this.container.appendChild(dialogueBox);
    },

    bindEvents() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            const code = e.code;
            if (code === 'KeyW' || code === 'ArrowUp') { this.keys.up = true; this.player.targetX = null; }
            if (code === 'KeyS' || code === 'ArrowDown') { this.keys.down = true; this.player.targetX = null; }
            if (code === 'KeyA' || code === 'ArrowLeft') { this.keys.left = true; this.player.targetX = null; }
            if (code === 'KeyD' || code === 'ArrowRight') { this.keys.right = true; this.player.targetX = null; }
            if (code === 'ShiftLeft' || code === 'ShiftRight') { this.keys.sprint = true; }

            if (code === 'KeyE' || code === 'Space' || code === 'Enter') {
                e.preventDefault();
                this.handleInteraction();
            }
            if (code === 'Escape') {
                if (this.dialogue.active) {
                    this.closeDialogue();
                } else if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
            if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
            if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
            if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
            if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.sprint = false;
        });

        // Click-to-move
        this.canvas.addEventListener('pointerdown', (e) => {
            if (this.dialogue.active) {
                this.closeDialogue();
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.WIDTH / rect.width;
            const scaleY = this.HEIGHT / rect.height;
            const targetX = (e.clientX - rect.left) * scaleX - (this.player.width / 2);
            const targetY = (e.clientY - rect.top) * scaleY - (this.player.height / 2);

            this.player.targetX = targetX;
            this.player.targetY = targetY;
        });
    },

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        const btn = document.getElementById('sanctuary-fullscreen-btn');
        if (this.isFullscreen) {
            this.container.classList.add('fullscreen');
            if (btn) btn.textContent = '✕ SALIR';
        } else {
            this.container.classList.remove('fullscreen');
            if (btn) btn.textContent = '⛶ PANTALLA COMPLETA';
        }
    },

    updateWeather() {
        const streak = StateManager.data?.streak?.current || 0;
        if (streak === 0) {
            this.weatherType = 'rain';
        } else if (streak <= 3) {
            this.weatherType = 'mist';
        } else if (streak <= 6) {
            this.weatherType = 'clear';
        } else {
            this.weatherType = 'sunny';
        }
    },

    // ------------------------------------------------------------------------
    // GESTIÓN DE MEJORAS Y MODAL (SANCTUARY UPGRADE)
    // ------------------------------------------------------------------------
    openUpgradeModal() {
        this.renderUpgradeModal();
        if (typeof openModal === 'function') {
            openModal('sanctuary-modal');
        }
    },

    renderUpgradeModal() {
        const body = document.getElementById('sanctuary-modal-body');
        if (!body) return;

        const currentLvl = this.getBaseLevel();
        const currentTier = this.TIERS[currentLvl] || this.TIERS[1];
        const nextTier = this.TIERS[currentLvl + 1] || null;

        const heroLvl = StateManager.data?.hero?.level || 1;
        const missionsTotal = StateManager.data?.counters?.missionsTotal || 0;
        const currentGold = StateManager.data?.economy?.gold || 0;

        let html = '';

        // Tarjeta del Tier Actual
        html += `
            <div class="sanctuary-tier-card">
                <div class="sanctuary-tier-header">
                    <span class="sanctuary-tier-title">
                        <img src="assets/guild.png" class="sprite-icon small" alt="Nivel">
                        ${currentTier.name}
                    </span>
                    <span class="sanctuary-tier-level-badge">NIVEL ${currentTier.id} (ACTUAL)</span>
                </div>
                <div class="sanctuary-tier-desc">${currentTier.desc}</div>
                <div class="sanctuary-perks-title">> BENEFICIOS ACTIVOS:</div>
                <ul class="sanctuary-perks-list">
                    ${currentTier.perks.map(p => `<li class="sanctuary-perk-item">${p}</li>`).join('')}
                </ul>
            </div>
        `;

        // Tarjeta del Siguiente Tier (si existe)
        if (nextTier) {
            const hasLvl = heroLvl >= nextTier.reqLevel;
            const hasMissions = missionsTotal >= nextTier.reqMissions;
            const hasGold = currentGold >= nextTier.cost;
            const canUpgrade = hasLvl && hasMissions && hasGold;

            html += `
                <div class="sanctuary-tier-card" style="border-color: var(--tier-gold, #ffd700);">
                    <div class="sanctuary-tier-header">
                        <span class="sanctuary-tier-title" style="color: var(--tier-gold, #ffd700);">
                            <img src="assets/star.png" class="sprite-icon small" alt="Star">
                            SIGUIENTE: ${nextTier.name}
                        </span>
                        <span class="sanctuary-tier-level-badge" style="background: rgba(255, 215, 0, 0.15); border-color: var(--tier-gold, #ffd700);">NIVEL ${nextTier.id}</span>
                    </div>
                    <div class="sanctuary-tier-desc">${nextTier.desc}</div>

                    <div class="sanctuary-perks-title">> REQUISITOS DE CONSTRUCCIÓN:</div>
                    <div class="sanctuary-req-grid">
                        <div class="sanctuary-req-item ${hasLvl ? 'met' : 'unmet'}">
                            <span class="sanctuary-req-label">NIVEL HÉROE</span>
                            <span class="sanctuary-req-val">${heroLvl} / ${nextTier.reqLevel} ${hasLvl ? '✔' : '✖'}</span>
                        </div>
                        <div class="sanctuary-req-item ${hasMissions ? 'met' : 'unmet'}">
                            <span class="sanctuary-req-label">MISIONES</span>
                            <span class="sanctuary-req-val">${missionsTotal} / ${nextTier.reqMissions} ${hasMissions ? '✔' : '✖'}</span>
                        </div>
                        <div class="sanctuary-req-item ${hasGold ? 'met' : 'unmet'}">
                            <span class="sanctuary-req-label">COSTE ORO</span>
                            <span class="sanctuary-req-val">${currentGold} / ${nextTier.cost} 🪙</span>
                        </div>
                    </div>

                    <div class="sanctuary-perks-title">> DESBLOQUEARÁ:</div>
                    <ul class="sanctuary-perks-list">
                        ${nextTier.perks.map(p => `<li class="sanctuary-perk-item" style="color: var(--primary-color);">${p}</li>`).join('')}
                    </ul>
                </div>

                <button class="btn-upgrade-sanctuary" ${canUpgrade ? '' : 'disabled'} onclick="BaseUI.buySanctuaryUpgrade(${nextTier.id})">
                    ${canUpgrade ? `🔨 CONSTRUIR ${nextTier.name.toUpperCase()} (${nextTier.cost} ORO)` : '🔨 REQUISITOS INSUFICIENTES'}
                </button>
            `;
        } else {
            html += `
                <button class="btn-upgrade-sanctuary" disabled style="background: var(--tier-gold, #ffd700); opacity: 0.9; color: #000;">
                    ★ SANTUARIO EN SU MÁXIMO ESPLENDOR (NIVEL 3)
                </button>
            `;
        }

        // Acceso rápido de pruebas y balance
        html += `
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button class="btn-pixel" style="flex: 1; padding: 8px 10px; font-size: 0.58rem; background: rgba(255, 215, 0, 0.18); border-color: var(--tier-gold, #ffd700); color: var(--tier-gold, #ffd700); cursor: pointer;" onclick="BaseUI.testMax()" title="Maxear nivel, misiones y oro para probar la evolución">
                    ⚡ MAXEAR RECURSOS Y STATS (MODO PRUEBA)
                </button>
            </div>
        `;

        body.innerHTML = html;
    },

    buySanctuaryUpgrade(targetTierId) {
        const nextTier = this.TIERS[targetTierId];
        if (!nextTier) return;

        const heroLvl = StateManager.data?.hero?.level || 1;
        const missionsTotal = StateManager.data?.counters?.missionsTotal || 0;
        const currentGold = StateManager.data?.economy?.gold || 0;

        if (heroLvl < nextTier.reqLevel || missionsTotal < nextTier.reqMissions || currentGold < nextTier.cost) {
            if (typeof showToast === 'function') showToast("REQUISITOS INSUFICIENTES", "Aún no cumples los requisitos de oro o misiones.", "warning");
            return;
        }

        // Deducir oro
        if (window.Economy && window.Economy.addGold) {
            Economy.addGold(-nextTier.cost);
        } else {
            StateManager.data.economy.gold -= nextTier.cost;
        }

        // Subir nivel
        StateManager.data.base.level = targetTierId;

        // Feedback sonoro y visual
        if (typeof playLevelUpSound === 'function') playLevelUpSound();
        if (window.FX) {
            FX.flash('gold');
            FX.shake('med');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#ffffff', '#ff9900', '#2ecc71', '#3498db'], 35);
        }

        if (typeof showToast === 'function') {
            showToast("¡SANTUARIO EVOLUCIONADO!", `¡Tu base ha ascendido a ${nextTier.name} (Nivel ${targetTierId})!`);
        }

        this.updateLocationBadge();
        this.renderUpgradeModal();
        EventBus.emit('state:updated');
    },

    // ------------------------------------------------------------------------
    // TESTING SUITE (PROBAR EVOLUCIÓN Y STATS)
    // ------------------------------------------------------------------------
    testMax() {
        try {
            if (typeof StateManager === 'undefined' || !StateManager.data) return;

            // 1. Hero
            if (!StateManager.data.hero) {
                StateManager.data.hero = { level: 1, xp: 0, totalXpEarned: 0, hp: 100, maxHp: 100, deaths: 0 };
            }
            StateManager.data.hero.level = 25;
            StateManager.data.hero.xp = 0;
            StateManager.data.hero.hp = 100;
            StateManager.data.hero.maxHp = 100;
            StateManager.data.hero.totalXpEarned = 25000;

            // 2. Economy / Gold (3000 Oro de sobra para Tier 2 [150] y Tier 3 [350])
            if (!StateManager.data.economy) StateManager.data.economy = { gold: 0 };
            StateManager.data.economy.gold = 3000;

            // 3. Counters (50 misiones cumple con creces los 30 de Tier 3)
            if (!StateManager.data.counters) {
                StateManager.data.counters = { missionsTotal: 0, perStat: {}, perLevel: {}, perfectDays: 0 };
            }
            StateManager.data.counters.missionsTotal = 50;
            StateManager.data.counters.perfectDays = 25;
            StateManager.data.counters.perStat = { fuerza: 15, sabiduria: 15, creatividad: 10, carisma: 10 };

            // 4. Stats
            if (!StateManager.data.stats) StateManager.data.stats = {};
            ['fuerza', 'sabiduria', 'creatividad', 'carisma'].forEach(stat => {
                StateManager.data.stats[stat] = {
                    current: 100,
                    max: 100,
                    level: 15
                };
            });

            // 5. Streak
            if (!StateManager.data.streak) {
                StateManager.data.streak = { current: 0, best: 0, shields: 0 };
            }
            StateManager.data.streak.current = 14;
            StateManager.data.streak.shields = 2;

            // 6. Base tier
            if (!StateManager.data.base) {
                StateManager.data.base = { level: 1 };
            }

            // Guardado síncrono e instantáneo en LocalStorage
            try {
                StateManager.save();
            } catch(e) {
                console.warn("Autosave test error", e);
            }

            // Refrescar barras y UI
            if (typeof renderStats === 'function') renderStats();
            if (typeof renderMissions === 'function') renderMissions();
            if (typeof HUD !== 'undefined' && typeof HUD.render === 'function') HUD.render();

            this.updateLocationBadge();
            this.updateWeather();
            this.renderUpgradeModal();

            // Disparar eventos
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('state:updated');
                EventBus.emit('hero:xp_changed');
            }

            // Efectos y notificación
            if (typeof playLevelUpSound === 'function') playLevelUpSound();
            if (typeof FX !== 'undefined') {
                FX.flash('gold');
                FX.shake('med');
                FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#ffffff', '#ff9900', '#2ecc71'], 35);
            }

            if (typeof showToast === 'function') {
                showToast("⚡ STATS MAXEADAS (TEST)", "Nivel 25 • 3.000 Oro • 50 Misiones. ¡Listo para evolucionar!");
            }
        } catch(err) {
            console.error("Error en BaseUI.testMax:", err);
        }
    },

    setTier(tier) {
        if (typeof StateManager === 'undefined' || !StateManager.data) return;
        if (!StateManager.data.base) StateManager.data.base = { level: 1 };
        StateManager.data.base.level = Math.max(1, Math.min(3, tier));
        try { StateManager.save(); } catch(e) {}
        this.updateLocationBadge();
        this.renderUpgradeModal();
        EventBus.emit('state:updated');
        if (typeof showToast === 'function') {
            showToast("SANTUARIO MODIFICADO", `Base fijada en Nivel ${tier}.`);
        }
    },

    // ------------------------------------------------------------------------
    // COLLISION SYSTEM (AABB + FEET HITBOX + CORNER SLIP + DYNAMIC TIERS)
    // ------------------------------------------------------------------------
    getPlayerHitbox(x, y) {
        return {
            x: x + 4,
            y: y + 17,
            w: 12,
            h: 8
        };
    },

    getObstacleBoxes(map) {
        const T = this.TILE_SIZE;
        const boxes = [];
        const lvl = this.getBaseLevel();

        if (map === 'exterior') {
            // 1. Map Borders
            boxes.push({ x: 0, y: 0, w: this.WIDTH, h: 26 });
            boxes.push({ x: 0, y: this.HEIGHT - 26, w: this.WIDTH, h: 26 });
            boxes.push({ x: 0, y: 0, w: 22, h: this.HEIGHT });
            boxes.push({ x: this.WIDTH - 22, y: 0, w: 22, h: this.HEIGHT });

            // 2. Cabin Structure
            boxes.push({ x: 9 * T, y: 2 * T, w: 6 * T, h: 4 * T + 2 });
            boxes.push({ x: 9 * T, y: 6 * T - 4, w: 2 * T, h: 22 });
            boxes.push({ x: 12 * T + 4, y: 6 * T - 4, w: 2 * T + 20, h: 22 });

            // 3. Pond (Water body)
            boxes.push({ x: 3 * T + 2, y: 3 * T + 4, w: 4 * T - 4, h: 3 * T + 10 });

            // 4. Trees (Trunk bases only)
            const trees = [
                { x: 1 * T, y: 7 * T },
                { x: 7 * T, y: 3 * T },
                { x: 21 * T, y: 6 * T },
                { x: 21 * T, y: 11 * T }
            ];
            trees.forEach(tr => {
                boxes.push({ x: tr.x + 8, y: tr.y + 24, w: 8, h: 10 });
            });

            // 5. Training Dummy
            boxes.push({ x: 4 * T + 6, y: 11 * T + 14, w: 12, h: 8 });

            // 6. Reading Bench
            boxes.push({ x: 18 * T + 2, y: 4 * T + 10, w: 20, h: 12 });

            // 7. Notice Board
            boxes.push({ x: 8 * T + 3, y: 9 * T + 12, w: 18, h: 10 });

            // 8. Tier 2+: Huerto Zen (Planter Box)
            if (lvl >= 2) {
                boxes.push({ x: 17 * T, y: 7.5 * T + 6, w: 2.5 * T, h: 2 * T - 8 });
            }

            // 9. Tier 3: Estatua Monumental del Héroe
            if (lvl >= 3) {
                boxes.push({ x: 6.5 * T, y: 10.5 * T + 8, w: 2 * T, h: 16 });
            }

        } else {
            // Interior Map (Cozy Cabin)
            boxes.push({ x: 0, y: 0, w: this.WIDTH, h: 56 });
            boxes.push({ x: 0, y: 0, w: 46, h: this.HEIGHT });
            boxes.push({ x: 402, y: 0, w: 180, h: this.HEIGHT });
            boxes.push({ x: 46, y: 284, w: 148, h: 100 });
            boxes.push({ x: 236, y: 284, w: 170, h: 100 });

            // Bed
            boxes.push({ x: 2 * T + 4, y: 2 * T + 8, w: 2 * T - 8, h: 2 * T + 10 });

            // Bookshelf
            boxes.push({ x: 5 * T, y: 2 * T, w: 2 * T, h: 2 * T - 4 });

            // Fireplace
            boxes.push({ x: 8 * T, y: 2 * T, w: 2 * T, h: 2 * T - 2 });

            // Wardrobe (ends at y: 94)
            boxes.push({ x: 13 * T, y: 2 * T, w: 2 * T, h: 2 * T - 2 });

            // Chest
            boxes.push({ x: 15 * T + 2, y: 5 * T + 4, w: 20, h: 18 });

            // Strategy Desk
            boxes.push({ x: 13 * T + 2, y: 8 * T + 4, w: 2 * T - 4, h: 2 * T - 8 });

            // Tier 2+: Gramophone Pedestal Table
            if (lvl >= 2) {
                boxes.push({ x: 7.2 * T, y: 2.2 * T + 4, w: 18, h: 20 });
            }

            // Tier 3: Armor Display Stand
            if (lvl >= 3) {
                boxes.push({ x: 11 * T, y: 2.2 * T + 4, w: 22, h: 22 });
            }
        }

        return boxes;
    },

    canMoveTo(x, y) {
        const box = this.getPlayerHitbox(x, y);
        const obstacles = this.getObstacleBoxes(this.currentMap);

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (box.x < obs.x + obs.w &&
                box.x + box.w > obs.x &&
                box.y < obs.y + obs.h &&
                box.y + box.h > obs.y) {
                return false;
            }
        }
        return true;
    },

    // ------------------------------------------------------------------------
    // GAME LOOP
    // ------------------------------------------------------------------------
    loop(timestamp) {
        if (!this.isRunning) return;

        this.tick++;
        this.update();
        this.render();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    },

    update() {
        if (this.warp.active) {
            if (this.warp.stage === 'in') {
                this.warp.alpha += 0.08;
                if (this.warp.alpha >= 1) {
                    this.warp.alpha = 1;
                    this.warp.stage = 'out';
                    this.currentMap = this.warp.targetMap;
                    this.player.x = this.warp.targetX;
                    this.player.y = this.warp.targetY;
                    this.player.dir = this.warp.targetDir;
                    this.player.targetX = null;
                    this.player.targetY = null;
                    this.updateLocationBadge();
                }
            } else {
                this.warp.alpha -= 0.08;
                if (this.warp.alpha <= 0) {
                    this.warp.alpha = 0;
                    this.warp.active = false;
                }
            }
            return;
        }

        if (this.dialogue.active) return;

        this.updatePlayerMovement();
        this.updatePetAI();
        this.updateParticles();
        this.updateInteractiveDetection();
    },

    updatePlayerMovement() {
        const p = this.player;
        let moveX = 0;
        let moveY = 0;

        // Click-to-move vector
        if (p.targetX !== null && p.targetY !== null) {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 3) {
                moveX = dx / dist;
                moveY = dy / dist;
            } else {
                p.targetX = null;
                p.targetY = null;
            }
        } else {
            // Keyboard / D-pad vectors
            if (this.keys.up) moveY -= 1;
            if (this.keys.down) moveY += 1;
            if (this.keys.left) moveX -= 1;
            if (this.keys.right) moveX += 1;

            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.7071;
                moveY *= 0.7071;
            }
        }

        p.isMoving = (moveX !== 0 || moveY !== 0);

        if (p.isMoving) {
            if (Math.abs(moveX) > Math.abs(moveY)) {
                p.dir = moveX > 0 ? 'right' : 'left';
            } else {
                p.dir = moveY > 0 ? 'down' : 'up';
            }

            const currentSpeed = p.speed * (this.keys.sprint ? p.runMultiplier : 1);
            const deltaX = moveX * currentSpeed;
            const deltaY = moveY * currentSpeed;

            // X-AXIS WITH CORNER ASSIST
            if (deltaX !== 0) {
                const step = Math.sign(deltaX);
                const absDelta = Math.abs(deltaX);
                let moved = 0;

                while (moved < absDelta) {
                    const sub = Math.min(1, absDelta - moved) * step;
                    if (this.canMoveTo(p.x + sub, p.y)) {
                        p.x += sub;
                        moved += Math.abs(sub);
                    } else {
                        if (deltaY === 0) {
                            if (this.canMoveTo(p.x + sub, p.y - 3)) p.y -= 1.0;
                            else if (this.canMoveTo(p.x + sub, p.y + 3)) p.y += 1.0;
                        }
                        break;
                    }
                }
            }

            // Y-AXIS WITH CORNER ASSIST
            if (deltaY !== 0) {
                const step = Math.sign(deltaY);
                const absDelta = Math.abs(deltaY);
                let moved = 0;

                while (moved < absDelta) {
                    const sub = Math.min(1, absDelta - moved) * step;
                    if (this.canMoveTo(p.x, p.y + sub)) {
                        p.y += sub;
                        moved += Math.abs(sub);
                    } else {
                        if (deltaX === 0) {
                            if (this.canMoveTo(p.x - 3, p.y + sub)) p.x -= 1.0;
                            else if (this.canMoveTo(p.x + 3, p.y + sub)) p.x += 1.0;
                        }
                        break;
                    }
                }
            }

            p.walkDistance += currentSpeed;
            p.walkFrame = Math.floor(p.walkDistance / 8) % 4;

            this.checkWarpTriggers();
        } else {
            p.walkFrame = 0;
            p.walkDistance = 0;
        }
    },

    checkWarpTriggers() {
        const p = this.player;
        const T = this.TILE_SIZE;

        if (this.currentMap === 'exterior') {
            if (p.x >= 11 * T - 2 && p.x <= 12 * T && p.y >= 5.8 * T && p.y <= 6.5 * T && p.dir === 'up') {
                this.triggerWarp('interior', 8.5 * T, 10.5 * T, 'up');
            }
        } else {
            if (p.x >= 8 * T && p.x <= 10 * T && p.y >= 11 * T - 6 && p.dir === 'down') {
                this.triggerWarp('exterior', 11 * T, 6.8 * T, 'down');
            }
        }
    },

    triggerWarp(targetMap, targetX, targetY, targetDir) {
        if (this.warp.active) return;
        this.warp.active = true;
        this.warp.stage = 'in';
        this.warp.alpha = 0;
        this.warp.targetMap = targetMap;
        this.warp.targetX = targetX;
        this.warp.targetY = targetY;
        this.warp.targetDir = targetDir;

        if (typeof playModalOpenSound === 'function') {
            playModalOpenSound();
        }
    },

    updateLocationBadge() {
        const lvl = this.getBaseLevel();
        const tier = this.TIERS[lvl] || this.TIERS[1];

        const zoneBadge = document.getElementById('sanctuary-zone-badge');
        if (zoneBadge) {
            const locName = this.currentMap === 'exterior' ? 'JARDÍN' : 'CABAÑA';
            zoneBadge.textContent = `[ NV.${lvl} ${tier.name.toUpperCase()} • ${locName} ]`;
        }

        const upgradeBtn = document.getElementById('btn-sanctuary-upgrade');
        if (upgradeBtn) {
            upgradeBtn.textContent = lvl < 3 ? `🔨 MEJORAR (NV. ${lvl})` : '★ MAX (NV. 3)';
        }
    },

    // ------------------------------------------------------------------------
    // PET COMPANION AI (CHISPA)
    // ------------------------------------------------------------------------
    updatePetAI() {
        const pet = this.pet;
        const p = this.player;

        for (let i = pet.hearts.length - 1; i >= 0; i--) {
            const h = pet.hearts[i];
            h.y -= 0.6;
            h.alpha -= 0.02;
            if (h.alpha <= 0) {
                pet.hearts.splice(i, 1);
            }
        }

        const dx = (p.x + p.width / 2) - (pet.x + 8);
        const dy = (p.y + p.height / 2) - (pet.y + 8);
        const dist = Math.hypot(dx, dy);

        if (dist < 40) {
            if (Math.abs(dx) > Math.abs(dy)) {
                pet.dir = dx > 0 ? 'right' : 'left';
            } else {
                pet.dir = dy > 0 ? 'down' : 'up';
            }
        }

        if (dist > 75) {
            const speed = 1.3;
            pet.x += (dx / dist) * speed;
            pet.y += (dy / dist) * speed;
            pet.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            pet.hopOffset = Math.sin(this.tick * 0.2) * 3;
        } else {
            pet.wanderTimer--;
            if (pet.wanderTimer <= 0) {
                pet.wanderTimer = 90 + Math.floor(Math.random() * 120);
                if (Math.random() > 0.45) {
                    pet.targetX = p.x + (Math.random() * 60 - 30);
                    pet.targetY = p.y + (Math.random() * 60 - 30);
                } else {
                    pet.targetX = null;
                    pet.targetY = null;
                }
            }

            if (pet.targetX !== null && pet.targetY !== null) {
                const pdx = pet.targetX - pet.x;
                const pdy = pet.targetY - pet.y;
                const pdist = Math.hypot(pdx, pdy);
                if (pdist > 2) {
                    pet.x += (pdx / pdist) * 0.7;
                    pet.y += (pdy / pdist) * 0.7;
                    pet.hopOffset = Math.sin(this.tick * 0.15) * 2;
                } else {
                    pet.targetX = null;
                    pet.targetY = null;
                    pet.hopOffset = 0;
                }
            } else {
                pet.hopOffset = Math.sin(this.tick * 0.08) * 1.5;
            }
        }
    },

    // ------------------------------------------------------------------------
    // PARTICLES (WEATHER & AMBIENCE)
    // ------------------------------------------------------------------------
    updateParticles() {
        if (this.currentMap === 'exterior') {
            if (this.weatherType === 'rain' && this.particles.length < 50) {
                this.particles.push({
                    type: 'rain',
                    x: Math.random() * this.WIDTH,
                    y: -10,
                    vx: -1.5,
                    vy: 7 + Math.random() * 3,
                    len: 8 + Math.random() * 6
                });
            } else if (this.weatherType === 'sunny' && this.particles.length < 25) {
                this.particles.push({
                    type: 'sparkle',
                    x: Math.random() * this.WIDTH,
                    y: Math.random() * this.HEIGHT,
                    alpha: 1,
                    size: 2 + Math.random() * 2
                });
            } else if (this.weatherType === 'clear' && this.particles.length < 15) {
                this.particles.push({
                    type: 'leaf',
                    x: this.WIDTH + 10,
                    y: Math.random() * this.HEIGHT,
                    vx: -1.2 - Math.random() * 0.8,
                    vy: 0.6 + Math.sin(this.tick * 0.1) * 0.4,
                    alpha: 0.9
                });
            }

            // Chimney smoke
            if (this.tick % 16 === 0) {
                this.particles.push({
                    type: 'smoke',
                    x: 13.6 * this.TILE_SIZE,
                    y: 1.8 * this.TILE_SIZE,
                    vx: -0.3 + (Math.random() * 0.6 - 0.3),
                    vy: -0.7,
                    radius: 2.5,
                    alpha: 0.85
                });
            }
        } else {
            // Interior fireplace sparks
            if (this.tick % 12 === 0) {
                this.particles.push({
                    type: 'ember',
                    x: 9 * this.TILE_SIZE + (Math.random() * 16 - 8),
                    y: 2.7 * this.TILE_SIZE,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: -0.8 - Math.random() * 0.6,
                    radius: 1.5,
                    alpha: 1
                });
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === 'rain') {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y > this.HEIGHT) this.particles.splice(i, 1);
            } else if (p.type === 'sparkle') {
                p.alpha -= 0.015;
                if (p.alpha <= 0) this.particles.splice(i, 1);
            } else if (p.type === 'leaf') {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) this.particles.splice(i, 1);
            } else if (p.type === 'smoke') {
                p.x += p.vx;
                p.y += p.vy;
                p.radius += 0.06;
                p.alpha -= 0.012;
                if (p.alpha <= 0) this.particles.splice(i, 1);
            } else if (p.type === 'ember') {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.03;
                if (p.alpha <= 0) this.particles.splice(i, 1);
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 0.7;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    },

    // ------------------------------------------------------------------------
    // INTERACTION DETECTION & ACTIONS
    // ------------------------------------------------------------------------
    updateInteractiveDetection() {
        const p = this.player;
        const px = p.x + p.width / 2;
        const py = p.y + p.height / 2;

        const interactives = this.getInteractivesList();
        let closest = null;
        let minDist = 50; // Comfortable range threshold

        interactives.forEach(item => {
            const d = Math.hypot(item.x - px, item.y - py);
            if (d < minDist) {
                minDist = d;
                closest = item;
            }
        });

        this.currentInteractive = closest;
    },

    getInteractivesList() {
        const T = this.TILE_SIZE;
        const list = [];
        const lvl = this.getBaseLevel();

        if (this.currentMap === 'exterior') {
            list.push({
                x: 11.5 * T,
                y: 6.5 * T,
                name: 'Cabaña del Héroe',
                prompt: '[E] Entrar a Casa',
                action: () => this.triggerWarp('interior', 8.5 * T, 10.5 * T, 'up')
            });
            list.push({
                x: 4.5 * T,
                y: 11.5 * T,
                name: 'Maniquí de Entrenamiento',
                prompt: lvl >= 2 ? '[E] Entrenar Combos' : '[E] Entrenar (Fuerza)',
                action: () => this.interactDummy()
            });
            list.push({
                x: 18.5 * T,
                y: 4.8 * T,
                name: 'Banco de Lectura',
                prompt: '[E] Meditar (Sabiduría)',
                action: () => this.interactReadingBench()
            });
            list.push({
                x: 8.5 * T,
                y: 9.8 * T,
                name: 'Tablón de Tareas',
                prompt: '[E] Ver Misiones',
                action: () => {
                    if (typeof showPanel === 'function') showPanel('missions');
                }
            });
            list.push({
                x: this.pet.x + 8,
                y: this.pet.y + 8,
                name: this.getPetName(),
                prompt: `[E] Acariciar a ${this.getPetName()}`,
                action: () => this.interactPet()
            });

            // Tier 2+: Huerto Zen
            if (lvl >= 2) {
                list.push({
                    x: 18 * T,
                    y: 8.5 * T,
                    name: 'Huerto Zen',
                    prompt: '[E] Cosechar Huerto Zen',
                    action: () => this.interactZenGarden()
                });
            }

            // Tier 3: Estatua Monumental del Héroe
            if (lvl >= 3) {
                list.push({
                    x: 7.5 * T,
                    y: 11.5 * T,
                    name: 'Estatua del Héroe',
                    prompt: '[E] Meditar ante la Estatua',
                    action: () => this.interactHeroStatue()
                });
            }
        } else {
            // Interior interactives
            list.push({
                x: 9.5 * T,
                y: 11.2 * T,
                name: 'Puerta Principal',
                prompt: '[E] Salir al Santuario',
                action: () => this.triggerWarp('exterior', 11 * T, 6.8 * T, 'down')
            });
            list.push({
                x: 4.2 * T,
                y: 4.0 * T,
                name: 'Cama de Descanso',
                prompt: '[E] Descansar / Guardar',
                action: () => this.interactBed()
            });
            // MIRROR & WARDROBE (x: 14 * T = 336, y: 4.2 * T = 100.8)
            list.push({
                x: 14.0 * T,
                y: 4.2 * T,
                name: 'Espejo y Armario',
                prompt: '[E] Perfil del Héroe',
                action: () => {
                    if (typeof openModal === 'function') openModal('profile-modal');
                }
            });
            list.push({
                x: 6.0 * T,
                y: 4.0 * T,
                name: 'Biblioteca de Crónicas',
                prompt: '[E] Ver Logros y Medallas',
                action: () => {
                    if (window.ChronicleUI) ChronicleUI.open();
                }
            });
            list.push({
                x: 15.5 * T,
                y: 5.8 * T,
                name: 'Cofre del Tesoro',
                prompt: `[E] Cofre (${StateManager.data?.economy?.gold || 0} Oro)`,
                action: () => this.interactChest()
            });
            list.push({
                x: 13.0 * T,
                y: 8.8 * T,
                name: 'PC y Mesa de Estrategia',
                prompt: '[E] Tablón de Misiones',
                action: () => {
                    if (typeof showPanel === 'function') showPanel('missions');
                }
            });
            list.push({
                x: 9.0 * T,
                y: 4.0 * T,
                name: 'Chimenea Cálida',
                prompt: '[E] Calentarse en el fuego',
                action: () => this.interactFireplace()
            });

            // Planos del Santuario (siempre accesible en el interior)
            list.push({
                x: 11.2 * T,
                y: 8.8 * T,
                name: 'Planos del Arquitecto',
                prompt: `[E] Planos del Santuario (Nv. ${lvl})`,
                action: () => this.openUpgradeModal()
            });

            // Tier 2+: Gramófono de la Bardo
            if (lvl >= 2) {
                list.push({
                    x: 7.5 * T,
                    y: 3.5 * T,
                    name: 'Gramófono de la Bardo',
                    prompt: '[E] Tocar Gramófono (Música)',
                    action: () => this.interactGramophone()
                });
            }

            list.push({
                x: this.pet.x + 8,
                y: this.pet.y + 8,
                name: this.getPetName(),
                prompt: `[E] Acariciar a ${this.getPetName()}`,
                action: () => this.interactPet()
            });
        }

        return list;
    },

    handleInteraction() {
        if (this.dialogue.active) {
            this.closeDialogue();
            return;
        }

        if (this.currentInteractive && this.currentInteractive.action) {
            this.currentInteractive.action();
        }
    },

    getPetName() {
        return StateManager.data?.pet?.name || 'Chispa';
    },

    interactPet() {
        const pet = this.pet;
        pet.loveCount++;

        for (let i = 0; i < 3; i++) {
            pet.hearts.push({
                x: pet.x + 4 + (Math.random() * 12 - 6),
                y: pet.y - (i * 6),
                alpha: 1
            });
        }

        pet.hopOffset = -6;

        if (typeof playLevelUpSound === 'function') {
            playLevelUpSound();
        }

        const dialogues = [
            `¡${this.getPetName()} mueve su cola de fuego alegremente y te da un cálido empujón!`,
            `¡${this.getPetName()} emite un suave ronroneo chispeante y se acurruca a tus pies!`,
            `¡Los ojos de ${this.getPetName()} brillan de felicidad! Siente tu compromiso diario.`
        ];
        const chosen = dialogues[pet.loveCount % dialogues.length];
        this.openDialogue(`COMPAÑERO: ${this.getPetName()}`, chosen);
    },

    interactDummy() {
        if (typeof playHitSound === 'function') playHitSound();
        else if (typeof playTrashSound === 'function') playTrashSound();

        const lvl = this.getBaseLevel();
        const text = lvl >= 2 ? '¡COMBO! +2 FUERZA' : '¡SLASH! +1 FUERZA';

        this.floatingTexts.push({
            x: 4 * this.TILE_SIZE + 4,
            y: 11 * this.TILE_SIZE,
            text: text,
            color: '#ff5555',
            alpha: 1
        });

        const desc = lvl >= 2
            ? 'Tus hojas resuenan contra el escudo y la cota de malla del maniquí reforzado. Tu técnica marcial se perfecciona cada día.'
            : 'Tus golpes resuenan con precisión marcial. Cada entrenamiento forja la disciplina de un verdadero guerrero.';

        this.openDialogue('MANIQUÍ DE ENTRENAMIENTO', desc);
    },

    interactReadingBench() {
        if (typeof playClickSound === 'function') playClickSound();

        this.floatingTexts.push({
            x: 18 * this.TILE_SIZE,
            y: 4 * this.TILE_SIZE,
            text: '+1 SABIDURÍA',
            color: '#55aaff',
            alpha: 1
        });

        this.openDialogue('BANCO DE LECTURA', '"El sabio no es quien nunca se distrae, sino quien siempre encuentra el camino de regreso a su objetivo." — Anales del Héroe');
    },

    interactBed() {
        if (typeof playClickSound === 'function') playClickSound();
        this.openDialogue('CAMA DEL HÉROE', 'Un lugar cálido y mullido para recargar tu energía. ¿Deseas guardar tu partida ahora?', () => {
            if (window.SaveSystem && SaveSystem.saveLocal) {
                SaveSystem.saveLocal();
            }
        });
    },

    interactChest() {
        if (typeof playCoinSound === 'function') playCoinSound();
        else if (typeof playClickSound === 'function') playClickSound();

        const gold = StateManager.data?.economy?.gold || 0;
        this.openDialogue('COFRE DE TESOROS', `Contiene ${gold} Monedas de Oro ganadas con honor. ¡Completa tus misiones de hoy para enriquecer tus arcas!`);
    },

    interactFireplace() {
        if (typeof playClickSound === 'function') playClickSound();
        this.openDialogue('HOGUERA DEL HOGAR', 'Las brasas crepitan suavemente iluminando el salón. La calidez de este refugio es la recompensa de tu disciplina.');
    },

    interactZenGarden() {
        if (typeof playSuccessSound === 'function') playSuccessSound();

        const today = Utils.getTodayISO();
        if (!StateManager.data.base) StateManager.data.base = { level: 2 };

        if (StateManager.data.base.lastZenHarvest === today) {
            this.openDialogue('HUERTO ZEN', 'Los brotes medicinales reposan al sol. Vuelve mañana para cosechar nuevas hierbas revitalizantes.');
            return;
        }

        // Recompensa diaria del huerto
        StateManager.data.base.lastZenHarvest = today;
        Hero.addXp(15);
        if (window.Economy && window.Economy.addGold) {
            Economy.addGold(10);
        } else {
            StateManager.data.economy.gold = (StateManager.data.economy.gold || 0) + 10;
        }

        if (window.FX) {
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#2ecc71', '#27ae60', '#f1c40f', '#ffffff'], 22);
        }

        this.floatingTexts.push({
            x: 17 * this.TILE_SIZE,
            y: 8 * this.TILE_SIZE,
            text: '🌿 +15 XP • +10 ORO 🪙',
            color: '#2ecc71',
            alpha: 1
        });

        this.openDialogue('HUERTO ZEN', '¡Has cosechado hierbas medicinales aromáticas! Tu energía se renueva por completo: has recibido +15 XP y +10 Monedas de Oro 🪙.');
        EventBus.emit('state:updated');
    },

    interactHeroStatue() {
        if (typeof playLevelUpSound === 'function') playLevelUpSound();

        const today = Utils.getTodayISO();
        if (!StateManager.data.base) StateManager.data.base = { level: 3 };

        if (StateManager.data.base.lastStatueBlessing === today) {
            this.openDialogue('ESTATUA DEL HÉROE', `La efigie dorada de ${StateManager.data.profile.name} resplandece con honor. La bendición de hoy ya acompaña tus pasos.`);
            return;
        }

        // Bendición monumental diaria
        StateManager.data.base.lastStatueBlessing = today;
        Hero.addXp(30);

        if (window.FX) {
            FX.flash('gold');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#ffea00', '#ffffff', '#e67e22'], 30);
        }

        this.floatingTexts.push({
            x: 6.5 * this.TILE_SIZE,
            y: 10 * this.TILE_SIZE,
            text: '★ BENDICIÓN: +30 XP',
            color: '#ffd700',
            alpha: 1
        });

        this.openDialogue('BENDICIÓN MONUMENTAL', `Miras con orgullo la estatua del gran ${StateManager.data.profile.name}. ¡Sientes el fervor de tus hazañas pasadas: has recibido +30 XP!`);
        EventBus.emit('state:updated');
    },

    interactGramophone() {
        if (typeof playClickSound === 'function') playClickSound();

        const tracks = ['1', '2', '3', '4'];
        const current = StateManager.data.settings.bgmTrack || '1';
        const nextIdx = (tracks.indexOf(current) + 1) % tracks.length;
        const nextTrack = tracks[nextIdx];

        StateManager.data.settings.bgmTrack = nextTrack;
        const select = document.getElementById('bgm-select');
        if (select) select.value = nextTrack;
        if (typeof changeBGM === 'function') changeBGM();

        const trackNames = {
            '1': 'Aventura en el Bosque',
            '2': 'Castillo de Cristal',
            '3': 'Ciudad del Crepúsculo',
            '4': 'Valle de las Sombras'
        };

        const chosenName = trackNames[nextTrack] || `Pista ${nextTrack}`;

        this.floatingTexts.push({
            x: 7 * this.TILE_SIZE,
            y: 3 * this.TILE_SIZE,
            text: `🎵 ${chosenName}`,
            color: '#ffd700',
            alpha: 1
        });

        this.openDialogue('GRAMÓFONO DE LA BARDO', `La aguja de bronce se posa sobre el disco de vinilo... Ahora sonando: "🎵 ${chosenName}".`);
        EventBus.emit('state:updated');
    },

    openDialogue(title, text, onConfirm = null) {
        this.dialogue.active = true;
        this.dialogue.title = title;
        this.dialogue.text = text;

        const box = document.getElementById('sanctuary-dialogue-box');
        const titleEl = document.getElementById('sanctuary-dialogue-title');
        const textEl = document.getElementById('sanctuary-dialogue-text');

        if (box && titleEl && textEl) {
            titleEl.textContent = `> ${title}`;
            textEl.textContent = text;
            box.classList.add('active');
        }

        if (onConfirm) onConfirm();
    },

    closeDialogue() {
        this.dialogue.active = false;
        const box = document.getElementById('sanctuary-dialogue-box');
        if (box) box.classList.remove('active');
    },

    // ------------------------------------------------------------------------
    // 16-BIT POKÉMON GBA RENDERING PIPELINE WITH DYNAMIC SANCTUARY TIERS
    // ------------------------------------------------------------------------
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        if (this.currentMap === 'exterior') {
            this.renderExteriorMap(ctx);
        } else {
            this.renderInteriorMap(ctx);
        }

        this.renderEntities(ctx);
        this.renderWeather(ctx);
        this.renderFloatingTexts(ctx);
        this.renderInteractionBubble(ctx);

        if (this.warp.active) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.warp.alpha})`;
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
    },

    // ------------------------------------------------------------------------
    // EXTERIOR MAP RENDERER
    // ------------------------------------------------------------------------
    renderExteriorMap(ctx) {
        const T = this.TILE_SIZE;
        const lvl = this.getBaseLevel();

        // 1. Grass Tiles Base
        for (let r = 0; r < 16; r++) {
            for (let c = 0; c < 24; c++) {
                const x = c * T;
                const y = r * T;

                ctx.fillStyle = ((c + r) % 2 === 0) ? '#5ba334' : '#52982d';
                ctx.fillRect(x, y, T, T);

                if ((c * 7 + r * 13) % 5 === 0) {
                    ctx.fillStyle = '#7ac942';
                    ctx.fillRect(x + 4, y + 8, 2, 4);
                    ctx.fillRect(x + 7, y + 6, 2, 6);
                    ctx.fillStyle = '#39721c';
                    ctx.fillRect(x + 5, y + 12, 4, 2);
                }
                if ((c * 11 + r * 3) % 7 === 0) {
                    ctx.fillStyle = '#7ac942';
                    ctx.fillRect(x + 14, y + 14, 2, 4);
                    ctx.fillRect(x + 17, y + 12, 2, 6);
                }

                if ((c * 17 + r * 5) % 19 === 0) {
                    this.drawWildFlower(ctx, x + 8, y + 10, 'red');
                } else if ((c * 13 + r * 11) % 23 === 0) {
                    this.drawWildFlower(ctx, x + 12, y + 14, 'blue');
                } else if ((c * 19 + r * 7) % 29 === 0) {
                    this.drawWildFlower(ctx, x + 6, y + 16, 'white');
                }
            }
        }

        // 2. Natural Winding Dirt Trail
        this.renderDirtTrail(ctx);

        // 3. Cabin Exterior
        this.drawCabinExterior(ctx, 9 * T, 2 * T);

        // Tier 2+: Wrought Iron Street Lanterns
        if (lvl >= 2) {
            this.drawStreetLantern(ctx, 9 * T - 8, 5.2 * T);
            this.drawStreetLantern(ctx, 14 * T + 20, 5.2 * T);
        }

        // 4. Pond
        this.drawPond(ctx, 3 * T, 3 * T);

        // 5. Training Yard (Standard or Armored in Tier 2+)
        this.drawTrainingDummy(ctx, 4 * T, 11 * T);

        // 6. Reading Bench
        this.drawReadingBench(ctx, 18 * T, 4 * T);

        // 7. Notice Board
        this.drawNoticeBoard(ctx, 8 * T, 9 * T);

        // Tier 2+: Zen Garden
        if (lvl >= 2) {
            this.drawZenGarden(ctx, 17 * T, 7.5 * T);
        }

        // Tier 3: Monumental Hero Statue & Runic Portal
        if (lvl >= 3) {
            this.drawHeroStatue(ctx, 6.5 * T, 10.5 * T);
            this.drawRunicPortal(ctx, 17.5 * T, 11.5 * T);
        }

        // 8. Outer Border Trees
        for (let c = 0; c < 24; c += 2) {
            this.drawPokemonTree(ctx, c * T, -10);
            this.drawPokemonTree(ctx, c * T, 14.2 * T);
        }
        for (let r = 1; r < 14; r += 2) {
            this.drawPokemonTree(ctx, -10, r * T);
            this.drawPokemonTree(ctx, 22.2 * T, r * T);
        }

        // Decorative inner trees
        this.drawPokemonTree(ctx, 1 * T, 6.5 * T);
        this.drawPokemonTree(ctx, 7 * T, 2.8 * T);
        this.drawPokemonTree(ctx, 20.5 * T, 5.5 * T);
        this.drawPokemonTree(ctx, 20.5 * T, 10.5 * T);
    },

    drawWildFlower(ctx, x, y, color) {
        ctx.fillStyle = color === 'red' ? '#e74c3c' : (color === 'blue' ? '#3498db' : '#f4f6f7');
        ctx.fillRect(x - 2, y, 2, 2);
        ctx.fillRect(x + 2, y, 2, 2);
        ctx.fillRect(x, y - 2, 2, 2);
        ctx.fillRect(x, y + 2, 2, 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x, y, 2, 2);
    },

    renderDirtTrail(ctx) {
        const T = this.TILE_SIZE;
        const trailSegments = [
            { x: 10.8 * T, y: 7 * T, w: 2.4 * T, h: 8 * T },
            { x: 5 * T, y: 7.5 * T, w: 6.5 * T, h: 2 * T },
            { x: 4.5 * T, y: 9 * T, w: 2.2 * T, h: 3.5 * T },
            { x: 8 * T, y: 10 * T, w: 3 * T, h: 1.8 * T }
        ];

        trailSegments.forEach(seg => {
            ctx.fillStyle = '#d4ae6e';
            ctx.fillRect(seg.x, seg.y, seg.w, seg.h);

            ctx.fillStyle = '#a68044';
            ctx.fillRect(seg.x, seg.y, seg.w, 2);
            ctx.fillRect(seg.x, seg.y + seg.h - 2, seg.w, 2);
            ctx.fillRect(seg.x, seg.y, 2, seg.h);
            ctx.fillRect(seg.x + seg.w - 2, seg.y, 2, seg.h);

            ctx.fillStyle = '#e8c688';
            for (let i = 4; i < seg.w - 4; i += 12) {
                ctx.fillRect(seg.x + i, seg.y + 4, 3, 2);
                ctx.fillRect(seg.x + i + 5, seg.y + seg.h - 6, 2, 2);
            }
            ctx.fillStyle = '#825e26';
            for (let i = 8; i < seg.w - 4; i += 14) {
                ctx.fillRect(seg.x + i, seg.y + seg.h / 2, 2, 2);
            }
        });
    },

    drawPokemonTree(ctx, x, y) {
        ctx.fillStyle = 'rgba(20, 50, 15, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 46, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#643818';
        ctx.fillRect(x + 16, y + 26, 12, 18);
        ctx.fillStyle = '#8a5226';
        ctx.fillRect(x + 18, y + 28, 6, 16);
        ctx.fillStyle = '#42240c';
        ctx.fillRect(x + 17, y + 30, 2, 12);
        ctx.fillRect(x + 23, y + 32, 2, 10);
        ctx.fillStyle = '#643818';
        ctx.fillRect(x + 14, y + 42, 4, 3);
        ctx.fillRect(x + 26, y + 42, 4, 3);

        ctx.fillStyle = '#1b4a14';
        ctx.beginPath();
        ctx.arc(x + 22, y + 22, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2c6e1e';
        ctx.beginPath();
        ctx.arc(x + 22, y + 21, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#48982a';
        ctx.beginPath();
        ctx.arc(x + 20, y + 19, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#70c43c';
        ctx.beginPath();
        ctx.arc(x + 16, y + 14, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#9ae856';
        ctx.beginPath();
        ctx.arc(x + 14, y + 11, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1b4a14';
        ctx.fillRect(x + 26, y + 26, 8, 6);
        ctx.fillRect(x + 12, y + 28, 6, 4);
    },

    drawCabinExterior(ctx, startX, startY) {
        const T = this.TILE_SIZE;
        const w = 6 * T;
        const h = 5 * T;
        const lvl = this.getBaseLevel();

        ctx.fillStyle = 'rgba(20, 40, 15, 0.4)';
        ctx.fillRect(startX - 4, startY + 4 * T + 10, w + 8, 14);

        const roofH = 2.6 * T;
        ctx.fillStyle = lvl >= 3 ? '#2980b9' : '#b83b24';
        ctx.fillRect(startX, startY, w, roofH);

        const rowH = 10;
        for (let ry = 0; ry < roofH - 4; ry += rowH) {
            ctx.fillStyle = lvl >= 3 ? '#5dade2' : '#e66042';
            ctx.fillRect(startX, startY + ry, w, 2);
            ctx.fillStyle = lvl >= 3 ? '#1b4f72' : '#7a1f10';
            ctx.fillRect(startX, startY + ry + rowH - 2, w, 2);

            for (let rx = 12; rx < w - 8; rx += 16) {
                ctx.fillStyle = lvl >= 3 ? '#21618c' : '#8e2614';
                ctx.fillRect(startX + rx, startY + ry + 2, 2, rowH - 4);
            }
        }

        ctx.fillStyle = lvl >= 3 ? '#5dade2' : '#e66042';
        ctx.fillRect(startX - 2, startY, w + 4, 3);
        ctx.fillStyle = lvl >= 3 ? '#1b4f72' : '#7a1f10';
        ctx.fillRect(startX - 2, startY + 3, w + 4, 2);

        ctx.fillStyle = lvl >= 3 ? '#154360' : '#5a1408';
        ctx.fillRect(startX - 2, startY + roofH - 2, w + 4, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(startX + 4, startY + roofH + 2, w - 8, 6);

        // Stone Chimney
        const chimX = startX + 4.6 * T;
        const chimY = startY - 10;
        ctx.fillStyle = '#606a72';
        ctx.fillRect(chimX, chimY, 16, 26);
        ctx.fillStyle = '#85929e';
        ctx.fillRect(chimX - 2, chimY, 20, 4);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(chimX + 2, chimY - 1, 12, 2);
        ctx.fillStyle = '#414b53';
        ctx.fillRect(chimX, chimY + 8, 16, 1);
        ctx.fillRect(chimX, chimY + 16, 16, 1);

        // Walls
        const wallY = startY + roofH + 2;
        const wallH = h - roofH - 2;

        ctx.fillStyle = lvl >= 3 ? '#d5dbdb' : '#eee4cf';
        ctx.fillRect(startX + 4, wallY, w - 8, wallH);

        ctx.fillStyle = '#707b7c';
        ctx.fillRect(startX + 4, wallY + wallH - 6, w - 8, 6);
        ctx.fillStyle = '#99a3a4';
        ctx.fillRect(startX + 4, wallY + wallH - 6, w - 8, 1);

        ctx.fillStyle = lvl >= 3 ? '#2c3e50' : '#7a421a';
        ctx.fillRect(startX + 4, wallY, 8, wallH);
        ctx.fillRect(startX + w - 12, wallY, 8, wallH);
        ctx.fillStyle = lvl >= 3 ? '#34495e' : '#9e5927';
        ctx.fillRect(startX + 6, wallY, 4, wallH);
        ctx.fillRect(startX + w - 10, wallY, 4, wallH);

        this.drawCabinWindow(ctx, startX + 18, wallY + 6, lvl);
        this.drawCabinWindow(ctx, startX + w - 38, wallY + 6, lvl);

        // Door
        const doorX = startX + 2 * T;
        const doorY = wallY + 8;
        const doorW = 24;
        const doorH = wallH - 8;

        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(doorX - 2, doorY + doorH - 3, doorW + 4, 5);

        ctx.fillStyle = '#42240c';
        ctx.fillRect(doorX, doorY, doorW, doorH);

        ctx.fillStyle = lvl >= 3 ? '#1c2833' : '#743e16';
        ctx.fillRect(doorX + 2, doorY + 2, doorW - 4, doorH - 4);
        ctx.fillStyle = lvl >= 3 ? '#2c3e50' : '#5a2e0e';
        ctx.fillRect(doorX + 11, doorY + 2, 2, doorH - 4);

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(doorX + 18, doorY + 16, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(doorX + 19, doorY + 17, 1, 1);
    },

    drawCabinWindow(ctx, x, y, lvl) {
        const w = 18;
        const h = 18;

        ctx.fillStyle = lvl >= 3 ? '#1a252f' : '#542c10';
        ctx.fillRect(x, y, w, h);

        // Stained glass in Tier 3 or amber glow in Tier 1-2
        ctx.fillStyle = lvl >= 3 ? '#3498db' : '#ffe082';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 2);
        ctx.lineTo(x + 10, y + 2);
        ctx.lineTo(x + 2, y + 10);
        ctx.lineTo(x + 2, y + 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = lvl >= 3 ? '#1a252f' : '#542c10';
        ctx.fillRect(x + w / 2 - 1, y + 2, 2, h - 4);
        ctx.fillRect(x + 2, y + h / 2 - 1, w - 4, 2);

        // Flowerbox
        ctx.fillStyle = '#784421';
        ctx.fillRect(x - 1, y + h - 1, w + 2, 5);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x, y + h - 3, w, 2);
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(x + 2, y + h - 4, 3, 3);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(x + 7, y + h - 4, 3, 3);
        ctx.fillStyle = '#9b59b6'; ctx.fillRect(x + 12, y + h - 4, 3, 3);
    },

    drawStreetLantern(ctx, x, y) {
        // Iron post
        ctx.fillStyle = '#17202a';
        ctx.fillRect(x + 3, y, 4, 28);
        ctx.fillRect(x + 1, y + 25, 8, 3);

        // Lantern head
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x, y - 10, 10, 10);

        // Glowing Flame with ambient flicker
        const flicker = (this.tick % 6 > 3) ? 1 : 0;
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 2, y - 8, 6, 6);
        ctx.fillStyle = '#fff5b8';
        ctx.fillRect(x + 3, y - 7 + flicker, 4, 4);

        // Soft ground light pool
        ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 28, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    drawPond(ctx, startX, startY) {
        const T = this.TILE_SIZE;
        const w = 4 * T;
        const h = 3 * T + 8;
        const lvl = this.getBaseLevel();

        // 1. Shoreline
        ctx.fillStyle = '#d4ac68';
        ctx.beginPath();
        ctx.ellipse(startX + w / 2, startY + h / 2, w / 2 + 6, h / 2 + 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(startX + 4, startY + 2, 6, 4);
        ctx.fillRect(startX + w - 10, startY + 6, 7, 5);
        ctx.fillRect(startX + 8, startY + h - 6, 8, 4);
        ctx.fillRect(startX + w - 16, startY + h - 4, 6, 3);

        // 2. Water Depth Layers
        ctx.fillStyle = '#58b8d8';
        ctx.beginPath();
        ctx.ellipse(startX + w / 2, startY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3088c0';
        ctx.beginPath();
        ctx.ellipse(startX + w / 2, startY + h / 2, w / 2 - 6, h / 2 - 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1c5e96';
        ctx.beginPath();
        ctx.ellipse(startX + w / 2, startY + h / 2, w / 2 - 14, h / 2 - 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Shimmering Wavelets
        const ripOffset = Math.sin(this.tick * 0.08) * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(startX + 20 + ripOffset, startY + 18, 14, 2);
        ctx.fillRect(startX + w - 38 - ripOffset, startY + 36, 18, 2);

        // 4. Lily pads
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(startX + 24, startY + 32, 6, 0.4, Math.PI * 1.9);
        ctx.fill();
        ctx.fillStyle = '#fd79a8';
        ctx.fillRect(startX + 22, startY + 30, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(startX + 23, startY + 31, 1, 1);

        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(startX + w - 26, startY + 24, 5, 0.2, Math.PI * 1.8);
        ctx.fill();

        // Tier 2+: Zen Fountain & Swimming Koi Fish
        if (lvl >= 2) {
            this.drawKoiFish(ctx, startX + w / 2, startY + h / 2);
            this.drawZenFountain(ctx, startX + w / 2, startY + h / 2);
        }
    },

    drawZenFountain(ctx, cx, cy) {
        // Two-tiered carved stone fountain
        ctx.fillStyle = '#566573';
        ctx.fillRect(cx - 8, cy - 4, 16, 8);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(cx - 6, cy - 6, 12, 4);

        // Water jet bubbling
        const splash = Math.sin(this.tick * 0.2) * 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 12 - splash, 4, 6 + splash);
        ctx.fillStyle = '#aed6f1';
        ctx.fillRect(cx - 4, cy - 8, 8, 2);
    },

    drawKoiFish(ctx, cx, cy) {
        // Koi 1: Orange/Gold
        const a1 = this.tick * 0.035;
        const k1x = cx + Math.cos(a1) * 22;
        const k1y = cy + Math.sin(a1) * 14;

        ctx.fillStyle = '#e67e22';
        ctx.fillRect(k1x - 3, k1y - 2, 6, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(k1x - 4, k1y - 1, 2, 2);

        // Koi 2: Kohaku White & Ruby
        const a2 = this.tick * 0.035 + Math.PI;
        const k2x = cx + Math.cos(a2) * 18;
        const k2y = cy + Math.sin(a2) * 11;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(k2x - 3, k2y - 2, 6, 3);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(k2x - 1, k2y - 2, 3, 2);
    },

    drawZenGarden(ctx, x, y) {
        const w = 56;
        const h = 42;

        // Wooden planter frame
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

        // Tilled Soil Furrows
        ctx.fillStyle = '#2c1e18';
        for (let row = 6; row < h - 8; row += 10) {
            ctx.fillRect(x + 4, y + row, w - 8, 2);
        }

        // Crops & Vegetables
        // Row 1: Green Lettuces
        for (let col = 8; col < w - 8; col += 10) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + col, y + 6, 5, 5);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(x + col + 1, y + 7, 3, 3);
        }

        // Row 2: Carrots
        for (let col = 8; col < w - 8; col += 10) {
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(x + col + 1, y + 16, 3, 3);
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(x + col + 2, y + 19, 2, 2);
        }

        // Row 3: Aromatic Purple Herbs
        for (let col = 8; col < w - 8; col += 10) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(x + col, y + 26, 4, 4);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + col + 1, y + 30, 2, 3);
        }

        // Garden Signpost
        ctx.fillStyle = '#7a4e28';
        ctx.fillRect(x - 6, y + h - 14, 4, 14);
        ctx.fillStyle = '#d4ac68';
        ctx.fillRect(x - 9, y + h - 18, 10, 8);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x - 7, y + h - 16, 6, 4);
    },

    drawHeroStatue(ctx, x, y) {
        // Marble base
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(x, y + 16, 36, 12);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(x + 2, y + 14, 32, 4);

        // Inscribed Golden Plaque
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 8, y + 20, 20, 6);
        ctx.fillStyle = '#17202a';
        ctx.fillRect(x + 10, y + 22, 16, 2);

        // Golden Hero Statue
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 14, y + 2, 8, 14); // Body
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 15, y - 6, 6, 8);  // Helmet
        // Raised Sword
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 22, y - 14, 2, 20);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 20, y - 2, 6, 2);

        // Sparkles
        if (this.tick % 10 > 5) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 23, y - 16, 2, 2);
        }
    },

    drawRunicPortal(ctx, x, y) {
        // Stone dais
        ctx.fillStyle = '#566573';
        ctx.beginPath();
        ctx.ellipse(x + 18, y + 14, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing runic ring
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.ellipse(x + 18, y + 14, 17, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing portal core
        const pulse = Math.sin(this.tick * 0.1) * 2;
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.ellipse(x + 18, y + 14, 10 + pulse, 4 + pulse * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    drawTrainingDummy(ctx, x, y) {
        const lvl = this.getBaseLevel();

        ctx.fillStyle = '#c49d5a';
        ctx.beginPath();
        ctx.ellipse(x + 12, y + 18, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(x + 4, y + 18, 16, 4);

        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x + 10, y + 4, 4, 16);

        ctx.fillStyle = lvl >= 2 ? '#bdc3c7' : '#d4ac68';
        ctx.fillRect(x + 6, y - 4, 12, 14);
        ctx.fillStyle = lvl >= 2 ? '#7f8c8d' : '#b58b44';
        ctx.strokeRect(x + 6, y - 4, 12, 14);

        if (lvl >= 2) {
            // Iron Shield
            ctx.fillStyle = '#34495e';
            ctx.fillRect(x - 2, y, 6, 12);
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(x, y + 3, 2, 6);
        } else {
            ctx.fillStyle = '#5c3a1e';
            ctx.fillRect(x + 6, y, 12, 2);
            ctx.fillRect(x + 6, y + 5, 12, 2);
        }

        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(x + 20, y - 2, 2, 18);
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(x + 18, y + 10, 6, 3);
    },

    drawReadingBench(ctx, x, y) {
        ctx.fillStyle = 'rgba(20, 40, 15, 0.35)';
        ctx.fillRect(x, y + 14, 24, 6);

        ctx.fillStyle = '#a0522d';
        ctx.fillRect(x + 2, y + 4, 20, 4);
        ctx.fillRect(x + 2, y + 9, 20, 5);

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x + 3, y + 6, 3, 10);
        ctx.fillRect(x + 18, y + 6, 3, 10);

        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(x + 7, y + 6, 5, 4);
        ctx.fillRect(x + 12, y + 6, 5, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 11, y + 6, 2, 4);
    },

    drawNoticeBoard(ctx, x, y) {
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(x + 3, y + 10, 3, 14);
        ctx.fillRect(x + 18, y + 10, 3, 14);

        ctx.fillStyle = '#8d5b32';
        ctx.fillRect(x, y, 24, 14);
        ctx.fillStyle = '#543015';
        ctx.strokeRect(x, y, 24, 14);

        ctx.fillStyle = '#fdfefe';
        ctx.fillRect(x + 3, y + 2, 7, 9);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 5, y + 2, 3, 2);

        ctx.fillStyle = '#fef9e7';
        ctx.fillRect(x + 13, y + 3, 8, 8);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x + 16, y + 3, 3, 2);
    },

    // ------------------------------------------------------------------------
    // INTERIOR MAP RENDERER
    // ------------------------------------------------------------------------
    renderInteriorMap(ctx) {
        const T = this.TILE_SIZE;
        const lvl = this.getBaseLevel();

        // 1. Dark Walls & Upper Molding
        ctx.fillStyle = '#1e1008';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        ctx.fillStyle = lvl >= 3 ? '#5b2c6f' : '#8b5a2b';
        ctx.fillRect(2 * T, 1 * T, 15 * T, 2 * T);
        ctx.fillStyle = lvl >= 3 ? '#4a235a' : '#5a3414';
        ctx.fillRect(2 * T, 1 * T, 15 * T, 4);
        ctx.fillRect(2 * T, 3 * T - 2, 15 * T, 4);

        // 2. Hardwood Parquet Floor
        for (let r = 3; r < 12; r++) {
            for (let c = 2; c < 17; c++) {
                const x = c * T;
                const y = r * T;

                ctx.fillStyle = ((c + r) % 2 === 0) ? '#bf874e' : '#b07942';
                ctx.fillRect(x, y, T, T);

                ctx.fillStyle = '#8c5929';
                ctx.fillRect(x, y + T - 1, T, 1);
                ctx.fillRect(x + T - 1, y, 1, T);

                if ((c * 5 + r * 7) % 3 === 0) {
                    ctx.fillStyle = '#cf995e';
                    ctx.fillRect(x + 4, y + 6, 8, 1);
                }
            }
        }

        // 3. Ornate Royal Woven Carpet
        const rugX = 5.5 * T;
        const rugY = 4.8 * T;
        const rugW = 7 * T;
        const rugH = 5 * T;

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(rugX - 4, rugY, rugW + 8, rugH);

        ctx.fillStyle = lvl >= 3 ? '#4a235a' : '#9b1d20';
        ctx.fillRect(rugX, rugY, rugW, rugH);

        ctx.fillStyle = '#d4ac0d';
        ctx.strokeRect(rugX + 4, rugY + 4, rugW - 8, rugH - 8);

        ctx.fillStyle = lvl >= 3 ? '#2c1038' : '#781518';
        ctx.fillRect(rugX + rugW / 2 - 16, rugY + rugH / 2 - 14, 32, 28);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(rugX + rugW / 2 - 6, rugY + rugH / 2 - 6, 12, 12);

        // 4. Welcome Mat
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(8.5 * T, 11 * T - 4, 3 * T, 14);
        ctx.fillStyle = '#7a4e28';
        ctx.fillRect(8.5 * T + 2, 11 * T - 2, 3 * T - 4, 10);
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '5px "Press Start 2P"';
        ctx.fillText('EXIT', 9.2 * T, 11 * T + 5);

        // 5. Furniture
        this.drawFireplace(ctx, 8 * T, 1.6 * T);
        this.drawBed(ctx, 2 * T + 4, 2 * T + 6, lvl);
        this.drawBookshelf(ctx, 5 * T, 1.8 * T, lvl);
        this.drawWardrobe(ctx, 13 * T, 1.8 * T);
        this.drawChest(ctx, 15 * T, 5 * T, lvl);
        this.drawStrategyDesk(ctx, 13 * T, 8 * T, lvl);

        // Tier 2+: Gramophone
        if (lvl >= 2) {
            this.drawGramophone(ctx, 7.2 * T, 2.2 * T);
        }

        // Tier 3: Armor Display Pedestal
        if (lvl >= 3) {
            this.drawArmorPedestal(ctx, 11 * T, 2.2 * T);
        }
    },

    drawFireplace(ctx, x, y) {
        const T = this.TILE_SIZE;
        ctx.fillStyle = '#616a6b';
        ctx.fillRect(x, y, 2 * T, 2 * T);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(x + 2, y + 2, 2 * T - 4, 6);

        ctx.fillStyle = '#4a2810';
        ctx.fillRect(x - 2, y + 6, 2 * T + 4, 5);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + T - 5, y + 1, 10, 6);

        ctx.fillStyle = '#17202a';
        ctx.fillRect(x + 6, y + 14, 2 * T - 12, 26);

        const f1 = (this.tick % 8 > 4) ? 2 : 0;
        const f2 = (this.tick % 6 > 3) ? 2 : 0;

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 12, y + 26 - f1, 24, 14 + f1);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 15, y + 28 - f2, 18, 10 + f2);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 18, y + 31 - f1, 12, 6 + f1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 21, y + 33, 6, 3);
    },

    drawBed(ctx, x, y, lvl) {
        const T = this.TILE_SIZE;
        const w = 2 * T;
        const h = 2 * T + 12;

        ctx.fillStyle = '#4a2511';
        ctx.fillRect(x, y, w, 10);
        ctx.fillRect(x, y - 4, 4, 14);
        ctx.fillRect(x + w - 4, y - 4, 4, 14);

        // Bed quilt (Blue in Tier 1, Gold-embroidered in Tier 2, Velvet in Tier 3)
        ctx.fillStyle = lvl >= 3 ? '#781518' : (lvl >= 2 ? '#1b4f72' : '#1f4e78');
        ctx.fillRect(x + 2, y + 10, w - 4, h - 14);
        ctx.fillStyle = lvl >= 3 ? '#c0392b' : (lvl >= 2 ? '#2471a3' : '#2e75b6');
        ctx.fillRect(x + 4, y + 24, w - 8, h - 28);

        if (lvl >= 2) {
            // Gold border embroidery
            ctx.fillStyle = '#f1c40f';
            ctx.strokeRect(x + 5, y + 25, w - 10, h - 30);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y + 10, w - 4, 8);

        ctx.fillStyle = '#eaf2f8';
        ctx.fillRect(x + 8, y + 12, w - 16, 10);
        ctx.fillStyle = '#d4e6f1';
        ctx.fillRect(x + 14, y + 15, 12, 4);
    },

    drawBookshelf(ctx, x, y, lvl) {
        const T = this.TILE_SIZE;
        ctx.fillStyle = '#5c2d13';
        ctx.fillRect(x, y, 2 * T, 2 * T + 4);
        ctx.fillStyle = '#3a1a08';
        ctx.strokeRect(x, y, 2 * T, 2 * T + 4);
        ctx.fillRect(x, y + T + 2, 2 * T, 3);

        const colors1 = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = colors1[i];
            ctx.fillRect(x + 4 + i * 7, y + 6, 5, 18);
            ctx.fillStyle = '#f9e79f';
            ctx.fillRect(x + 4 + i * 7, y + 10, 5, 2);
        }

        const colors2 = ['#1abc9c', '#e84393', '#fdcb6e', '#0984e3', '#00b894'];
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors2[i];
            ctx.fillRect(x + 4 + i * 7, y + T + 6, 5, 18);
        }

        // Potion or Celestial Orb
        if (lvl >= 2) {
            // Celestial floating orb
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.arc(x + 41, y + T + 14, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 40, y + T + 12, 2, 2);
        } else {
            ctx.fillStyle = '#a29bfe';
            ctx.fillRect(x + 39, y + T + 10, 6, 12);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 40, y + T + 12, 2, 4);
        }
    },

    drawWardrobe(ctx, x, y) {
        const T = this.TILE_SIZE;
        ctx.fillStyle = '#5c2d13';
        ctx.fillRect(x, y, 2 * T, 2.3 * T);
        ctx.fillStyle = '#3a1a08';
        ctx.strokeRect(x, y, 2 * T, 2.3 * T);

        ctx.fillStyle = '#d4e6f1';
        ctx.fillRect(x + 12, y + 8, 24, 38);
        ctx.fillStyle = '#a9cce3';
        ctx.strokeRect(x + 12, y + 8, 24, 38);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 16, y + 12, 3, 20);
        ctx.fillRect(x + 22, y + 16, 2, 14);
    },

    drawChest(ctx, x, y, lvl) {
        ctx.fillStyle = lvl >= 3 ? '#b7950b' : '#8a4b18';
        ctx.fillRect(x, y + 4, 24, 18);

        ctx.fillStyle = lvl >= 3 ? '#f1c40f' : '#a65e22';
        ctx.fillRect(x + 2, y + 2, 20, 6);

        ctx.fillStyle = lvl >= 3 ? '#f39c12' : '#34495e';
        ctx.fillRect(x, y + 2, 3, 20);
        ctx.fillRect(x + 21, y + 2, 3, 20);
        ctx.fillRect(x, y + 7, 24, 2);

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 10, y + 8, 4, 5);
        ctx.fillStyle = '#17202a';
        ctx.fillRect(x + 11, y + 10, 2, 2);

        // Jewels in Tier 3
        if (lvl >= 3) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(x + 5, y + 4, 3, 3);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + 16, y + 4, 3, 3);
        }
    },

    drawStrategyDesk(ctx, x, y, lvl) {
        const T = this.TILE_SIZE;
        ctx.fillStyle = '#5c2d13';
        ctx.fillRect(x, y + 6, 2 * T, 2 * T - 8);
        ctx.fillStyle = '#7a3e1a';
        ctx.fillRect(x + 2, y + 8, 2 * T - 4, 2 * T - 12);

        // Retro PC Monitor
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(x + 6, y, 16, 14);
        ctx.fillStyle = lvl >= 2 ? '#1abc9c' : '#2980b9';
        ctx.fillRect(x + 8, y + 2, 12, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 9, y + 3, 10, 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x + 18, y + 12, 2, 1);

        // Open Quest Logbook
        ctx.fillStyle = '#fef9e7';
        ctx.fillRect(x + 26, y + 12, 14, 10);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(x + 28, y + 14, 10, 1);
        ctx.fillRect(x + 28, y + 17, 10, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 40, y + 9, 2, 8);

        // Coffee Mug
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 8, y + 16, 5, 6);
        ctx.fillStyle = '#6e2c00';
        ctx.fillRect(x + 9, y + 17, 3, 1);
    },

    drawGramophone(ctx, x, y) {
        // Pedestal table
        ctx.fillStyle = '#7a4e28';
        ctx.fillRect(x + 4, y + 14, 12, 10);

        // Gramophone body box
        ctx.fillStyle = '#4a2511';
        ctx.fillRect(x + 2, y + 6, 16, 8);

        // Vinyl disc
        ctx.fillStyle = '#17202a';
        ctx.fillRect(x + 4, y + 4, 12, 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 9, y + 4, 2, 2);

        // Brass horn
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x + 8, y - 4, 8, 8);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 12, y - 8, 8, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 14, y - 6, 4, 2);

        // Floating musical note
        if (this.tick % 16 > 8) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '6px "Press Start 2P"';
            ctx.fillText('♪', x + 16, y - 10);
        }
    },

    drawArmorPedestal(ctx, x, y) {
        // Stone plinth
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(x + 2, y + 16, 18, 8);

        // Steel Plate Armor
        ctx.fillStyle = '#d5dbdb';
        ctx.fillRect(x + 5, y + 4, 12, 12);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 7, y + 8, 8, 2);

        // Helmet
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(x + 7, y - 4, 8, 8);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 9, y - 7, 4, 3);
    },

    // ------------------------------------------------------------------------
    // Y-SORTED ENTITIES
    // ------------------------------------------------------------------------
    renderEntities(ctx) {
        const entities = [];

        entities.push({
            type: 'pet',
            y: this.pet.y + 16,
            render: () => this.renderPet(ctx)
        });

        entities.push({
            type: 'player',
            y: this.player.y + 24,
            render: () => this.renderPlayer(ctx)
        });

        entities.sort((a, b) => a.y - b.y);
        entities.forEach(ent => ent.render());
    },

    // ------------------------------------------------------------------------
    // 16-BIT POKÉMON GBA TRAINER SPRITE
    // ------------------------------------------------------------------------
    renderPlayer(ctx) {
        const p = this.player;
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px + 10, py + 23, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        let legL = 0, legR = 0, armL = 0, armR = 0, headBob = 0;

        if (p.isMoving) {
            headBob = (p.walkFrame % 2 === 1) ? 1 : 0;
            if (p.walkFrame === 1) { legL = -3; legR = 2; armL = 2; armR = -2; }
            if (p.walkFrame === 3) { legL = 2; legR = -3; armL = -2; armR = 2; }
        }

        const pyBob = py + headBob;

        if (p.dir === 'down') {
            ctx.fillStyle = '#22313f';
            ctx.fillRect(px + 6, py + 16, 3, 5);
            ctx.fillRect(px + 11, py + 16, 3, 5);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 5, py + 21 + legL, 4, 4);
            ctx.fillRect(px + 11, py + 21 + legR, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 5, py + 24 + legL, 4, 1);
            ctx.fillRect(px + 11, py + 24 + legR, 4, 1);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 5, pyBob + 10, 10, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 8, pyBob + 10, 4, 3);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(px + 5, pyBob + 16, 10, 2);
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(px + 9, pyBob + 16, 2, 2);

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(px + 6, pyBob + 10, 2, 6);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 3, pyBob + 11 + armL, 2, 4);
            ctx.fillRect(px + 15, pyBob + 11 + armR, 2, 4);
            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 3, pyBob + 15 + armL, 2, 2);
            ctx.fillRect(px + 15, pyBob + 15 + armR, 2, 2);

            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 6, pyBob + 4, 8, 6);

            ctx.fillStyle = '#2c1e18';
            ctx.fillRect(px + 5, pyBob + 5, 2, 4);
            ctx.fillRect(px + 13, pyBob + 5, 2, 4);

            ctx.fillStyle = '#17202a';
            ctx.fillRect(px + 7, pyBob + 7, 2, 3);
            ctx.fillRect(px + 11, pyBob + 7, 2, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 7, pyBob + 7, 1, 1);
            ctx.fillRect(px + 11, pyBob + 7, 1, 1);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 5, pyBob + 1, 10, 4);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 4, pyBob + 4, 12, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 9, pyBob + 2, 2, 2);

        } else if (p.dir === 'up') {
            ctx.fillStyle = '#22313f';
            ctx.fillRect(px + 6, py + 16, 3, 5);
            ctx.fillRect(px + 11, py + 16, 3, 5);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 5, py + 21 + legL, 4, 4);
            ctx.fillRect(px + 11, py + 21 + legR, 4, 4);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 5, pyBob + 10, 10, 7);

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(px + 6, pyBob + 9, 8, 7);
            ctx.fillStyle = '#d68910';
            ctx.fillRect(px + 6, pyBob + 12, 8, 2);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 3, pyBob + 11 + armL, 2, 5);
            ctx.fillRect(px + 15, pyBob + 11 + armR, 2, 5);

            ctx.fillStyle = '#2c1e18';
            ctx.fillRect(px + 5, pyBob + 4, 10, 5);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 5, pyBob + 1, 10, 5);

        } else if (p.dir === 'left') {
            ctx.fillStyle = '#22313f';
            ctx.fillRect(px + 7 + legL, py + 16, 5, 5);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 6 + legL, py + 21, 6, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 6 + legL, py + 24, 6, 1);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 7, pyBob + 10, 7, 7);

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(px + 13, pyBob + 9, 3, 6);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 8 + armL, pyBob + 11, 3, 4);
            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 8 + armL, pyBob + 15, 2, 2);

            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 6, pyBob + 4, 7, 6);

            ctx.fillStyle = '#17202a';
            ctx.fillRect(px + 7, pyBob + 6, 2, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 7, pyBob + 6, 1, 1);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 6, pyBob + 1, 8, 4);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 3, pyBob + 4, 5, 2);

            ctx.fillStyle = '#2c1e18';
            ctx.fillRect(px + 12, pyBob + 4, 2, 5);

        } else if (p.dir === 'right') {
            ctx.fillStyle = '#22313f';
            ctx.fillRect(px + 8 + legR, py + 16, 5, 5);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 8 + legR, py + 21, 6, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 8 + legR, py + 24, 6, 1);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 6, pyBob + 10, 7, 7);

            ctx.fillStyle = '#f39c12';
            ctx.fillRect(px + 4, pyBob + 9, 3, 6);

            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 9 + armR, pyBob + 11, 3, 4);
            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 10 + armR, pyBob + 15, 2, 2);

            ctx.fillStyle = '#f5cba7';
            ctx.fillRect(px + 7, pyBob + 4, 7, 6);

            ctx.fillStyle = '#17202a';
            ctx.fillRect(px + 11, pyBob + 6, 2, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 12, pyBob + 6, 1, 1);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(px + 6, pyBob + 1, 8, 4);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(px + 12, pyBob + 4, 5, 2);

            ctx.fillStyle = '#2c1e18';
            ctx.fillRect(px + 6, pyBob + 4, 2, 5);
        }
    },

    // ------------------------------------------------------------------------
    // CHISPA COMPANION SPRITE
    // ------------------------------------------------------------------------
    renderPet(ctx) {
        const pet = this.pet;
        const petX = Math.floor(pet.x);
        const petY = Math.floor(pet.y + pet.hopOffset);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(petX + 8, pet.y + 16, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e67e22';
        ctx.fillRect(petX + 3, petY + 6, 10, 9);

        ctx.fillStyle = '#fef5e7';
        ctx.fillRect(petX + 5, petY + 8, 6, 6);

        ctx.fillStyle = '#e67e22';
        ctx.fillRect(petX + 4, petY + 2, 8, 6);

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(petX + 3, petY - 2, 2, 3);
        ctx.fillRect(petX + 11, petY - 2, 2, 3);
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(petX + 3, petY + 1, 2, 2);
        ctx.fillRect(petX + 11, petY + 1, 2, 2);

        ctx.fillStyle = '#17202a';
        if (pet.dir === 'left') {
            ctx.fillRect(petX + 4, petY + 4, 2, 2);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(petX + 4, petY + 4, 1, 1);
        } else if (pet.dir === 'right') {
            ctx.fillRect(petX + 10, petY + 4, 2, 2);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(petX + 10, petY + 4, 1, 1);
        } else {
            ctx.fillRect(petX + 5, petY + 4, 2, 2);
            ctx.fillRect(petX + 9, petY + 4, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(petX + 5, petY + 4, 1, 1);
            ctx.fillRect(petX + 9, petY + 4, 1, 1);
        }

        ctx.fillStyle = '#fef5e7';
        ctx.fillRect(petX + 4, petY + 14, 3, 2);
        ctx.fillRect(petX + 9, petY + 14, 3, 2);

        const flameFlicker = (this.tick % 6 > 3) ? 1 : 0;
        ctx.fillStyle = '#d35400';
        ctx.fillRect(petX + 12, petY + 7, 4, 4);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(petX + 14, petY + 4 - flameFlicker, 4, 5 + flameFlicker);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(petX + 15, petY + 5 - flameFlicker, 2, 3);

        pet.hearts.forEach(h => {
            ctx.fillStyle = `rgba(231, 76, 60, ${h.alpha})`;
            ctx.fillRect(h.x, h.y, 2, 2);
            ctx.fillRect(h.x + 3, h.y, 2, 2);
            ctx.fillRect(h.x - 1, h.y + 2, 7, 2);
            ctx.fillRect(h.x + 1, h.y + 4, 3, 2);
            ctx.fillRect(h.x + 2, h.y + 6, 1, 1);
        });
    },

    // ------------------------------------------------------------------------
    // WEATHER & PARTICLES
    // ------------------------------------------------------------------------
    renderWeather(ctx) {
        if (this.currentMap !== 'exterior') {
            this.particles.forEach(pt => {
                if (pt.type === 'ember') {
                    ctx.fillStyle = `rgba(255, 140, 0, ${pt.alpha})`;
                    ctx.fillRect(pt.x, pt.y, pt.radius, pt.radius);
                }
            });
            return;
        }

        if (this.weatherType === 'rain') {
            ctx.strokeStyle = 'rgba(174, 214, 241, 0.65)';
            ctx.lineWidth = 1.2;
            this.particles.forEach(pt => {
                if (pt.type === 'rain') {
                    ctx.beginPath();
                    ctx.moveTo(pt.x, pt.y);
                    ctx.lineTo(pt.x + pt.vx, pt.y + pt.len);
                    ctx.stroke();
                }
            });

            ctx.fillStyle = 'rgba(23, 32, 42, 0.28)';
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        } else if (this.weatherType === 'sunny') {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.WIDTH * 0.45, 0);
            ctx.lineTo(this.WIDTH * 0.85, this.HEIGHT);
            ctx.lineTo(this.WIDTH * 0.4, this.HEIGHT);
            ctx.closePath();
            ctx.fill();

            this.particles.forEach(pt => {
                if (pt.type === 'sparkle') {
                    ctx.fillStyle = `rgba(255, 215, 0, ${pt.alpha})`;
                    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
                }
            });
        } else if (this.weatherType === 'clear') {
            this.particles.forEach(pt => {
                if (pt.type === 'leaf') {
                    ctx.fillStyle = `rgba(120, 224, 140, ${pt.alpha})`;
                    ctx.fillRect(pt.x, pt.y, 3, 2);
                }
            });
        }

        this.particles.forEach(pt => {
            if (pt.type === 'smoke') {
                ctx.fillStyle = `rgba(220, 220, 220, ${pt.alpha})`;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    },

    renderFloatingTexts(ctx) {
        this.floatingTexts.forEach(ft => {
            ctx.fillStyle = `rgba(0, 0, 0, ${ft.alpha * 0.8})`;
            ctx.font = '7px "Press Start 2P"';
            ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
    },

    renderInteractionBubble(ctx) {
        if (!this.currentInteractive || this.dialogue.active || this.warp.active) return;

        const p = this.player;
        const text = this.currentInteractive.prompt;
        ctx.font = '6px "Press Start 2P"';
        const textWidth = ctx.measureText(text).width;

        const bubbleW = textWidth + 12;
        const bubbleH = 14;
        const bubbleX = Math.floor(p.x + p.width / 2 - bubbleW / 2);
        const bubbleY = Math.floor(p.y - 18 + Math.sin(this.tick * 0.15) * 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, bubbleX + 6, bubbleY + 9);
    }
};

// ----------------------------------------------------------------------------
// LIFECYCLE LISTENERS & GLOBAL EXPORT
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    BaseUI.init();

    if (window.EventBus) {
        EventBus.on('state:updated', () => {
            if (BaseUI.isRunning) {
                BaseUI.updateWeather();
                BaseUI.updateLocationBadge();
            }
        });
    }
});

// Explicit window export for global accessibility
window.BaseUI = BaseUI;
window.testMax = () => BaseUI.testMax();
