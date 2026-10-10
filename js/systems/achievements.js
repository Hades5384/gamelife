// js/systems/achievements.js
const Achievements = {
    catalog: [
        { id: 'streak_3', name: 'Aprendiz Constante', desc: 'Racha de 3 días', tier: 'bronze', check: (s) => s.streak.best >= 3 },
        { id: 'streak_7', name: 'Guerrero Constante', desc: 'Racha de 7 días', tier: 'silver', check: (s) => s.streak.best >= 7 },
        { id: 'streak_14', name: 'Maestro Constante', desc: 'Racha de 14 días', tier: 'gold', check: (s) => s.streak.best >= 14 },
        { id: 'streak_30', name: 'Imparable', desc: 'Racha de 30 días', tier: 'legendary', check: (s) => s.streak.best >= 30, title: 'El Imparable' },
        
        { id: 'miss_10', name: 'Iniciado', desc: '10 misiones completadas', tier: 'bronze', check: (s) => s.counters.missionsTotal >= 10 },
        { id: 'miss_50', name: 'Veterano', desc: '50 misiones completadas', tier: 'silver', check: (s) => s.counters.missionsTotal >= 50 },
        
        { id: 'str_25', name: 'Titán', desc: '25 misiones de Fuerza', tier: 'silver', check: (s) => s.counters.perStat.fuerza >= 25 },
        { id: 'int_25', name: 'Erudito', desc: '25 misiones de Sabiduría', tier: 'silver', check: (s) => s.counters.perStat.sabiduria >= 25 },
        { id: 'cre_25', name: 'Artista', desc: '25 misiones de Creatividad', tier: 'silver', check: (s) => s.counters.perStat.creatividad >= 25 },
        { id: 'cha_25', name: 'Diplomático', desc: '25 misiones de Carisma', tier: 'silver', check: (s) => s.counters.perStat.carisma >= 25 },
        
        { id: 'hero_10', name: 'Aventurero', desc: 'Nivel 10 de Héroe', tier: 'silver', check: (s) => s.hero.level >= 10 },
        { id: 'hero_50', name: 'Leyenda Viviente', desc: 'Nivel 50 de Héroe', tier: 'legendary', check: (s) => s.hero.level >= 50, title: 'Leyenda Viviente' },
        
        { id: 'perfect_10', name: 'Perfeccionista', desc: '10 días perfectos (100%)', tier: 'silver', check: (s) => s.counters.perfectDays >= 10 },
        
        { id: 'secret_fenix', name: 'Fénix', desc: 'Racha de 7 días justo después de un Game Over', tier: 'gold', secret: true, title: 'Fénix', check: (s) => s.streak.best >= 7 && s.hero.deaths > 0 },
        { id: 'secret_shield', name: 'Escudo de Hierro', desc: 'Sobrevive un día fallado gracias a un escudo', tier: 'silver', secret: true, check: (s) => s.streak.shields < 2 && s.counters.missionsTotal > 5 },
        { id: 'secret_immortal', name: 'Inmortal', desc: 'Alcanza el nivel 20 sin morir', tier: 'legendary', secret: true, title: 'Inmortal', check: (s) => s.hero.level >= 20 && s.hero.deaths === 0 }
    ],

    _evaluating: false,

    init() {
        // Suscribimos a eventos específicos en vez de state:updated
        // para evitar cascadas de re-evaluación infinitas
        EventBus.on('mission:completed', this.onMissionCompleted.bind(this));
        EventBus.on('streak:increased', this.onPerfectDay.bind(this));
        EventBus.on('hero:levelup', () => this.evaluate());
        EventBus.on('hero:death', () => this.evaluate());
        EventBus.on('streak:broken', () => this.evaluate());
    },

    onMissionCompleted(data) {
        StateManager.data.counters.missionsTotal++;
        if (!StateManager.data.counters.perStat[data.stat]) StateManager.data.counters.perStat[data.stat] = 0;
        StateManager.data.counters.perStat[data.stat]++;
        this.evaluate();
    },

    onPerfectDay() {
        StateManager.data.counters.perfectDays++;
        this.evaluate();
    },

    evaluate() {
        if (!StateManager.data || this._evaluating) return;
        this._evaluating = true;
        this.catalog.forEach(ach => {
            if (!StateManager.data.achievements[ach.id]) {
                if (ach.check(StateManager.data)) {
                    StateManager.data.achievements[ach.id] = { unlockedAt: Utils.getTodayISO() };
                    
                    if (ach.title) {
                        Titles.unlock(ach.title);
                    }
                    
                    this.showAchievementToast(ach);
                    EventBus.emit('achievement:unlocked', ach);
                }
            }
        });
        this._evaluating = false;
    },

    showAchievementToast(ach) {
        const toast = document.createElement('div');
        toast.className = `level-toast show`;
        toast.style.borderColor = 'var(--primary-color)';
        toast.style.boxShadow = '0px 0px 20px var(--primary-color)';
        toast.style.backgroundColor = 'var(--panel-bg)';
        
        let color = '#fff';
        if (ach.tier === 'bronze') color = 'var(--tier-bronze)';
        else if (ach.tier === 'silver') color = 'var(--tier-silver)';
        else if (ach.tier === 'gold') color = 'var(--tier-gold)';
        else if (ach.tier === 'legendary') color = 'var(--tier-legendary)';

        toast.innerHTML = `
            <h2><span style="color:${color}; text-shadow: 1px 1px 0 #000;">🏆 LOGRO DESBLOQUEADO</span></h2>
            <p style="font-size:0.5rem; color:var(--text-color); margin-top:5px;">${ach.name} - ${ach.desc}</p>
        `;
        document.body.appendChild(toast);
        playSuccessSound(); 
        setTimeout(() => playSuccessSound(), 200);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4500);
    }
};
