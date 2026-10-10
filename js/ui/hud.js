// js/ui/hud.js
const HUD = {
    init() {
        EventBus.on('state:updated', this.render.bind(this));
        EventBus.on('hero:hp_changed', this.animateHp.bind(this));
        
        // Efectos visuales de Game Over (separados de la lógica en Hero.js)
        EventBus.on('hero:death', () => {
            document.body.classList.add('shake');
            document.body.classList.add('flash-red');
            playErrorSound();
            setTimeout(() => {
                document.body.classList.remove('shake');
                document.body.classList.remove('flash-red');
                openModal('gameover-modal');
            }, 500);
        });
        
        this.render();
    },

    render() {
        const hpFill = document.getElementById('hud-hp-fill');
        const hpText = document.getElementById('hud-hp-text');
        const xpFill = document.getElementById('hud-xp-fill');
        const xpText = document.getElementById('hud-xp-text');
        const streakText = document.getElementById('hud-streak-text');
        const shieldText = document.getElementById('hud-shield-text');
        const goldText = document.getElementById('hud-gold-text');
        const levelText = document.getElementById('hud-level-text');
        const equippedTitle = document.getElementById('hud-equipped-title');

        if (!StateManager.data) return;

        const hp = StateManager.data.hero.hp;
        const maxHp = StateManager.data.hero.maxHp;
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        
        if (hpFill) {
            hpFill.style.width = hpPct + '%';
            if (hpPct <= 25) hpFill.classList.add('low');
            else hpFill.classList.remove('low');
        }
        
        if (hpText) {
            const totalHearts = Math.ceil(maxHp / 10);
            const currentHearts = Math.ceil(hp / 10);
            let heartsHtml = '';
            for(let i=0; i<totalHearts; i++) {
                if (i < currentHearts) {
                    heartsHtml += '<img src="assets/life.png" class="sprite-icon small" style="margin-right:2px; width:20px; height:20px;">';
                } else {
                    heartsHtml += '<img src="assets/life.png" class="sprite-icon small" style="margin-right:2px; width:20px; height:20px; filter: grayscale(100%) opacity(50%);">';
                }
            }
            hpText.innerHTML = heartsHtml;
        }

        const xp = StateManager.data.hero.xp;
        const nextXp = 100 + (StateManager.data.hero.level - 1) * 50;
        const xpPct = Math.max(0, Math.min(100, (xp / nextXp) * 100));

        if (xpFill) xpFill.style.width = xpPct + '%';
        if (xpText) xpText.textContent = `XP: ${xp}/${nextXp}`;

        if (levelText) levelText.textContent = `Nv. ${StateManager.data.hero.level}`;

        if (streakText) streakText.textContent = StateManager.data.streak.current;
        if (shieldText) shieldText.textContent = `${StateManager.data.streak.shields}/2`;
        if (goldText && StateManager.data.economy) goldText.textContent = StateManager.data.economy.gold;
        
        if (equippedTitle) {
            let t = StateManager.data.profile.equippedTitle;
            if (t === 'NONE') {
                equippedTitle.textContent = '';
                equippedTitle.style.display = 'none';
            } else {
                equippedTitle.style.display = 'block';
                if (!t) {
                    let h = StateManager.data.hero.level;
                    if (h >= 50) t = 'Leyenda';
                    else if (h >= 35) t = 'Héroe';
                    else if (h >= 20) t = 'Veterano';
                    else if (h >= 10) t = 'Aventurero';
                    else if (h >= 5) t = 'Aprendiz';
                    else t = 'Novato';
                }
                equippedTitle.textContent = t;
            }
        }
    },

    animateHp(data) {
        const avatarBox = document.getElementById('avatar-preview');
        if (!avatarBox) return;

        const floatEl = document.createElement('div');
        floatEl.className = 'floating-text';
        if (data.type === 'heal') {
            floatEl.style.color = '#2ecc71';
            floatEl.textContent = `+${data.amount} HP`;
        } else {
            floatEl.style.color = '#e74c3c';
            floatEl.textContent = `-${data.amount} HP`;
        }

        const rx = Math.random() * 40 - 20;
        floatEl.style.left = `calc(50% + ${rx}px)`;
        floatEl.style.top = `50%`;

        avatarBox.style.position = 'relative';
        avatarBox.appendChild(floatEl);

        setTimeout(() => {
            floatEl.remove();
        }, 1000);
    }
};
