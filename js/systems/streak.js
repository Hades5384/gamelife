// js/systems/streak.js
const Streak = {
    init() {
        EventBus.on('mission:completed', this.checkDaily100Percent.bind(this));
    },

    checkDaily100Percent() {
        const today = Utils.getTodayISO();
        if (StateManager.data.streak.lastCountedDate === today) return; // ya contabilizado hoy
        
        const activeMissions = StateManager.data.missions;
        if (activeMissions.length === 0) return;
        
        const allCompleted = activeMissions.every(m => m.lastCompleted === today);
        if (allCompleted) {
            this.increaseStreak(today);
        }
    },

    increaseStreak(date) {
        StateManager.data.streak.current++;
        if (StateManager.data.streak.current > StateManager.data.streak.best) {
            StateManager.data.streak.best = StateManager.data.streak.current;
        }
        StateManager.data.streak.lastCountedDate = date;
        
        let shieldEarned = false;
        // +1 Shield every 7 days, max 2
        if (StateManager.data.streak.current % 7 === 0) {
            if (StateManager.data.streak.shields < 2) {
                StateManager.data.streak.shields++;
                shieldEarned = true;
                showToast("> ESCUDO GANADO", "¡Has ganado un escudo de racha!");
            }
        }

        // Heal 10 HP bonus
        Hero.heal(10);
        showToast("> ¡DÍA PERFECTO!", "+10 HP por completar todas las misiones.");
        
        EventBus.emit('streak:increased');
        EventBus.emit('state:updated');

        const currentStreak = StateManager.data.streak.current;
        setTimeout(() => {
            this.showStreakModal(currentStreak, shieldEarned);
        }, 550);
    },

    showStreakModal(streakDays, shieldEarned) {
        const dayText = document.getElementById('streak-modal-day-text');
        const descText = document.getElementById('streak-modal-desc');
        if (dayText) {
            dayText.textContent = `¡DÍA ${streakDays} DE RACHA!`;
        }
        if (descText) {
            let msg = `¡Has completado todas tus misiones del día!\nTu disciplina mantiene viva la llama. (+10 HP)`;
            if (shieldEarned) {
                msg += `\n\n🛡️ ¡Desbloqueaste un Escudo Protector de Racha!`;
            }
            descText.textContent = msg;
        }

        if (window.FX) {
            FX.shake('light');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#F59E0B', '#EF4444', '#FBBF24', '#FFFFFF'], 40);
        }
        if (window.AudioSys) {
            AudioSys.playSFX('streak');
        } else if (typeof playStreakSound === 'function') {
            playStreakSound();
        }

        openModal('streak-modal');
    },

    breakStreak() {
        if (StateManager.data.streak.shields > 0) {
            StateManager.data.streak.shields--;
            EventBus.emit('state:updated');
            return true; // Used shield
        }
        StateManager.data.streak.current = 0;
        EventBus.emit('streak:broken');
        EventBus.emit('state:updated');
        return false; // Streak broken
    }
};
