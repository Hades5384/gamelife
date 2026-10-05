// js/systems/rest.js
const Rest = {
    scheduleRest(dateStr) {
        if (!StateManager.data.rest.days.includes(dateStr)) {
            const [year, month] = dateStr.split('-');
            const monthKey = `${year}-${month}`;
            
            if (!StateManager.data.rest.usedByMonth[monthKey]) {
                StateManager.data.rest.usedByMonth[monthKey] = 0;
            }
            if (StateManager.data.rest.usedByMonth[monthKey] >= 3) {
                showToast("> ERROR", "Límite de 3 días de descanso por mes alcanzado.", true);
                return false;
            }
            
            StateManager.data.rest.days.push(dateStr);
            StateManager.data.rest.usedByMonth[monthKey]++;
            EventBus.emit('state:updated');
            showToast("> DESCANSO PROGRAMADO", `Día ${dateStr} configurado como descanso.`);
            return true;
        }
        return false;
    },
    
    isRestDay(dateStr) {
        return StateManager.data.rest.days.includes(dateStr);
    }
};
