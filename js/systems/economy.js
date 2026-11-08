// js/systems/economy.js - Bazar del Aventurero y Sistema de Economía RPG
const Economy = {
    currentTab: 'consumables', // 'consumables' | 'leisure' | 'prestige' | 'history'

    consumables: [
        {
            id: 'pot_hp_25',
            name: 'Poción de Salud Menor',
            cost: 25,
            icon: 'assets/potion.png',
            isSprite: true,
            desc: 'Restaura +25 HP al instante para sanar las heridas del día a día.',
            type: 'consumable',
            effect: () => {
                const currentHp = StateManager.data.hero?.hp ?? 100;
                const maxHp = StateManager.data.hero?.maxHp ?? 100;
                if (currentHp >= maxHp) {
                    showToast('> VITALIDAD AL MÁXIMO', 'Tu salud ya se encuentra al 100%.', true);
                    return false;
                }
                Hero.heal(25);
                return true;
            }
        },
        {
            id: 'pot_hp_60',
            name: 'Poción de Salud Mayor',
            cost: 50,
            icon: 'assets/potion.png',
            isSprite: true,
            desc: 'Restaura +60 HP de golpe. Imprescindible para reponerse de jornadas extenuantes.',
            type: 'consumable',
            effect: () => {
                const currentHp = StateManager.data.hero?.hp ?? 100;
                const maxHp = StateManager.data.hero?.maxHp ?? 100;
                if (currentHp >= maxHp) {
                    showToast('> VITALIDAD AL MÁXIMO', 'Tu salud ya se encuentra al 100%.', true);
                    return false;
                }
                Hero.heal(60);
                return true;
            }
        },
        {
            id: 'item_streak_shield',
            name: 'Escudo Rúnico Protector',
            cost: 90,
            icon: 'assets/shield.png',
            isSprite: true,
            desc: 'Añade +1 Escudo de Racha (máximo 2). Te protege de perder tu racha si un día no puedes completar tus misiones.',
            type: 'consumable',
            effect: () => {
                const shields = StateManager.data.streak?.shields ?? 0;
                if (shields >= 2) {
                    showToast('> ESCUDOS AL MÁXIMO', 'Ya posees el límite de 2 escudos protectores.', true);
                    return false;
                }
                StateManager.data.streak.shields++;
                EventBus.emit('state:updated');
                return true;
            }
        },
        {
            id: 'elixir_full_hp',
            name: 'Elixir de Restauración Total',
            cost: 120,
            icon: 'assets/star.png',
            isSprite: true,
            desc: 'Restaura tu HP al 100% de inmediato y bendice a tu héroe con vigor legendario.',
            type: 'consumable',
            effect: () => {
                const currentHp = StateManager.data.hero?.hp ?? 100;
                const maxHp = StateManager.data.hero?.maxHp ?? 100;
                if (currentHp >= maxHp) {
                    showToast('> VITALIDAD AL MÁXIMO', 'Tu salud ya se encuentra al 100%.', true);
                    return false;
                }
                StateManager.data.hero.hp = maxHp;
                EventBus.emit('hero:hp_changed', { amount: maxHp - currentHp, type: 'heal' });
                EventBus.emit('state:updated');
                return true;
            }
        }
    ],

    defaultLeisure: [
        { id: 'def_coffee', name: 'Pausa para Café Gourmet', cost: 25, icon: '☕', desc: 'Un respiro cálido para disfrutar sin prisas.' },
        { id: 'def_gaming', name: '1 Hora de Gaming / Streaming', cost: 50, icon: '🎮', desc: 'Tiempo de juego o diversión digital sin culpa.' },
        { id: 'def_movie', name: 'Noche de Cine / Series', cost: 75, icon: '🎬', desc: 'Maratón de tu película, anime o serie favorita.' },
        { id: 'def_snack', name: 'Snack / Postre Especial', cost: 100, icon: '🍕', desc: 'Un merecido capricho gastronómico por tus victorias.' },
        { id: 'def_dayoff', name: 'Tarde de Ocio Absoluto', cost: 150, icon: '🛌', desc: 'Desconexión completa con la satisfacción del deber cumplido.' }
    ],

    prestigeTitles: [
        {
            id: 'title_magnate',
            title: 'El Magnate',
            name: 'Título: El Magnate',
            cost: 250,
            icon: 'assets/coin.png',
            isSprite: true,
            desc: 'Demuestra tu opulencia y constancia. Título prestigioso equipable en tu perfil.'
        },
        {
            id: 'title_forgemaster',
            title: 'Patrón de la Forja',
            name: 'Título: Patrón de la Forja',
            cost: 400,
            icon: 'assets/swords.png',
            isSprite: true,
            desc: 'Distintivo de un héroe que domina sus recursos y forja su propio destino.'
        },
        {
            id: 'title_incombustible',
            title: 'El Incombustible',
            name: 'Título: El Incombustible',
            cost: 600,
            icon: 'assets/streak.png',
            isSprite: true,
            desc: 'Reservado para los más disciplinados. Tu voluntad no conoce la rendición.'
        }
    ],

    init() {
        this.ensureState();
        this.renderShop();
        EventBus.on('state:updated', () => this.renderShop());
    },

    ensureState() {
        if (!StateManager.data) return;
        if (!StateManager.data.economy) StateManager.data.economy = { gold: 0 };
        if (!Array.isArray(StateManager.data.economy.customRewards)) {
            StateManager.data.economy.customRewards = [];
        }
        if (!Array.isArray(StateManager.data.economy.purchases)) {
            StateManager.data.economy.purchases = [];
        }
        if (!Array.isArray(StateManager.data.economy.unlockedTitles)) {
            StateManager.data.economy.unlockedTitles = [];
        }
    },

    addGold(amount) {
        this.ensureState();
        StateManager.data.economy.gold += amount;
        if (StateManager.data.economy.gold < 0) StateManager.data.economy.gold = 0;
        EventBus.emit('state:updated');
    },

    spendGold(amount) {
        this.ensureState();
        if (StateManager.data.economy.gold >= amount) {
            StateManager.data.economy.gold -= amount;
            EventBus.emit('state:updated');
            return true;
        }
        return false;
    },

    canAfford(amount) {
        this.ensureState();
        return (StateManager.data.economy?.gold || 0) >= amount;
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.shop-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `shop-tab-${tab}`);
        });
        this.renderShop();
    },

    renderShop() {
        this.ensureState();
        const gold = StateManager.data?.economy?.gold || 0;

        // Actualizar contador superior del bazar
        const counter = document.getElementById('shop-gold-counter');
        if (counter) counter.textContent = gold;

        const grid = document.getElementById('shop-items-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.currentTab === 'consumables') {
            this.renderConsumables(grid, gold);
        } else if (this.currentTab === 'leisure') {
            this.renderLeisure(grid, gold);
        } else if (this.currentTab === 'prestige') {
            this.renderPrestige(grid, gold);
        } else if (this.currentTab === 'history') {
            this.renderHistory(grid);
        }
    },

    renderConsumables(container, gold) {
        this.consumables.forEach(item => {
            const canAfford = gold >= item.cost;
            const card = document.createElement('div');
            card.className = `shop-card-pixel ${canAfford ? '' : 'disabled'}`;

            card.innerHTML = `
                <div class="shop-card-header">
                    <div class="shop-card-title-wrap">
                        <img src="${item.icon}" class="sprite-icon small" alt="${item.name}">
                        <span class="shop-card-name">${item.name}</span>
                    </div>
                    <span class="shop-card-price">
                        ${item.cost} <img src="assets/coin.png" class="sprite-icon small" alt="Oro">
                    </span>
                </div>
                <p class="shop-card-desc">${item.desc}</p>
                <button class="btn-pixel shop-card-action" onclick="Economy.buyConsumable('${item.id}')" ${canAfford ? '' : 'disabled'}>
                    ${canAfford ? 'COMPRAR' : 'ORO INSUFICIENTE'}
                </button>
            `;
            container.appendChild(card);
        });
    },

    buyConsumable(itemId) {
        const item = this.consumables.find(i => i.id === itemId);
        if (!item) return;

        if (!this.canAfford(item.cost)) {
            showToast('> FONDOS INSUFICIENTES', `Necesitas ${item.cost} Oro para adquirir esto.`, true);
            if (window.AudioSys) AudioSys.playSFX('error');
            if (window.FX) FX.shake('light');
            return;
        }

        // Ejecutar efecto antes de cobrar
        const success = item.effect();
        if (!success) return;

        this.spendGold(item.cost);
        this.logPurchase(item.name, item.cost, 'Consumible RPG');

        showToast('> COMPRA EXITOSA', `Has adquirido: ${item.name}`, false);
        if (window.AudioSys) AudioSys.playSFX('coin');
        if (window.FX) {
            FX.flash('green');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#10b981', '#34d399', '#ffffff'], 24);
        }
    },

    renderLeisure(container, gold) {
        const currentHp = StateManager.data?.hero?.hp || 100;
        const maxHp = StateManager.data?.hero?.maxHp || 100;
        const isHpBlocked = currentHp < (maxHp * 0.5);

        if (isHpBlocked) {
            const warning = document.createElement('div');
            warning.className = 'shop-warning-banner';
            warning.innerHTML = `
                <div style="font-family: var(--font-ui); font-size: 0.65rem; color: var(--color-danger); margin-bottom: 4px;">
                    ⚠️ CANJE DE OCIO BLOQUEADO
                </div>
                <div style="font-size: 0.88rem; color: var(--text-color); line-height: 1.4;">
                    Tu salud está por debajo del 50% (${currentHp}/${maxHp} HP). La disciplina exige sanar primero tus heridas cumpliendo misiones o usando la Botica.
                </div>
            `;
            container.appendChild(warning);
        }

        // 1. Recompensas por defecto
        const allLeisure = [
            ...this.defaultLeisure,
            ...(StateManager.data?.economy?.customRewards || [])
        ];

        allLeisure.forEach(item => {
            const canAfford = gold >= item.cost;
            const canBuy = canAfford && !isHpBlocked;
            const card = document.createElement('div');
            card.className = `shop-card-pixel ${canBuy ? '' : 'disabled'}`;

            const isCustom = !!item.isCustom;

            card.innerHTML = `
                <div class="shop-card-header">
                    <div class="shop-card-title-wrap">
                        <span class="shop-card-emoji">${item.icon}</span>
                        <span class="shop-card-name">${item.name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="shop-card-price">
                            ${item.cost} <img src="assets/coin.png" class="sprite-icon small" alt="Oro">
                        </span>
                        ${isCustom ? `<button class="btn-delete-reward" onclick="Economy.deleteCustomReward('${item.id}')" title="Eliminar recompensa">✕</button>` : ''}
                    </div>
                </div>
                <p class="shop-card-desc">${item.desc || 'Recompensa de vida real.'}</p>
                <button class="btn-pixel shop-card-action" onclick="Economy.buyLeisure('${item.id}', ${isCustom})" ${canBuy ? '' : 'disabled'}>
                    ${isHpBlocked ? 'BLOQUEADO (HP < 50%)' : canAfford ? 'CANJEAR PREMIO' : 'ORO INSUFICIENTE'}
                </button>
            `;
            container.appendChild(card);
        });
    },

    buyLeisure(itemId, isCustom = false) {
        const currentHp = StateManager.data?.hero?.hp || 100;
        const maxHp = StateManager.data?.hero?.maxHp || 100;

        // Regla ética de GameLife
        if (currentHp < (maxHp * 0.5)) {
            showToast('> DENEGADO', 'Estás herido (HP < 50%). ¡Cumple tus deberes primero!', true);
            if (window.FX) {
                FX.flash('red');
                FX.shake('medium');
            }
            if (window.AudioSys) AudioSys.playSFX('error');
            return;
        }

        let item;
        if (isCustom) {
            item = (StateManager.data?.economy?.customRewards || []).find(r => r.id === itemId);
        } else {
            item = this.defaultLeisure.find(r => r.id === itemId);
        }

        if (!item) return;

        if (!this.canAfford(item.cost)) {
            showToast('> FONDOS INSUFICIENTES', `Necesitas ${item.cost} Oro.`, true);
            if (window.AudioSys) AudioSys.playSFX('error');
            return;
        }

        this.spendGold(item.cost);
        this.logPurchase(item.name, item.cost, 'Ocio Personal');

        showToast('> ¡PREMIO CANJEADO!', `Disfruta de: ${item.name}`, false);
        if (window.AudioSys) AudioSys.playSFX('coin');
        if (window.FX) {
            FX.flash('gold');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#ffffff', '#ffaa00'], 28);
        }
    },

    saveCustomReward() {
        const nameInput = document.getElementById('new-reward-name');
        const costInput = document.getElementById('new-reward-cost');
        const iconInput = document.getElementById('new-reward-icon');

        if (!nameInput || !costInput) return;

        const name = nameInput.value.trim();
        const cost = parseInt(costInput.value, 10);
        const icon = iconInput ? iconInput.value : '✨';

        if (!name) {
            showToast('> ERROR', 'Ingresa un nombre para la recompensa.', true);
            return;
        }

        if (isNaN(cost) || cost <= 0) {
            showToast('> ERROR', 'El costo en oro debe ser mayor a 0.', true);
            return;
        }

        this.ensureState();
        const newReward = {
            id: 'custom_' + Date.now(),
            name: name,
            cost: cost,
            icon: icon,
            desc: 'Premio personal personalizado.',
            isCustom: true
        };

        StateManager.data.economy.customRewards.push(newReward);
        EventBus.emit('state:updated');

        nameInput.value = '';
        costInput.value = '50';
        closeModal('custom-reward-modal');

        showToast('> NUEVO PREMIO REGISTRADO', `"${name}" añadida al Bazar.`);
        this.renderShop();
    },

    deleteCustomReward(rewardId) {
        this.ensureState();
        showConfirm('¿Deseas eliminar esta recompensa de tu Bazar?', () => {
            StateManager.data.economy.customRewards = StateManager.data.economy.customRewards.filter(r => r.id !== rewardId);
            EventBus.emit('state:updated');
            showToast('> ELIMINADA', 'Recompensa descartada.');
            this.renderShop();
        });
    },

    renderPrestige(container, gold) {
        const unlockedTitles = StateManager.data?.economy?.unlockedTitles || [];

        this.prestigeTitles.forEach(item => {
            const isOwned = unlockedTitles.includes(item.title);
            const canAfford = gold >= item.cost;
            const card = document.createElement('div');
            card.className = `shop-card-pixel ${isOwned ? 'owned' : canAfford ? '' : 'disabled'}`;

            card.innerHTML = `
                <div class="shop-card-header">
                    <div class="shop-card-title-wrap">
                        <img src="${item.icon}" class="sprite-icon small" alt="${item.title}">
                        <span class="shop-card-name">${item.name}</span>
                    </div>
                    <span class="shop-card-price">
                        ${isOwned ? 'DESBLOQUEADO' : `${item.cost} <img src="assets/coin.png" class="sprite-icon small" alt="Oro">`}
                    </span>
                </div>
                <p class="shop-card-desc">${item.desc}</p>
                ${isOwned ? `
                    <button class="btn-pixel shop-card-action" style="background:var(--panel-sub); color:var(--primary-color);" onclick="Titles.equip('${item.title}'); showToast('> TÍTULO EQUIPADO', 'Has equipado: ${item.title}');">
                        EQUIPAR TÍTULO
                    </button>
                ` : `
                    <button class="btn-pixel shop-card-action" onclick="Economy.buyPrestige('${item.id}')" ${canAfford ? '' : 'disabled'}>
                        ${canAfford ? 'ADQUIRIR TÍTULO' : 'ORO INSUFICIENTE'}
                    </button>
                `}
            `;
            container.appendChild(card);
        });
    },

    buyPrestige(itemId) {
        const item = this.prestigeTitles.find(t => t.id === itemId);
        if (!item) return;

        this.ensureState();
        const unlockedTitles = StateManager.data.economy.unlockedTitles;
        if (unlockedTitles.includes(item.title)) {
            showToast('> YA LO POSEES', 'Ya has desbloqueado este título de prestigio.');
            return;
        }

        if (!this.canAfford(item.cost)) {
            showToast('> FONDOS INSUFICIENTES', `Necesitas ${item.cost} Oro para este título.`, true);
            if (window.AudioSys) AudioSys.playSFX('error');
            return;
        }

        this.spendGold(item.cost);
        unlockedTitles.push(item.title);
        Titles.unlock(item.title);
        this.logPurchase(item.name, item.cost, 'Prestigio');

        showToast('> TÍTULO OBTENIDO', `¡Has adquirido el título: ${item.title}!`);
        if (window.AudioSys) AudioSys.playSFX('levelup');
        if (window.FX) {
            FX.flash('gold');
            FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 2, ['#ffd700', '#00e5ff', '#ffffff'], 32);
        }

        this.renderShop();
    },

    logPurchase(name, cost, category) {
        this.ensureState();
        const record = {
            id: 'pur_' + Date.now(),
            name: name,
            cost: cost,
            category: category,
            date: Utils.getTodayISO(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        StateManager.data.economy.purchases.unshift(record);
        if (StateManager.data.economy.purchases.length > 25) {
            StateManager.data.economy.purchases.pop();
        }
        EventBus.emit('state:updated');
    },

    renderHistory(container) {
        const purchases = StateManager.data?.economy?.purchases || [];

        if (purchases.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'shop-empty-state';
            empty.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 8px;">📜</div>
                <div style="font-family: var(--font-ui); font-size: 0.65rem; color: var(--text-dim);">HISTORIAL VACÍO</div>
                <div style="font-size: 0.88rem; color: var(--text-color); margin-top: 4px;">Aún no has realizado canjes en el Bazar.</div>
            `;
            container.appendChild(empty);
            return;
        }

        const wrap = document.createElement('div');
        wrap.className = 'shop-history-list';

        purchases.forEach(p => {
            const item = document.createElement('div');
            item.className = 'shop-history-row';
            item.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:700; color:var(--text-color); font-size:0.95rem;">${p.name}</span>
                    <span style="font-size:0.75rem; color:var(--text-dim);">${p.category} • ${p.date} ${p.time || ''}</span>
                </div>
                <div style="font-family:var(--font-ui); font-size:0.65rem; color:var(--tier-gold); display:flex; align-items:center; gap:4px;">
                    -${p.cost} <img src="assets/coin.png" class="sprite-icon small" alt="Oro">
                </div>
            `;
            wrap.appendChild(item);
        });

        container.appendChild(wrap);
    }
};

// Autoinicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    Economy.init();
});

window.Economy = Economy;
