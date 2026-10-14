// js/systems/economy.js
const Economy = {
    items: [
        { id: 'coffee', name: 'Pausa para café', cost: 50, icon: '☕' },
        { id: 'gaming', name: '1 Hora de juego', cost: 100, icon: '🎮' },
        { id: 'movie', name: 'Ver película', cost: 150, icon: '🎬' }
    ],

    init() {
        this.renderShop();
        EventBus.on('state:updated', () => this.renderShop());
    },

    addGold(amount) {
        if (!StateManager.data) return;
        if (!StateManager.data.economy) StateManager.data.economy = { gold: 0 };
        
        StateManager.data.economy.gold += amount;
        if (StateManager.data.economy.gold < 0) StateManager.data.economy.gold = 0;
        EventBus.emit('state:updated');
    },

    spendGold(amount) {
        if (!StateManager.data) return false;
        if (!StateManager.data.economy) StateManager.data.economy = { gold: 0 };

        if (StateManager.data.economy.gold >= amount) {
            StateManager.data.economy.gold -= amount;
            EventBus.emit('state:updated');
            return true;
        }
        return false;
    },

    canAfford(amount) {
        if (!StateManager.data) return false;
        return (StateManager.data.economy?.gold || 0) >= amount;
    },

    renderShop() {
        const container = document.getElementById('shop-container');
        if (!container) return;

        const state = StateManager.data;
        const currentGold = state.economy?.gold || 0;
        
        container.innerHTML = '';
        this.items.forEach(item => {
            const canAfford = currentGold >= item.cost;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            if(!canAfford) itemDiv.style.opacity = '0.5';
            
            itemDiv.innerHTML = `
                <span>${item.icon} ${item.name}</span>
                <span class="color-gold" style="display:inline-flex; align-items:center; gap:4px;">
                    ${item.cost} <img src="assets/coin.png" class="sprite-icon" style="width:12px; height:12px;" alt="Oro">
                </span>
            `;
            
            itemDiv.onclick = () => this.buyItem(item.id);
            container.appendChild(itemDiv);
        });
    },

    buyItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        const state = StateManager.data;
        const currentHp = state.hero?.hp || 100;
        const maxHp = state.hero?.maxHp || 100;

        // V4 Ethical Rule: Block leisure if HP < 50%
        if (currentHp < (maxHp * 0.5)) {
            if (typeof showToast === 'function') {
                showToast('> DENEGADO', 'Estás herido (HP < 50%). ¡Cumple tus deberes primero!', true);
            }
            if (window.FX) {
                FX.flash('red');
                FX.shake('medium');
            }
            if (window.AudioSys) AudioSys.playSFX('error');
            return;
        }

        if (this.canAfford(item.cost)) {
            this.spendGold(item.cost);
            if (typeof showToast === 'function') {
                showToast('> CANJE EXITOSO', `Has adquirido: ${item.name}`, false);
            }
            if (window.FX) {
                FX.flash('gold');
                FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#ffffff', '#ffaa00'], 20);
            }
            if (window.AudioSys) {
                AudioSys.playSFX('coin');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('> FONDOS INSUFICIENTES', `Necesitas ${item.cost} Oro.`, true);
            }
            if (window.FX) {
                FX.flash('red');
                FX.shake('light');
            }
            if (window.AudioSys) {
                AudioSys.playSFX('error');
            }
        }
    }
};

// Auto-initialize when the script loads or you can call Economy.init() from main.js
document.addEventListener('DOMContentLoaded', () => {
    // wait a brief moment for state to be ready
    setTimeout(() => { if(window.Economy) Economy.init(); }, 500);
});

// Explicit window export for global accessibility
window.Economy = Economy;

