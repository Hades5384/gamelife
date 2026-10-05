// js/systems/day-engine.js
const DayEngine = {
    init() {
        this.processDays();
        setInterval(() => this.checkRollover(), 60000);
    },

    checkRollover() {
        const today = Utils.getTodayISO();
        if (StateManager.data.meta.lastProcessedDate !== today) {
            this.processDays();
            renderMissions(); 
        }
    },

    processDays() {
        if (!StateManager.data) return;
        const today = Utils.getTodayISO();
        const lastProcessed = StateManager.data.meta.lastProcessedDate;
        
        if (lastProcessed === today) {
            this.ensureDailySnapshot(today);
            return;
        }

        const daysDiff = Utils.diffDays(lastProcessed, today);
        if (daysDiff > 0) {
            let logMsg = [];
            let totalDamage = 0;
            let deaths = 0;

            for (let i = 1; i <= daysDiff; i++) {
                let d = new Date(lastProcessed);
                d.setDate(d.getDate() + i);
                let yr = d.getFullYear();
                let mo = String(d.getMonth() + 1).padStart(2, '0');
                let da = String(d.getDate()).padStart(2, '0');
                let dateStr = `${yr}-${mo}-${da}`;

                if (dateStr === today) {
                    this.ensureDailySnapshot(today);
                    break;
                }

                if (Rest.isRestDay(dateStr)) {
                    logMsg.push(`[${dateStr}] Descanso: HP y racha congelados.`);
                    continue; 
                }

                const activeThatDay = StateManager.data.missions.filter(m => {
                    return Utils.diffDays(m.createdAt, dateStr) >= 0;
                });

                if (activeThatDay.length === 0) {
                    continue; 
                }

                let damage = 0;
                let dmgValues = { 1: 5, 2: 8, 3: 12, 4: 15 };
                
                let daySnapshot = StateManager.data.dailyLog[dateStr];
                if (daySnapshot) {
                    daySnapshot.scheduled.forEach(sm => {
                        if (!daySnapshot.completed.includes(sm.id)) {
                            damage += dmgValues[sm.level] || 5;
                        }
                    });
                } else {
                    activeThatDay.forEach(m => {
                        damage += dmgValues[m.level] || 5;
                    });
                }
                
                if (damage > 0) {
                    totalDamage += damage;
                    if (StateManager.data.streak.lastCountedDate !== dateStr) {
                        const shieldUsed = Streak.breakStreak();
                        if (shieldUsed) {
                            logMsg.push(`[${dateStr}] Misiones falladas. Escudo usado. Daño: -${damage} HP.`);
                        } else {
                            logMsg.push(`[${dateStr}] Misiones falladas. Racha rota. Daño: -${damage} HP.`);
                        }
                    }
                }
            }

            if (totalDamage > 0) {
                let hp = StateManager.data.hero.hp;
                hp -= totalDamage;
                if (hp <= 0) {
                    hp = 0;
                    Hero.gameOver();
                    deaths = 1;
                } else {
                    StateManager.data.hero.hp = hp;
                }
                
                const reportModal = document.getElementById('report-modal');
                const reportText = document.getElementById('report-details');
                if (reportModal && reportText) {
                    reportText.innerHTML = logMsg.join('<br>') + `<br><br><b>Daño Total: -${totalDamage} HP</b>`;
                    openModal('report-modal');
                }
            }

            StateManager.data.meta.lastProcessedDate = today;
            EventBus.emit('state:updated');
        }
    },

    ensureDailySnapshot(dateStr) {
        if (!StateManager.data.dailyLog) StateManager.data.dailyLog = {};
        if (!StateManager.data.dailyLog[dateStr]) {
            StateManager.data.dailyLog[dateStr] = {
                scheduled: StateManager.data.missions.map(m => ({ id: m.id, level: m.level, stat: m.stat })),
                completed: [],
                xp: 0,
                hpDelta: 0,
                perfect: false,
                rest: Rest.isRestDay(dateStr)
            };
            EventBus.emit('state:updated');
        }
    }
};
