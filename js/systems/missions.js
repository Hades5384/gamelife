// js/systems/missions.js
const XP_REWARDS = { 1: 10, 2: 20, 3: 35, 4: 50 }; 
const COOLDOWNS = { 2: 3, 3: 7, 4: 14 }; 

function checkCooldown(level) {
    if (!COOLDOWNS[level] || !StateManager.data.cooldowns[level]) return { allowed: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = StateManager.data.cooldowns[level].split('-');
    const lastCreated = new Date(year, month - 1, day);
    const diffTime = today - lastCreated;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < COOLDOWNS[level]) {
        return { allowed: false, remaining: COOLDOWNS[level] - diffDays };
    }
    return { allowed: true };
}

function resetStats() {
    StateManager.data.stats = {
        fuerza: { current: 0, max: 100, level: 1 }, sabiduria: { current: 0, max: 100, level: 1 },
        creatividad: { current: 0, max: 100, level: 1 }, carisma: { current: 0, max: 100, level: 1 }
    };
    EventBus.emit('state:updated');
    renderStats(); closeModal('stats-modal');
    showToast("> SISTEMA REINICIADO", "Todas tus estadísticas volvieron al Nivel 1.");
    playTrashSound();
}

function renderStats() {
    if (!StateManager.data) return;
    for (let key in StateManager.data.stats) {
        let stat = StateManager.data.stats[key];
        let percent = Math.min((stat.current / stat.max) * 100, 100);
        const bar = document.getElementById(`bar-${key}`);
        const text = document.getElementById(`text-${key}`);
        if(bar) {
            bar.style.width = percent + '%';
            bar.title = `${stat.current}/${stat.max} XP`;
        }
        if(text) text.textContent = `Lvl ${stat.level}`;
    }
    updateRadar();
}

function renderMissions() {
    const container = document.getElementById('missions-container');
    if(!container || !StateManager.data) return;
    container.innerHTML = ''; 
    const today = Utils.getTodayISO();

    StateManager.data.missions.forEach(mission => {
        const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
        const xpAmount = XP_REWARDS[mission.level] || 15;
        const isCompleted = mission.lastCompleted === today;
        
        const missionEl = document.createElement('div');
        missionEl.className = `mission-item ${isCompleted ? 'mission-completed' : ''}`;
        missionEl.innerHTML = `
            <div class="mission-info" style="display:flex; flex-direction:column; gap:8px;">
                <span style="font-family: 'Pixelify Sans', sans-serif; font-weight: 700; font-size: 1.1rem; color: var(--text-color);">${mission.name}</span>
                <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
                    <span style="background:var(--primary-color); color:var(--bg-color); padding:3px 6px; font-size:0.45rem; font-family:'Press Start 2P', monospace;">+${xpAmount} XP ${statNames[mission.stat].toUpperCase()}</span>
                    <span style="background:var(--tier-gold, #ffd700); color:#000; padding:3px 6px; font-size:0.45rem; font-family:'Press Start 2P', monospace;">+10 <i class="icon-pixel icon-gold" style="width:10px;height:10px;"></i></span>
                </div>
            </div>
            <div class="mission-actions" style="display:flex; gap:8px; align-items:center;">
                <button class="btn-pixel" onclick="completarMision(${mission.id}, event)" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'HECHO' : 'COMPLETAR'}
                </button>
                <button class="btn-delete-mission" onclick="deleteMission(${mission.id})" title="Eliminar Misión">X</button>
            </div>
        `;
        // Feature "deshacer" añadida para el mismo dia (preguntado en el chat)
        if (isCompleted) {
            const undoBtn = document.createElement('button');
            undoBtn.className = 'btn-delete-mission';
            undoBtn.style.color = '#3b82f6';
            undoBtn.style.borderColor = '#3b82f6';
            undoBtn.style.marginLeft = '5px';
            undoBtn.title = 'Deshacer';
            undoBtn.innerHTML = '↺';
            undoBtn.onclick = () => deshacerMision(mission.id);
            missionEl.querySelector('.mission-actions').appendChild(undoBtn);
        }
        
        container.appendChild(missionEl);
    });
}

function completarMision(missionId, event = null) {
    const mission = StateManager.data.missions.find(m => m.id === missionId);
    if (!mission) return;

    const today = Utils.getTodayISO();
    if (mission.lastCompleted === today) return; 

    let stat = StateManager.data.stats[mission.stat];
    const xpGained = XP_REWARDS[mission.level] || 15;
    stat.current += xpGained;

    if (stat.current >= stat.max) {
        let overflowXP = stat.current - stat.max;
        stat.level += 1;
        stat.max = Math.floor(stat.max * 1.5);
        stat.current = overflowXP;
        mostrarLevelUp(mission.stat, stat.level);
        playLevelUpSound(); 
    } else {
        playSuccessSound(); 
    }

    mission.lastCompleted = today;
    
    // Crit roll and Gold Economy
    const baseGold = 10;
    let goldReward = baseGold;
    let isCrit = false;
    
    // 15% Crit Chance
    if (Math.random() < 0.15) {
        isCrit = true;
        goldReward *= 2;
    }
    
    // Guardamos la recompensa exacta para poder revocarla sin explotar el RNG
    mission.lastGoldReward = goldReward;
    
    if (typeof Economy !== 'undefined') Economy.addGold(goldReward);
    
    if (isCrit) {
        showToast("🌟 ÉXITO CRÍTICO", `¡Imparable! Doble Oro obtenido: +${goldReward} 🪙`);
    } else {
        showToast("> MISIÓN COMPLETADA", `Has ganado +${xpGained} XP y +${goldReward} 🪙`);
    }

    // Emit for hero/streak/achievements
    EventBus.emit('mission:completed', { missionId, xpGained, stat: mission.stat, level: mission.level });
    
    if (window.FX && event) {
        FX.spawnFromEvent(event, `+${xpGained} XP`, "var(--primary-color)");
        if (goldRecompensa > 0) {
            setTimeout(() => {
                FX.spawnFromEvent(event, `+${goldRecompensa} ORO`, "var(--tier-gold, #ffd700)");
            }, 250);
        }
    }
    
    EventBus.emit('state:updated');
    
    renderStats(); renderMissions();
}

function deshacerMision(missionId) {
    const mission = StateManager.data.missions.find(m => m.id === missionId);
    if (!mission) return;

    const today = Utils.getTodayISO();
    if (mission.lastCompleted !== today) return; 

    let stat = StateManager.data.stats[mission.stat];
    const xpGained = XP_REWARDS[mission.level] || 15;
    
    stat.current -= xpGained;
    if (stat.current < 0) {
        // Recalcular max de forma determinista desde el nivel anterior
        stat.level = Math.max(1, stat.level - 1);
        let newMax = 100;
        for (let i = 1; i < stat.level; i++) {
            newMax = Math.floor(newMax * 1.5);
        }
        stat.max = newMax;
        stat.current = stat.max + stat.current; // current es negativo aquí
        if (stat.current < 0) stat.current = 0;
    }

    mission.lastCompleted = null;
    
    // Revocar exactamente el oro dado para evitar exploits
    const goldToRevoke = mission.lastGoldReward || 10;
    if (typeof Economy !== 'undefined') Economy.addGold(-goldToRevoke); 
    mission.lastGoldReward = 0;
    
    EventBus.emit('mission:undone', { missionId, xpGained, stat: mission.stat, level: mission.level });
    EventBus.emit('state:updated');
    
    renderStats(); renderMissions();
}

function saveNewMission() {
    const nameInput = document.getElementById('new-mission-name');
    const statInput = document.getElementById('new-mission-stat');
    const levelInput = document.getElementById('new-mission-level');
    
    if(!nameInput || !statInput || !levelInput) return;

    const name = nameInput.value;
    const stat = statInput.value;
    const level = parseInt(levelInput.value);

    if (name.trim() === "") { 
        showToast("> ERROR", "Ingresa un nombre válido.", true); 
        return; 
    }

    const activeMissionsForStat = StateManager.data.missions.filter(m => m.stat === stat);
    
    if (activeMissionsForStat.length >= 2) {
        showToast("> LÍMITE ALCANZADO", `Ya tienes 2 misiones diarias de ${stat}.`, true);
        return;
    }

    if (level > 1) {
        const hasSameLevel = activeMissionsForStat.some(m => m.level === level);
        if (hasSameLevel) {
            showToast("> RESTRICCIÓN", `Ya tienes una misión Nv.${level} activa para ${stat}.`, true);
            return;
        }

        const cooldownStatus = checkCooldown(level);
        if (!cooldownStatus.allowed) {
            showToast("> COOLDOWN", `Espera ${cooldownStatus.remaining} día(s) para crear de este nivel.`, true);
            return;
        }
    }

    const today = Utils.getTodayISO();
    StateManager.data.missions.push({ id: Date.now(), name: name, stat: stat, level: level, lastCompleted: null, createdAt: today });
    if (level > 1) { StateManager.data.cooldowns[level] = today; }

    EventBus.emit('state:updated');
    renderMissions(); closeModal('mission-modal');
    nameInput.value = '';
    showToast("> NUEVA MISIÓN", "Añadida exitosamente al tablón.");
}

function deleteMission(id) {
    const mission = StateManager.data.missions.find(m => m.id === id);
    if (!mission) return;

    showConfirm('¿Seguro que deseas eliminar esta misión?', () => {
        if (mission.level > 1 && mission.createdAt === Utils.getTodayISO()) {
            if (mission.lastCompleted !== Utils.getTodayISO()) {
                StateManager.data.cooldowns[mission.level] = null; 
            }
        }
        StateManager.data.missions = StateManager.data.missions.filter(m => m.id !== id);
        EventBus.emit('state:updated');
        renderMissions();
        showToast("> MISIÓN ELIMINADA", "Descartada correctamente.");
        playTrashSound();
    });
}

function updateRadar() {
    if (!StateManager.data) return;
    const cx = 150; const cy = 100; const maxRadius = 80;
    const s = StateManager.data.stats.sabiduria.current / StateManager.data.stats.sabiduria.max;
    const c = StateManager.data.stats.creatividad.current / StateManager.data.stats.creatividad.max;
    const a = StateManager.data.stats.carisma.current / StateManager.data.stats.carisma.max;
    const f = StateManager.data.stats.fuerza.current / StateManager.data.stats.fuerza.max;
    
    const polygon = document.getElementById('radar-polygon');
    if(polygon) polygon.setAttribute('points', `${cx},${cy - (s * maxRadius)} ${cx + (c * maxRadius)},${cy} ${cx},${cy + (a * maxRadius)} ${cx - (f * maxRadius)},${cy}`);
}

