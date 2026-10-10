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
            let hadGameOver = false;
            const dmgValues = { 1: 5, 2: 8, 3: 12, 4: 15 };

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

                let dayDamage = 0;
                
                let daySnapshot = StateManager.data.dailyLog[dateStr];
                if (daySnapshot) {
                    daySnapshot.scheduled.forEach(sm => {
                        if (!daySnapshot.completed.includes(sm.id)) {
                            dayDamage += dmgValues[sm.level] || 5;
                        }
                    });
                } else {
                    activeThatDay.forEach(m => {
                        dayDamage += dmgValues[m.level] || 5;
                    });
                }
                
                if (dayDamage > 0) {
                    totalDamage += dayDamage;

                    // Streak: romper o usar escudo
                    if (StateManager.data.streak.lastCountedDate !== dateStr) {
                        const shieldUsed = Streak.breakStreak();
                        if (shieldUsed) {
                            logMsg.push(`[${dateStr}] Misiones falladas. Escudo usado. Daño: -${dayDamage} HP.`);
                        } else {
                            logMsg.push(`[${dateStr}] Misiones falladas. Racha rota. Daño: -${dayDamage} HP.`);
                        }
                    }

                    // Aplicar daño DÍA POR DÍA (no en bloque)
                    StateManager.data.hero.hp -= dayDamage;

                    // Game Over: max 1 por sesión de retorno
                    if (StateManager.data.hero.hp <= 0 && !hadGameOver) {
                        StateManager.data.hero.hp = 0;
                        hadGameOver = true;

                        // Penalización Game Over: -1 nivel, reset XP, restaurar HP
                        let hLevel = StateManager.data.hero.level;
                        if (hLevel > 1) hLevel--;
                        StateManager.data.hero.level = hLevel;
                        StateManager.data.hero.xp = 0;
                        StateManager.data.hero.hp = StateManager.data.hero.maxHp;
                        StateManager.data.hero.deaths++;

                        logMsg.push(`[${dateStr}] ☠️ GAME OVER — HP llegó a 0. Perdiste 1 nivel de héroe.`);
                        EventBus.emit('hero:death');
                    } else if (StateManager.data.hero.hp <= 0 && hadGameOver) {
                        // Cap anti-frustración: no más de 1 Game Over por retorno
                        StateManager.data.hero.hp = 1;
                        logMsg.push(`[${dateStr}] Daño absorbido (protección anti-frustración).`);
                    }
                }
            }

            // Mostrar reporte si hubo daño
            if (totalDamage > 0) {
                const reportModal = document.getElementById('report-modal');
                const reportText = document.getElementById('report-details');
                if (reportModal && reportText) {
                    let summary = logMsg.join('<br>');
                    summary += `<br><br><b>Daño Total: -${totalDamage} HP</b>`;
                    if (hadGameOver) {
                        summary += `<br><b style="color:var(--hp-color);">☠️ GAME OVER procesado.</b>`;
                    }
                    reportText.innerHTML = summary;
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
