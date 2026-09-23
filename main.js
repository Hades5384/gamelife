let isSoundEnabled = localStorage.getItem('rpg_sound') !== 'false'; 
let audioCtx, masterGain, bgmGain, sfxGain;
let audioInitialized = false;
let bgmTimerID = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    masterGain = audioCtx.createGain();
    bgmGain = audioCtx.createGain();
    sfxGain = audioCtx.createGain();
    
    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    
    const savedVol = localStorage.getItem('rpg_volume') || 0.3;
    const volSlider = document.getElementById('volume-slider');
    if(volSlider) volSlider.value = savedVol;
    masterGain.gain.value = savedVol;
    audioInitialized = true;
}

const unlockAudio = () => {
    if (isSoundEnabled && !audioInitialized) {
        initAudio();
        audioCtx.resume();
        if (!bgmTimerID) scheduleBGM();
    } else if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

function updateVolume() {
    if (!masterGain) return;
    const vol = document.getElementById('volume-slider').value;
    masterGain.gain.value = vol;
    localStorage.setItem('rpg_volume', vol);
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('rpg_sound', isSoundEnabled);
    updateSoundButtonUI();
    
    if (isSoundEnabled) {
        if (!audioInitialized) initAudio();
        audioCtx.resume();
        if (!bgmTimerID) scheduleBGM();
        playSuccessSound(); 
    }
}

function updateSoundButtonUI() {
    const btn = document.getElementById('btn-sound');
    if (!btn) return;
    btn.textContent = isSoundEnabled ? '🔊' : '🔇';
    btn.style.color = isSoundEnabled ? 'var(--primary-color)' : '#EF4444';
    btn.style.borderColor = isSoundEnabled ? 'var(--primary-color)' : '#EF4444';
}

function playTone(frequency, type = 'square', duration = 0.1, vol = 0.15, slideFreq = null) {
    if (!isSoundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        if (slideFreq) { 
            osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(sfxGain);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playClickSound() { playTone(800, 'square', 0.04, 0.05); } 
function playModalOpenSound() { playTone(300, 'sine', 0.15, 0.1, 600); } 
function playModalCloseSound() { playTone(600, 'sine', 0.15, 0.1, 300); } 
function playSuccessSound() { 
    if (!isSoundEnabled) return;
    playTone(987.77, 'square', 0.1); 
    setTimeout(() => playTone(1318.51, 'square', 0.3), 100); 
}
function playLevelUpSound() {
    if (!isSoundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, index) => { setTimeout(() => playTone(freq, 'square', 0.15, 0.2), index * 120); });
    setTimeout(() => playTone(1046.50, 'square', 0.6, 0.2), notes.length * 120);
}
function playErrorSound() {
    if (!isSoundEnabled) return;
    playTone(150, 'sawtooth', 0.2, 0.2);
    setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.2), 200);
}
function playTrashSound() {
    if (!isSoundEnabled) return;
    playTone(300, 'sawtooth', 0.1, 0.15);
    setTimeout(() => playTone(200, 'sawtooth', 0.15, 0.15), 100);
}

document.addEventListener('mousedown', (e) => {
    if (!isSoundEnabled) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'SELECT' || e.target.classList.contains('drop-zone')) {
        playClickSound();
    }
});

const bgmTracks = {
    '1': { notes: [261.63, 392.00, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66], bass: [130.81, 130.81, 174.61, 196.00], speed: 0.5, wave: 'sine', bassWave: 'triangle' },
    '2': { notes: [329.63, 293.66, 261.63, 246.94, 220.00, 246.94, 261.63, 293.66], bass: [110.00, 110.00, 110.00, 82.41, 82.41, 82.41, 98.00, 98.00], speed: 0.4, wave: 'triangle', bassWave: 'sine' },
    '3': { notes: [440, 440, 880, 440, 523.25, 587.33, 523.25, 493.88], bass: [110, 110, 55, 110, 130.81, 130.81, 65.41, 130.81], speed: 0.18, wave: 'sawtooth', bassWave: 'square' }
};

let currentBgmTrack = localStorage.getItem('rpg_bgm_track') || '1';
let noteIndex = 0; let bassIndex = 0; let nextNoteTime = 0;

function changeBGM() {
    currentBgmTrack = document.getElementById('bgm-select').value;
    localStorage.setItem('rpg_bgm_track', currentBgmTrack);
    noteIndex = 0; bassIndex = 0; 
}

function scheduleBGM() {
    if (!isSoundEnabled || !audioCtx || audioCtx.state === 'suspended' || currentBgmTrack === '0') {
        bgmTimerID = requestAnimationFrame(scheduleBGM);
        return;
    }

    const track = bgmTracks[currentBgmTrack];
    if (nextNoteTime < audioCtx.currentTime) { nextNoteTime = audioCtx.currentTime + 0.1; }

    while (nextNoteTime < audioCtx.currentTime + 0.2) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = track.wave;
        osc.frequency.value = track.notes[noteIndex];
        
        gain.gain.setValueAtTime(0, nextNoteTime);
        gain.gain.linearRampToValueAtTime(0.08, nextNoteTime + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + track.speed + 0.1); 
        
        osc.connect(gain);
        gain.connect(bgmGain);
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + track.speed + 0.1);

        const bassTrigger = currentBgmTrack === '2' ? (noteIndex % 3 === 0) : (noteIndex === 0 || noteIndex === Math.floor(track.notes.length / 2));

        if (bassTrigger) {
            const bOsc = audioCtx.createOscillator();
            const bGain = audioCtx.createGain();
            bOsc.type = track.bassWave;
            bOsc.frequency.value = track.bass[bassIndex];
            
            bGain.gain.setValueAtTime(0, nextNoteTime);
            bGain.gain.linearRampToValueAtTime(0.12, nextNoteTime + 0.1);
            bGain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + (track.speed * 4)); 
            
            bOsc.connect(bGain);
            bGain.connect(bgmGain);
            bOsc.start(nextNoteTime);
            bOsc.stop(nextNoteTime + (track.speed * 4));

            bassIndex = (bassIndex + 1) % track.bass.length;
        }

        noteIndex = (noteIndex + 1) % track.notes.length;
        nextNoteTime += track.speed; 
    }
    bgmTimerID = requestAnimationFrame(scheduleBGM);
}

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function showToast(title, msg, isError = false) {
    if (isError) playErrorSound();

    const toast = document.getElementById('generic-toast');
    const titleEl = document.getElementById('toast-title');
    const msgEl = document.getElementById('toast-message');
    
    titleEl.innerHTML = title;
    titleEl.style.color = isError ? '#EF4444' : 'var(--accent-color)';
    toast.style.borderColor = isError ? '#EF4444' : 'var(--primary-color)';
    toast.style.boxShadow = isError ? '0px 0px 20px #EF4444, 8px 8px 0px var(--shadow-glow)' : '0px 0px 20px var(--primary-color), 8px 8px 0px var(--shadow-glow)';
    
    msgEl.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    playModalOpenSound();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    playModalCloseSound();
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('mousedown', (e) => {
        if(e.target === overlay) closeModal(overlay.id);
    });
});

let confirmCallback = null;
function showConfirm(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    openModal('confirm-modal');
    confirmCallback = callback;
}
function confirmYes() {
    if(confirmCallback) confirmCallback();
    closeModal('confirm-modal');
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('selected_theme', themeName);
    const themeBgKey = 'custom_background_' + themeName;
    const savedBg = localStorage.getItem(themeBgKey);

    const bgUrlInput = document.getElementById('input-bg-url');
    const bgFileLabel = document.getElementById('bg-file-label');
    if (bgUrlInput) bgUrlInput.value = '';
    
    if (bgFileLabel) {
        bgFileLabel.innerHTML = `[^] Haz Clic, Arrastra o Pega el Fondo aquí`;
    }
    currentBgData = '';

    if (savedBg) {
        document.body.style.backgroundImage = `url('${savedBg}')`;
        if (savedBg.startsWith('http') || savedBg.startsWith('data:')) {
            if (savedBg.startsWith('http') && bgUrlInput) bgUrlInput.value = savedBg;
            else currentBgData = savedBg;
        }
    } else {
        document.body.style.backgroundImage = 'none';
    }
}

let currentAvatarData = '';
let currentBgData = '';

function updateProfileLive() {
    const name = document.getElementById('input-name').value || 'CREATOR';
    const bio = document.getElementById('input-bio').value || '"Construyendo el cambio, forjando ideas y entrenando el cuerpo."';
    const avatarUrl = document.getElementById('input-avatar').value.trim();

    document.getElementById('display-name').textContent = name;
    document.getElementById('display-bio').textContent = bio;

    const avatarBox = document.getElementById('avatar-preview');
    const defaultAvatarSVG = `<svg viewBox="0 0 16 16" style="width:50px; height:50px; fill:var(--primary-color); shape-rendering: crispEdges;"><rect x="5" y="2" width="6" height="6"/><rect x="3" y="9" width="10" height="7"/></svg>`;

    if (currentAvatarData) {
        avatarBox.innerHTML = `<img src="${currentAvatarData}" alt="Avatar">`;
    } else if (avatarUrl) {
        avatarBox.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.onerror=null; this.parentNode.innerHTML='${defaultAvatarSVG}';">`;
        currentAvatarData = avatarUrl;
    } else {
        avatarBox.innerHTML = defaultAvatarSVG;
    }

    try {
        localStorage.setItem('profile_name', name);
        localStorage.setItem('profile_bio', bio);
        localStorage.setItem('profile_avatar', currentAvatarData);
    } catch (e) { 
        showToast("> MEMORIA LLENA", "Límite de memoria al guardar perfil. Usa URLs.", true);
    }
}

function handleFileSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    document.getElementById('file-label').innerHTML = `✓ Avatar cargado`;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentAvatarData = e.target.result;
        document.getElementById('input-avatar').value = '';
        updateProfileLive();
    };
    reader.readAsDataURL(file);
}

function updateBackgroundLive() {
    const bgUrl = document.getElementById('input-bg-url').value.trim();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBgKey = 'custom_background_' + currentTheme;

    try {
        if (currentBgData) {
            document.body.style.backgroundImage = `url('${currentBgData}')`;
            localStorage.setItem(themeBgKey, currentBgData);
        } else if (bgUrl) {
            document.body.style.backgroundImage = `url('${bgUrl}')`;
            localStorage.setItem(themeBgKey, bgUrl);
        } else {
            document.body.style.backgroundImage = 'none';
            localStorage.removeItem(themeBgKey);
        }
    } catch (e) {
        showToast("> MEMORIA LLENA", "El archivo es muy pesado. Usa URL.", true);
        clearBackground();
    }
}

function handleBgFileSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    document.getElementById('bg-file-label').innerHTML = `✓ Fondo cargado`;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentBgData = e.target.result;
        document.getElementById('input-bg-url').value = '';
        updateBackgroundLive();
    };
    reader.readAsDataURL(file);
}

function clearBackground() {
    currentBgData = '';
    document.getElementById('input-bg-url').value = '';
    document.getElementById('bg-file-label').innerHTML = `[^] Haz Clic, Arrastra o Pega el Fondo aquí`;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    localStorage.removeItem('custom_background_' + currentTheme);
    document.body.style.backgroundImage = 'none';
}

function setupDropZone(zoneId, inputId, callback) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if(!zone || !input) return;

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            callback({ target: input });
        }
    });
}

window.addEventListener('paste', (event) => {
    const profileActive = document.getElementById('profile-modal').classList.contains('active');
    const bgActive = document.getElementById('bg-modal').classList.contains('active');
    
    if (!profileActive && !bgActive) return;

    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.type.indexOf('image') === 0) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(e) {
                if (profileActive) {
                    currentAvatarData = e.target.result;
                    document.getElementById('file-label').innerHTML = '✓ Avatar pegado';
                    document.getElementById('input-avatar').value = '';
                    updateProfileLive();
                    showToast("> SISTEMA", "Avatar actualizado (Ctrl+V) 📋✨");
                } else if (bgActive) {
                    currentBgData = e.target.result;
                    document.getElementById('bg-file-label').innerHTML = '✓ Fondo pegado';
                    document.getElementById('input-bg-url').value = '';
                    updateBackgroundLive();
                    showToast("> SISTEMA", "Fondo actualizado (Ctrl+V) 📋✨");
                }
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
});

const XP_REWARDS = { 1: 10, 2: 20, 3: 35, 4: 50 }; 
const COOLDOWNS = { 2: 3, 3: 7, 4: 14 }; 

let defaultStats = {
    fuerza: { current: 0, max: 100, level: 1 },
    sabiduria: { current: 0, max: 100, level: 1 },
    creatividad: { current: 0, max: 100, level: 1 },
    carisma: { current: 0, max: 100, level: 1 }
};
let statsData = JSON.parse(localStorage.getItem('rpg_stats')) || defaultStats;

let defaultMissions = [
    { id: 1, name: "Entrenamiento pesado", stat: "fuerza", level: 3, lastCompleted: null, createdAt: null },
    { id: 2, name: "Escribir código / Estudiar", stat: "sabiduria", level: 2, lastCompleted: null, createdAt: null },
    { id: 3, name: "Dibujo web", stat: "creatividad", level: 2, lastCompleted: null, createdAt: null }
];
let loadedMissions = JSON.parse(localStorage.getItem('rpg_missions'));
let missionsData = loadedMissions ? loadedMissions.map(m => {
    if (!m.level) return { ...m, level: 2, lastCompleted: null, createdAt: null };
    return m;
}) : defaultMissions;

let defaultCooldowns = { 2: null, 3: null, 4: null };
let cooldownsData = JSON.parse(localStorage.getItem('rpg_cooldowns')) || defaultCooldowns;

function saveData() {
    localStorage.setItem('rpg_stats', JSON.stringify(statsData));
    localStorage.setItem('rpg_missions', JSON.stringify(missionsData));
    localStorage.setItem('rpg_cooldowns', JSON.stringify(cooldownsData));
}

function checkCooldown(level) {
    if (!COOLDOWNS[level] || !cooldownsData[level]) return { allowed: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = cooldownsData[level].split('-');
    const lastCreated = new Date(year, month - 1, day);
    const diffTime = today - lastCreated;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < COOLDOWNS[level]) {
        return { allowed: false, remaining: COOLDOWNS[level] - diffDays };
    }
    return { allowed: true };
}

function resetStats() {
    statsData = {
        fuerza: { current: 0, max: 100, level: 1 }, sabiduria: { current: 0, max: 100, level: 1 },
        creatividad: { current: 0, max: 100, level: 1 }, carisma: { current: 0, max: 100, level: 1 }
    };
    saveData(); renderStats(); closeModal('stats-modal');
    showToast("> SISTEMA REINICIADO", "Todas tus estadísticas volvieron al Nivel 1.");
    playTrashSound();
}

function renderStats() {
    for (let key in statsData) {
        let stat = statsData[key];
        let percent = Math.min((stat.current / stat.max) * 100, 100);
        document.getElementById(`bar-${key}`).style.width = percent + '%';
        document.getElementById(`text-${key}`).textContent = `Nv.${stat.level} | ${stat.current}/${stat.max}`;
    }
    updateRadar();
}

function renderMissions() {
    const container = document.getElementById('missions-container');
    container.innerHTML = ''; 
    const today = getTodayString();

    missionsData.forEach(mission => {
        const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
        const xpAmount = XP_REWARDS[mission.level] || 15;
        const isCompleted = mission.lastCompleted === today;
        
        const missionEl = document.createElement('div');
        missionEl.className = `mission-item ${isCompleted ? 'mission-completed' : ''}`;
        missionEl.innerHTML = `
            <div class="mission-info">
                ${mission.name}
                <span>+${xpAmount} XP ${statNames[mission.stat]} (Nv. ${mission.level})</span>
            </div>
            <div>
                <button class="btn-pixel" onclick="completarMision(${mission.id})">
                    ${isCompleted ? 'HECHO' : 'Completar'}
                </button>
                <button class="btn-delete-mission" onclick="deleteMission(${mission.id})" title="Eliminar Misión">X</button>
            </div>
        `;
        container.appendChild(missionEl);
    });
}

function completarMision(missionId) {
    const mission = missionsData.find(m => m.id === missionId);
    if (!mission) return;

    const today = getTodayString();
    if (mission.lastCompleted === today) return; 

    let stat = statsData[mission.stat];
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
    saveData(); renderStats(); renderMissions();
}

function mostrarLevelUp(statKey, newLevel) {
    const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
    const toast = document.getElementById('level-up-toast');
    document.getElementById('level-up-message').textContent = `Tu ${statNames[statKey]} subió a Nivel ${newLevel}!`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function saveNewMission() {
    const name = document.getElementById('new-mission-name').value;
    const stat = document.getElementById('new-mission-stat').value;
    const level = parseInt(document.getElementById('new-mission-level').value);

    if (name.trim() === "") { 
        showToast("> ERROR", "Ingresa un nombre válido.", true); 
        return; 
    }

    const activeMissionsForStat = missionsData.filter(m => m.stat === stat);
    
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

    const today = getTodayString();
    missionsData.push({ id: Date.now(), name: name, stat: stat, level: level, lastCompleted: null, createdAt: today });
    if (level > 1) { cooldownsData[level] = today; }

    saveData(); renderMissions(); closeModal('mission-modal');
    document.getElementById('new-mission-name').value = '';
    showToast("> NUEVA MISIÓN", "Añadida exitosamente al tablón.");
}

function deleteMission(id) {
    const mission = missionsData.find(m => m.id === id);
    if (!mission) return;

    showConfirm('¿Seguro que deseas eliminar esta misión?', () => {
        if (mission.level > 1 && mission.createdAt === getTodayString()) {
            if (mission.lastCompleted !== getTodayString()) {
                cooldownsData[mission.level] = null; 
            }
        }
        missionsData = missionsData.filter(m => m.id !== id);
        saveData(); renderMissions();
        showToast("> MISIÓN ELIMINADA", "Descartada correctamente.");
        playTrashSound();
    });
}

function updateRadar() {
    const cx = 150; const cy = 100; const maxRadius = 80;
    const s = statsData.sabiduria.current / statsData.sabiduria.max;
    const c = statsData.creatividad.current / statsData.creatividad.max;
    const a = statsData.carisma.current / statsData.carisma.max;
    const f = statsData.fuerza.current / statsData.fuerza.max;
    
    const polygon = document.getElementById('radar-polygon');
    if(polygon) polygon.setAttribute('points', `${cx},${cy - (s * maxRadius)} ${cx + (c * maxRadius)},${cy} ${cx},${cy + (a * maxRadius)} ${cx - (f * maxRadius)},${cy}`);
}

window.addEventListener('DOMContentLoaded', () => {
    updateSoundButtonUI();
    const selectBGM = document.getElementById('bgm-select');
    if(selectBGM) selectBGM.value = currentBgmTrack;

    setupDropZone('avatar-drop-zone', 'input-file', handleFileSelect);
    setupDropZone('bg-drop-zone', 'input-bg-file', handleBgFileSelect);

    localStorage.removeItem('custom_background'); 
    const savedTheme = localStorage.getItem('selected_theme') || 'rpg-retro';
    setTheme(savedTheme);

    const savedName = localStorage.getItem('profile_name') || 'CREATOR';
    const savedBio = localStorage.getItem('profile_bio') || '"Construyendo el cambio, forjando ideas y entrenando el cuerpo."';
    const savedAvatar = localStorage.getItem('profile_avatar') || '';

    document.getElementById('input-name').value = savedName;
    document.getElementById('input-bio').value = savedBio;
    document.getElementById('display-name').textContent = savedName;
    document.getElementById('display-bio').textContent = savedBio;
    
    updateProfileLive(); 
    if (savedAvatar) {
        if (savedAvatar.startsWith('http')) document.getElementById('input-avatar').value = savedAvatar;
        currentAvatarData = savedAvatar;
        document.getElementById('avatar-preview').innerHTML = `<img src="${savedAvatar}" alt="Avatar">`;
    }

    renderMissions();
    renderStats();
});