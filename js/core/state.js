const StateManager = {
    data: null,
    
    init() {
        this.load();
        this.migrateLegacy();
        
        // Autosave con debounce al detectar cambios
        EventBus.on('state:updated', Utils.debounce(() => this.save(), 500));
    },
    
    getDefaultState() {
        return {
            schemaVersion: 3,
            meta: { createdAt: Utils.getTodayISO(), lastProcessedDate: Utils.getTodayISO(), lastSavedAt: Date.now(), appVersion: '3.0.0' },
            profile: { name: 'CREATOR', bio: '"Construyendo el cambio, forjando ideas y entrenando el cuerpo."', avatar: '', equippedTitle: '' },
            settings: { theme: 'rpg-retro', backgrounds: {}, sound: true, volume: 0.3, bgmTrack: '1' },
            stats: { 
                fuerza: { current: 0, max: 100, level: 1 },
                sabiduria: { current: 0, max: 100, level: 1 },
                creatividad: { current: 0, max: 100, level: 1 },
                carisma: { current: 0, max: 100, level: 1 }
            },
            missions: [
                { id: 1, name: "Entrenamiento pesado", stat: "fuerza", level: 3, lastCompleted: null, createdAt: Utils.getTodayISO() },
                { id: 2, name: "Escribir código / Estudiar", stat: "sabiduria", level: 2, lastCompleted: null, createdAt: Utils.getTodayISO() },
                { id: 3, name: "Dibujo web", stat: "creatividad", level: 2, lastCompleted: null, createdAt: Utils.getTodayISO() }
            ],
            cooldowns: { 2: null, 3: null, 4: null },
            hero: { level: 1, xp: 0, totalXpEarned: 0, hp: 100, maxHp: 100, deaths: 0 },
            streak: { current: 0, best: 0, shields: 0, lastCountedDate: null },
            rest: { days: [], usedByMonth: {} },
            dailyLog: {},
            counters: { missionsTotal: 0, perStat: { fuerza:0, sabiduria:0, creatividad:0, carisma:0 }, perLevel: { 1:0, 2:0, 3:0, 4:0 }, perfectDays: 0 },
            economy: { gold: 0 },
            base: { level: 1 },
            achievements: {},
            history: []
        };
    },

    load() {
        const saved = localStorage.getItem('gamelife_save');
        if (saved) {
            this.data = JSON.parse(saved);
            if (!this.data.economy) this.data.economy = { gold: 0 };
            if (!this.data.base) this.data.base = { level: 1 };
        } else {
            this.data = this.getDefaultState();
        }
    },

    save() {
        if (!this.data) return;
        this.data.meta.lastSavedAt = Date.now();
        try {
            localStorage.setItem('gamelife_save', JSON.stringify(this.data));
        } catch(e) {
            console.error("No se pudo guardar el estado", e);
        }
    },

    migrateLegacy() {
        // Migramos solo si venimos de versiones anteriores y no hay save v3 aún
        if (!localStorage.getItem('gamelife_save') && localStorage.getItem('rpg_stats')) {
            console.log("Iniciando migración de datos a esquema v3...");
            
            // Stats
            const legacyStats = JSON.parse(localStorage.getItem('rpg_stats'));
            if (legacyStats) this.data.stats = legacyStats;

            // Misiones (asegurar campos level y createdAt)
            const legacyMissions = JSON.parse(localStorage.getItem('rpg_missions'));
            if (legacyMissions) {
                this.data.missions = legacyMissions.map(m => {
                    let mDate = m.lastCompleted;
                    // Format old dates "YYYY-M-D" to "YYYY-MM-DD"
                    if (mDate && mDate.indexOf('-') > 0) {
                        let parts = mDate.split('-');
                        if (parts.length === 3) {
                            mDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                        }
                    }
                    if (!m.level) return { ...m, level: 2, lastCompleted: mDate, createdAt: Utils.getTodayISO() };
                    return { ...m, lastCompleted: mDate, createdAt: Utils.getTodayISO() };
                });
            }

            // Cooldowns
            const legacyCooldowns = JSON.parse(localStorage.getItem('rpg_cooldowns'));
            if (legacyCooldowns) {
                // Convert dates
                for (let k in legacyCooldowns) {
                    let d = legacyCooldowns[k];
                    if (d) {
                         let parts = d.split('-');
                         if (parts.length === 3) {
                            this.data.cooldowns[k] = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                         } else {
                             this.data.cooldowns[k] = d;
                         }
                    }
                }
            }

            // Perfil
            if (localStorage.getItem('profile_name')) this.data.profile.name = localStorage.getItem('profile_name');
            if (localStorage.getItem('profile_bio')) this.data.profile.bio = localStorage.getItem('profile_bio');
            if (localStorage.getItem('profile_avatar')) this.data.profile.avatar = localStorage.getItem('profile_avatar');

            // Settings
            if (localStorage.getItem('selected_theme')) this.data.settings.theme = localStorage.getItem('selected_theme');
            if (localStorage.getItem('rpg_sound') !== null) this.data.settings.sound = localStorage.getItem('rpg_sound') !== 'false';
            if (localStorage.getItem('rpg_volume')) this.data.settings.volume = parseFloat(localStorage.getItem('rpg_volume'));
            if (localStorage.getItem('rpg_bgm_track')) this.data.settings.bgmTrack = localStorage.getItem('rpg_bgm_track');
            
            // Fondos por tema
            const themes = ['terminal', 'synthwave', 'matrix', 'light-minimal', 'dark-minimal', 'rpg-retro'];
            themes.forEach(t => {
                const bg = localStorage.getItem('custom_background_' + t);
                if (bg) this.data.settings.backgrounds[t] = bg;
            });

            // Calcular XP Inicial del Héroe basado en stats acumulados
            let totalXp = 0;
            for (let key in this.data.stats) {
                const stat = this.data.stats[key];
                for (let i = 1; i < stat.level; i++) {
                    totalXp += 100 * Math.pow(1.5, i - 1); // Fórmula original aproximada
                }
                totalXp += stat.current;
            }
            this.data.hero.totalXpEarned = Math.floor(totalXp);
            
            // Calcular nivel del Héroe: xpParaSiguiente(nivel) = 100 + (nivel - 1) * 50
            let hLevel = 1;
            let currentXp = this.data.hero.totalXpEarned;
            while (true) {
                const xpForNext = 100 + (hLevel - 1) * 50;
                if (currentXp >= xpForNext) {
                    currentXp -= xpForNext;
                    hLevel++;
                } else {
                    break;
                }
            }
            this.data.hero.level = hLevel;
            this.data.hero.xp = currentXp;

            // Hacer backup legacy
            localStorage.setItem('rpg_legacy_backup', JSON.stringify({
                stats: legacyStats, missions: legacyMissions, cooldowns: legacyCooldowns
            }));
            
            this.save();
            console.log("Migración completada. Nivel de héroe inicial:", hLevel);
        }
    }
};
