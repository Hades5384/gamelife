// js/systems/hero.js
const Hero = {
    init() {
        EventBus.on('mission:completed', this.onMissionCompleted.bind(this));
        EventBus.on('mission:undone', this.onMissionUndone.bind(this));
    },

    onMissionCompleted(data) {
        let hLevel = StateManager.data.hero.level;
        let healAmt = 1;
        if (hLevel >= 35) healAmt = 4;
        else if (hLevel >= 20) healAmt = 3;
        else if (hLevel >= 10) healAmt = 2;
        
        this.heal(healAmt);
        
        let multiplier = 1.0;
        let racha = StateManager.data.streak.current;
        if (racha >= 30) multiplier = 1.5;
        else if (racha >= 7) multiplier = 1.2;
        else if (racha >= 3) multiplier = 1.1;

        const xpGained = Math.floor(data.xpGained * multiplier);
        this.addXp(xpGained);
    },
    
    onMissionUndone(data) {
        // En undo, restamos la XP base (podríamos recalcular el multi, pero es corner case)
        this.removeXp(data.xpGained);
    },

    heal(amount) {
        let hp = StateManager.data.hero.hp;
        let maxHp = StateManager.data.hero.maxHp;
        if (hp >= maxHp) return;
        
        hp += amount;
        if (hp > maxHp) hp = maxHp;
        
        StateManager.data.hero.hp = hp;
        EventBus.emit('hero:hp_changed', { amount, type: 'heal' });
        EventBus.emit('state:updated');
    },

    damage(amount) {
        let hp = StateManager.data.hero.hp;
        hp -= amount;
        
        if (hp <= 0) {
            hp = 0;
            this.gameOver();
        } else {
            StateManager.data.hero.hp = hp;
            EventBus.emit('hero:hp_changed', { amount, type: 'damage' });
        }
        EventBus.emit('state:updated');
    },

    gameOver() {
        let hLevel = StateManager.data.hero.level;
        if (hLevel > 1) {
            hLevel--;
        }
        StateManager.data.hero.level = hLevel;
        StateManager.data.hero.xp = 0;
        StateManager.data.hero.hp = StateManager.data.hero.maxHp;
        StateManager.data.hero.deaths++;
        
        EventBus.emit('hero:death');
        EventBus.emit('state:updated');
        
        // Trigger visual
        document.body.classList.add('shake');
        document.body.classList.add('flash-red');
        playErrorSound();
        setTimeout(() => {
            document.body.classList.remove('shake');
            document.body.classList.remove('flash-red');
            openModal('gameover-modal');
        }, 500);
    },

    addXp(amount) {
        StateManager.data.hero.totalXpEarned += amount;
        StateManager.data.hero.xp += amount;
        this.checkLevelUp();
    },
    
    removeXp(amount) {
        StateManager.data.hero.totalXpEarned -= amount;
        StateManager.data.hero.xp -= amount;
        
        if (StateManager.data.hero.xp < 0) {
            if (StateManager.data.hero.level > 1) {
                StateManager.data.hero.level--;
                const xpForPrevious = 100 + (StateManager.data.hero.level - 1) * 50;
                StateManager.data.hero.xp = xpForPrevious + StateManager.data.hero.xp; 
            } else {
                StateManager.data.hero.xp = 0;
            }
        }
        EventBus.emit('state:updated');
        EventBus.emit('hero:xp_changed');
    },

    checkLevelUp() {
        let leveledUp = false;
        while (true) {
            const xpForNext = 100 + (StateManager.data.hero.level - 1) * 50;
            if (StateManager.data.hero.xp >= xpForNext) {
                StateManager.data.hero.xp -= xpForNext;
                StateManager.data.hero.level++;
                leveledUp = true;
            } else {
                break;
            }
        }
        
        EventBus.emit('hero:xp_changed');
        if (leveledUp) {
            EventBus.emit('hero:levelup', StateManager.data.hero.level);
            showToast("> HÉROE LEVEL UP", `¡Alcanzaste el Nivel de Héroe ${StateManager.data.hero.level}!`);
            playLevelUpSound();
        }
        EventBus.emit('state:updated');
    }
};
