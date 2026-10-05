// js/systems/history.js
const History = {
    init() {
        EventBus.on('mission:completed', data => this.log('mission', data));
        EventBus.on('hero:levelup', data => this.log('levelup', { level: data }));
        EventBus.on('hero:death', data => this.log('gameover', {}));
        EventBus.on('achievement:unlocked', data => this.log('achievement', { id: data.id }));
    },
    
    log(type, data) {
        if (!StateManager.data) return;
        StateManager.data.history.push({
            ts: Date.now(),
            type: type,
            data: data
        });
        
        if (StateManager.data.history.length > 500) {
            StateManager.data.history.shift(); // Keep max 500
        }
    }
};
