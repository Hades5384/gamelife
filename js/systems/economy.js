// js/systems/economy.js
const Economy = {
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
    }
};
