// js/systems/titles.js
const Titles = {
    getAvailableTitles() {
        if (!StateManager.data) return [];
        let titles = [];
        
        // Auto titles
        let h = StateManager.data.hero.level;
        if (h >= 1) titles.push('Novato');
        if (h >= 5) titles.push('Aprendiz');
        if (h >= 10) titles.push('Aventurero');
        if (h >= 20) titles.push('Veterano');
        if (h >= 35) titles.push('Héroe');
        if (h >= 50) titles.push('Leyenda');
        
        // Achievement titles
        for (let key in StateManager.data.achievements) {
            const ach = Achievements.catalog.find(a => a.id === key);
            if (ach && ach.title) {
                titles.push(ach.title);
            }
        }
        
        return titles;
    },
    
    unlock(titleStr) {
        setTimeout(() => showToast("> NUEVO TÍTULO", `Has desbloqueado el título: ${titleStr}`), 2000);
    },
    
    equip(titleStr) {
        StateManager.data.profile.equippedTitle = titleStr;
        EventBus.emit('state:updated');
    }
};
