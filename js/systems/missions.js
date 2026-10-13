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

let showCompletedMissions = false;

function toggleCompletedMissions() {
    showCompletedMissions = !showCompletedMissions;
    renderMissions();
}

function createMissionCard(mission, isCompleted) {
    const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
    const xpAmount = XP_REWARDS[mission.level] || 15;
    
    const missionEl = document.createElement('div');
    missionEl.className = `mission-item ${isCompleted ? 'mission-completed' : ''}`;
    missionEl.setAttribute('data-id', mission.id);
    
    missionEl.innerHTML = `
        <div class="mission-info" style="display:flex; flex-direction:column; gap:8px;">
            <span style="font-family: 'Pixelify Sans', sans-serif; font-weight: 700; font-size: 1.15rem; color: var(--text-color);">${mission.name}</span>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <span style="background:var(--border-color); color:var(--text-dim); padding:3px 6px; font-size:0.5rem; font-family:'Press Start 2P', monospace;">RANGO ${mission.level === 1 ? 'D' : mission.level === 2 ? 'C' : mission.level === 3 ? 'B' : 'S'}</span>
                <span style="background:var(--primary-color); color:var(--bg-color); padding:3px 6px; font-size:0.5rem; font-family:'Press Start 2P', monospace;">+${xpAmount} XP ${statNames[mission.stat] ? statNames[mission.stat].toUpperCase() : 'EXP'}</span>
                <span style="background:var(--tier-gold, #ffd700); color:#000; padding:3px 6px; font-size:0.5rem; font-family:'Press Start 2P', monospace;">+10 <i class="icon-pixel icon-gold" style="width:10px;height:10px;"></i></span>
            </div>
        </div>
        <div class="mission-actions" style="display:flex; gap:8px; align-items:center;">
            ${isCompleted ? `
                <button class="btn-pixel" disabled style="background:var(--border-color); color:var(--text-dim); cursor:default;">
                    ✔ CUMPLIDA
                </button>
                <button class="btn-delete-mission" style="color:var(--primary-color); border-color:var(--primary-color);" onclick="deshacerMision(${mission.id})" title="Deshacer misión">↺</button>
            ` : `
                <button class="btn-pixel" onclick="completarMision(${mission.id}, event)">
                    COMPLETAR
                </button>
            `}
            <button class="btn-delete-mission" onclick="deleteMission(${mission.id})" title="Eliminar Misión">X</button>
        </div>
    `;
    return missionEl;
}

function renderMissions() {
    const container = document.getElementById('missions-container');
    if(!container || !StateManager.data) return;
    container.innerHTML = ''; 
    const today = Utils.getTodayISO();

    const activeMissions = StateManager.data.missions.filter(m => m.lastCompleted !== today);
    const completedToday = StateManager.data.missions.filter(m => m.lastCompleted === today);

    // 1. Misiones Activas (Pendientes de hoy)
    if (activeMissions.length === 0) {
        const victoryBanner = document.createElement('div');
        victoryBanner.className = 'all-completed-banner';
        victoryBanner.innerHTML = `
            <div class="banner-icon">★ ⚔️ ★</div>
            <div class="banner-title">¡TABLÓN DESPEJADO!</div>
            <div class="banner-subtitle">Has cumplido todas tus misiones de hoy. Tu héroe descansa con honor.</div>
        `;
        container.appendChild(victoryBanner);
    } else {
        activeMissions.forEach(mission => {
            container.appendChild(createMissionCard(mission, false));
        });
    }

    // 2. Sección colapsable de misiones completadas hoy
    if (completedToday.length > 0) {
        const completedWrap = document.createElement('div');
        completedWrap.className = 'completed-section-wrapper';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'completed-section-toggle';
        toggleBtn.onclick = toggleCompletedMissions;
        toggleBtn.innerHTML = `
            <span>✔ COMPLETADAS HOY (${completedToday.length})</span>
            <span class="toggle-arrow">${showCompletedMissions ? '▲ OCULTAR' : '▼ VER'}</span>
        `;
        completedWrap.appendChild(toggleBtn);

        if (showCompletedMissions) {
            const list = document.createElement('div');
            list.className = 'completed-section-list';
            completedToday.forEach(mission => {
                list.appendChild(createMissionCard(mission, true));
            });
            completedWrap.appendChild(list);
        }

        container.appendChild(completedWrap);
    }
}

function completarMision(missionId, event = null) {
    const mission = StateManager.data.missions.find(m => m.id === missionId);
    if (!mission) return;

    const today = Utils.getTodayISO();
    if (mission.lastCompleted === today) return; 

    // Feedback táctil instantáneo en el botón y animación de desplazamiento en la tarjeta
    const btn = event ? event.currentTarget : null;
    const card = btn ? btn.closest('.mission-item') : null;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '✔ ¡HECHO!';
        btn.style.backgroundColor = 'var(--color-emerald, #10b981)';
        btn.style.color = '#fff';
    }

    const xpGained = XP_REWARDS[mission.level] || 15;

    // Crit roll and Gold Economy (15% de probabilidad de Golpe Crítico)
    const baseGold = 10;
    let goldReward = baseGold;
    const isCrit = Math.random() < 0.15;
    if (isCrit) {
        goldReward *= 2;
    }
    mission.lastGoldReward = goldReward;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = isCrit ? '★ ¡CRÍTICO!' : '✔ ¡HECHO!';
        btn.style.backgroundColor = isCrit ? 'var(--tier-gold, #ffd700)' : 'var(--color-emerald, #10b981)';
        btn.style.color = isCrit ? '#000' : '#fff';
    }

    const clickX = event && event.clientX ? event.clientX : window.innerWidth / 2;
    const clickY = event && event.clientY ? event.clientY : window.innerHeight / 2;

    // Game Feel Extremo & Juice Visual/Sonoro
    if (window.FX) {
        if (isCrit) {
            FX.shake('light');
            FX.flash('gold');
            FX.pixelBurst(clickX, clickY, ['#ffd700', '#ffea00', '#ffffff', '#ff9900', '#fff5b8'], 26);
            FX.spawnFromEvent(event, `💥 ¡CRÍTICO! +${xpGained} XP`, '#ffd700', true);
            if (window.AudioSys) AudioSys.playSFX('crit');
            else playSuccessSound();

            setTimeout(() => {
                FX.spawnFromEvent(event, `+${goldReward} ORO 🪙`, '#ffd700');
                if (window.AudioSys) AudioSys.playSFX('coin');
            }, 260);
        } else {
            FX.pixelBurst(clickX, clickY, ['var(--primary-color)', '#10b981', '#34d399', '#ffffff'], 16);
            FX.spawnFromEvent(event, `+${xpGained} XP`, 'var(--primary-color)');
            if (window.AudioSys) AudioSys.playSFX('success');
            else playSuccessSound();

            if (goldReward > 0) {
                setTimeout(() => {
                    FX.spawnFromEvent(event, `+${goldReward} ORO 🪙`, 'var(--tier-gold, #ffd700)');
                    if (window.AudioSys) AudioSys.playSFX('coin');
                }, 220);
            }
        }
    } else {
        if (isCrit) playSuccessSound();
        else playSuccessSound();
    }

    // Desplazamiento animado de la tarjeta hacia fuera
    if (card) {
        card.classList.add('mission-completing');
    }

    // Esperar a que concluya la animación (400ms) para actualizar el estado del juego
    setTimeout(() => {
        let stat = StateManager.data.stats[mission.stat];
        stat.current += xpGained;

        if (stat.current >= stat.max) {
            let overflowXP = stat.current - stat.max;
            stat.level += 1;
            stat.max = Math.floor(stat.max * 1.5);
            stat.current = overflowXP;
            mostrarLevelUp(mission.stat, stat.level);
            if (window.AudioSys) AudioSys.playSFX('levelup');
            else playLevelUpSound(); 
            if (window.FX) {
                FX.flash('gold');
                FX.pixelBurst(window.innerWidth / 2, window.innerHeight / 3, ['#ffd700', '#00e5ff', '#ff3366', '#ffffff'], 30);
            }
        }

        mission.lastCompleted = today;

        if (typeof Economy !== 'undefined') Economy.addGold(goldReward);

        if (isCrit) {
            showToast("🌟 ÉXITO CRÍTICO", `¡Imparable! Doble Oro obtenido: +${goldReward} 🪙`);
        } else {
            showToast("> MISIÓN COMPLETADA", `Has ganado +${xpGained} XP y +${goldReward} 🪙`);
        }

        // Emit for hero/streak/achievements
        EventBus.emit('mission:completed', { missionId, xpGained, stat: mission.stat, level: mission.level, isCrit });
        EventBus.emit('state:updated');

        renderStats();
        renderMissions();
    }, 400);
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

