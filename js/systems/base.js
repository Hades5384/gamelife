// js/systems/base.js
const BaseUI = {
    STAGES: {
        1: { name: "Fogata Solitaria", icon: "🔥", cost: 0, desc: "Apenas un fuego para calentarte. El inicio de tu viaje." },
        2: { name: "Tienda de Campaña", icon: "⛺", cost: 500, desc: "Un refugio rudimentario. Protege de la tormenta." },
        3: { name: "Cabaña de Madera", icon: "🛖", cost: 2000, desc: "Estructura sólida. Muestra tu constancia inquebrantable." },
        4: { name: "Fuerte de Piedra", icon: "🏰", cost: 5000, desc: "Un baluarte defensivo. Disciplina forjada en hierro." },
        5: { name: "Ciudadela del Héroe", icon: "🏛️", cost: 15000, desc: "Tu legado en la tierra. Un monumento eterno a tu esfuerzo." }
    },
    
    open() {
        this.render();
        openModal('base-modal');
    },

    render() {
        if (!StateManager.data.base) {
            StateManager.data.base = { level: 1 };
        }

        const currentLvl = StateManager.data.base.level;
        const stage = this.STAGES[currentLvl];
        const nextStage = this.STAGES[currentLvl + 1];

        document.getElementById('base-icon-display').textContent = stage.icon;
        document.getElementById('base-name-display').textContent = stage.name;
        document.getElementById('base-desc-display').textContent = stage.desc;

        const actionContainer = document.getElementById('base-action-container');
        if (nextStage) {
            const canAfford = Economy.canAfford(nextStage.cost);
            actionContainer.innerHTML = `
                <div style="font-size: 0.55rem; color: var(--text-dim); margin-bottom: 10px;">
                    Próxima evolución: <strong style="color:var(--text-color);">${nextStage.name}</strong>
                </div>
                <button class="btn-pixel" style="padding: 15px; width: 100%; border-color: ${canAfford ? 'var(--tier-gold, #ffd700)' : 'var(--border-color)'}; color: ${canAfford ? 'var(--bg-color)' : 'var(--text-dim)'}; background-color: ${canAfford ? 'var(--tier-gold, #ffd700)' : 'transparent'};" 
                        onclick="BaseUI.upgrade()" ${!canAfford ? 'disabled' : ''}>
                    INVERTIR ${nextStage.cost} 🪙 PARA CONSTRUIR
                </button>
            `;
        } else {
            actionContainer.innerHTML = `
                <div style="font-size: 0.6rem; color: var(--tier-gold, #ffd700); padding: 15px; border: 1px solid var(--tier-gold, #ffd700); background: rgba(255, 215, 0, 0.1);">
                    🌟 Has alcanzado el pináculo de tu legado. Tu Ciudadela es eterna.
                </div>
            `;
        }
    },

    upgrade() {
        const currentLvl = StateManager.data.base.level;
        const nextStage = this.STAGES[currentLvl + 1];
        
        if (!nextStage) return;

        if (Economy.spendGold(nextStage.cost)) {
            StateManager.data.base.level += 1;
            EventBus.emit('state:updated');
            showToast("🏰 LEGADO EXPANDIDO", `Has construido: ${nextStage.name}!`);
            playLevelUpSound();
            this.render();
            
            // Actualizar Oro en el HUD
            const goldText = document.getElementById('hud-gold-text');
            if (goldText) goldText.textContent = `🪙 ${StateManager.data.economy.gold}`;
        } else {
            showToast("> FALTAN RECURSOS", "Necesitas más oro para esta construcción.", true);
        }
    }
};
