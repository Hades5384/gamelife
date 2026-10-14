// js/audio.js
let audioCtx, masterGain, bgmGain, sfxGain;
let bgmFilter, bgmDelay, bgmFeedbackGain;
let audioInitialized = false;
let bgmTimerID = null;
let currentStep = 0;
let nextStepTime = 0;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    masterGain = audioCtx.createGain();
    bgmGain = audioCtx.createGain();
    sfxGain = audioCtx.createGain();
    
    // Filtro analógico pasa-bajos cálido para BGM (elimina estridencias y aporta calidez retro)
    bgmFilter = audioCtx.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.value = 1400;
    bgmFilter.Q.value = 0.8;

    // Eco espacial envolvente (Spatial Ambience Delay)
    bgmDelay = audioCtx.createDelay();
    bgmDelay.delayTime.value = 0.28;
    bgmFeedbackGain = audioCtx.createGain();
    bgmFeedbackGain.gain.value = 0.22;

    // Cadena de audio para BGM:
    bgmGain.connect(bgmFilter);
    bgmFilter.connect(masterGain);

    // Bucle de eco ambiental cálido:
    bgmFilter.connect(bgmDelay);
    bgmDelay.connect(bgmFeedbackGain);
    bgmFeedbackGain.connect(bgmFilter);

    // SFX van directos a masterGain para máxima nitidez e impacto instantáneo
    sfxGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    
    const savedVol = StateManager.data && StateManager.data.settings.volume !== undefined ? StateManager.data.settings.volume : 0.3;
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) volSlider.value = savedVol;
    const volLabel = document.getElementById('volume-label');
    if (volLabel) volLabel.textContent = `${Math.round(savedVol * 100)}%`;
    masterGain.gain.value = savedVol;
    audioInitialized = true;
}

const unlockAudio = () => {
    if (StateManager.data.settings.sound && !audioInitialized) {
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
    const volSlider = document.getElementById('volume-slider');
    if (!volSlider) return;
    const vol = parseFloat(volSlider.value);
    
    if (StateManager.data) {
        StateManager.data.settings.volume = vol;
        try { localStorage.setItem('rpg_volume', vol); } catch(e) {}
    }
    
    if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
    } else if (masterGain) {
        masterGain.gain.value = vol;
    }
    
    const volLabel = document.getElementById('volume-label');
    if (volLabel) {
        volLabel.textContent = `${Math.round(vol * 100)}%`;
    }
    
    EventBus.emit('state:updated');
}

function toggleSound() {
    StateManager.data.settings.sound = !StateManager.data.settings.sound;
    try { localStorage.setItem('rpg_sound', StateManager.data.settings.sound); } catch(e) {}
    EventBus.emit('state:updated');
    updateSoundButtonUI();
    
    if (StateManager.data.settings.sound) {
        if (!audioInitialized) initAudio();
        audioCtx.resume();
        if (!bgmTimerID) scheduleBGM();
        playSuccessSound(); 
    }
}

function updateSoundButtonUI() {
    const btn = document.getElementById('btn-sound');
    if (!btn) return;
    const isSoundEnabled = StateManager.data.settings.sound;
    const iconOn = `<svg viewBox="0 0 16 16" width="14" height="14" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="6" width="3" height="4"/><rect x="4" y="5" width="1" height="6"/><rect x="5" y="4" width="1" height="8"/><rect x="6" y="3" width="2" height="10"/><rect x="10" y="5" width="1" height="6"/><rect x="12" y="3" width="1" height="10"/></svg>`;
    const iconOff = `<svg viewBox="0 0 16 16" width="14" height="14" shape-rendering="crispEdges" fill="currentColor"><rect x="1" y="6" width="3" height="4"/><rect x="4" y="5" width="1" height="6"/><rect x="5" y="4" width="1" height="8"/><rect x="6" y="3" width="2" height="10"/><rect x="10" y="6" width="1" height="1"/><rect x="11" y="7" width="1" height="1"/><rect x="12" y="8" width="1" height="1"/><rect x="13" y="9" width="1" height="1"/><rect x="13" y="6" width="1" height="1"/><rect x="12" y="7" width="1" height="1"/><rect x="10" y="9" width="1" height="1"/><rect x="11" y="8" width="1" height="1"/></svg>`;
    btn.innerHTML = isSoundEnabled ? iconOn : iconOff;
    btn.style.color = isSoundEnabled ? 'var(--primary-color)' : '#EF4444';
    btn.style.borderColor = isSoundEnabled ? 'var(--primary-color)' : '#EF4444';
}

function playTone(frequency, type = 'square', duration = 0.1, vol = 0.15, slideFreq = null) {
    if (!StateManager.data.settings.sound || !audioCtx) return;
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

let lastHoverSoundTime = 0;

function playHoverSound() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx) return;
    const now = Date.now();
    if (now - lastHoverSoundTime < 65) return; // Debounce rápido
    lastHoverSoundTime = now;
    playTone(1100, 'triangle', 0.02, 0.025);
}

function playClickSound() { 
    playTone(850, 'square', 0.04, 0.07); 
} 

function playModalOpenSound() { 
    playTone(280, 'sine', 0.12, 0.1, 550); 
} 

function playModalCloseSound() { 
    playTone(550, 'sine', 0.12, 0.1, 280); 
} 

function playSuccessSound() { 
    if (!StateManager.data || !StateManager.data.settings.sound) return;
    playTone(987.77, 'square', 0.09, 0.12); 
    setTimeout(() => playTone(1318.51, 'square', 0.22, 0.14), 85); 
}

function playCoinSound() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        // Tono 1: B5 (987.77 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(987.77, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc1.connect(gain1);
        gain1.connect(sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.07);

        // Tono 2: E6 (1318.51 Hz) - el "ping" brillante característico
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1318.51, now + 0.07);
        gain2.gain.setValueAtTime(0.15, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(sfxGain);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.32);
    } catch (e) {}
}

function playCritSound() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx) return;
    try {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Ráfaga ascendente
        notes.forEach((freq, idx) => {
            setTimeout(() => playTone(freq, 'sawtooth', 0.09, 0.16), idx * 45);
        });
        setTimeout(() => playTone(1567.98, 'square', 0.35, 0.2), notes.length * 45); // Clímax brillante
    } catch (e) {}
}

function playHitSound() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        // Impacto crujiente retro
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.22);

        // Sub-golpe sordo
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(120, now);
        subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
        subGain.gain.setValueAtTime(0.28, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        subOsc.connect(subGain);
        subGain.connect(sfxGain);
        subOsc.start(now);
        subOsc.stop(now + 0.25);
    } catch (e) {}
}

function playStreakSound() {
    if (!StateManager.data || !StateManager.data.settings.sound) return;
    const freqs = [440, 554.37, 659.25, 880];
    freqs.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'triangle', 0.12, 0.12), i * 65);
    });
}

function playLevelUpSound() {
    if (!StateManager.data || !StateManager.data.settings.sound) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; 
    notes.forEach((freq, index) => { 
        setTimeout(() => playTone(freq, 'square', 0.12, 0.18), index * 80); 
    });
    setTimeout(() => {
        playTone(1046.50, 'square', 0.55, 0.22);
        playTone(1567.98, 'triangle', 0.55, 0.18);
    }, notes.length * 80);
}

function playErrorSound() {
    if (!StateManager.data || !StateManager.data.settings.sound) return;
    playTone(160, 'sawtooth', 0.18, 0.18);
    setTimeout(() => playTone(140, 'sawtooth', 0.25, 0.18), 160);
}

function playTrashSound() {
    if (!StateManager.data || !StateManager.data.settings.sound) return;
    playTone(320, 'sawtooth', 0.08, 0.14);
    setTimeout(() => playTone(210, 'sawtooth', 0.12, 0.14), 85);
}

// Interfaz unificada de efectos de sonido
window.AudioSys = {
    playSFX(name) {
        switch (name) {
            case 'hit':
            case 'damage':
                playHitSound();
                break;
            case 'coin':
            case 'gold':
                playCoinSound();
                break;
            case 'crit':
                playCritSound();
                break;
            case 'levelup':
                playLevelUpSound();
                break;
            case 'streak':
                playStreakSound();
                break;
            case 'click':
                playClickSound();
                break;
            case 'hover':
                playHoverSound();
                break;
            case 'success':
                playSuccessSound();
                break;
            case 'error':
                playErrorSound();
                break;
            case 'trash':
                playTrashSound();
                break;
            default:
                playClickSound();
        }
    }
};

// Eventos táctiles y auditivos en la UI
document.addEventListener('mousedown', (e) => {
    if (StateManager.data && !StateManager.data.settings.sound) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'SELECT' || e.target.classList.contains('drop-zone') || e.target.classList.contains('cmd-btn')) {
        playClickSound();
    }
});

document.addEventListener('mouseover', (e) => {
    if (StateManager.data && !StateManager.data.settings.sound) return;
    const target = e.target.closest('.cmd-btn, .btn-pixel, .btn-menu, .btn-nav, .tab-btn, .btn-pixel-icon');
    if (target) {
        playHoverSound();
    }
});

// ==========================================
// MOTOR DE MÚSICA BGM MULTI-TIMBRAL & RÍTMICO
// ==========================================
const NOTES = {
    'C1': 32.70, 'D1': 36.71, 'E1': 41.20, 'F1': 43.65, 'G1': 49.00, 'A1': 55.00, 'B1': 61.74,
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98
};

// Generador de ruido estático para escobillas y texturas lo-fi
let noiseBuffer = null;
function getNoiseBuffer() {
    if (!audioCtx) return null;
    if (noiseBuffer) return noiseBuffer;
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.5);
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}

// 1. Piano Eléctrico Lo-Fi (Rhodes cálido con coro y doble oscilador)
function playEPiano(note, time, duration, vol = 0.055) {
    if (!audioCtx || !note) return;
    const freq = typeof note === 'string' ? NOTES[note] : note;
    if (!freq) return;

    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.setValueAtTime(freq, time);
    o2.frequency.setValueAtTime(freq + 1.2, time);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    o1.connect(gain);
    o2.connect(gain);
    gain.connect(bgmGain);

    o1.start(time);
    o2.start(time);
    o1.stop(time + duration);
    o2.stop(time + duration);
}

// 2. Campanas Celesta / Caja de Música (Con armónico metálico de cristal)
function playBell(note, time, duration, vol = 0.045) {
    if (!audioCtx || !note) return;
    const freq = typeof note === 'string' ? NOTES[note] : note;
    if (!freq) return;

    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.setValueAtTime(freq, time);
    o2.frequency.setValueAtTime(freq * 2.756, time);

    const g1 = audioCtx.createGain();
    const g2 = audioCtx.createGain();
    g1.gain.setValueAtTime(vol, time);
    g1.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    g2.gain.setValueAtTime(vol * 0.28, time);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.45);

    o1.connect(g1);
    o2.connect(g2);
    g1.connect(bgmGain);
    g2.connect(bgmGain);

    o1.start(time);
    o2.start(time);
    o1.stop(time + duration);
    o2.stop(time + duration);
}

// 3. Pad Ambiental Respirable (Cuerdas/Sintetizador etéreo de ataque lento)
function playPad(notes, time, duration, vol = 0.038) {
    if (!audioCtx || !notes || !notes.length) return;
    const indivVol = vol / notes.length;
    notes.forEach(n => {
        const freq = typeof n === 'string' ? NOTES[n] : n;
        if (!freq) return;
        const o = audioCtx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, time);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(indivVol, time + 0.6);
        gain.gain.setValueAtTime(indivVol, time + Math.max(0.6, duration - 0.7));
        gain.gain.linearRampToValueAtTime(0.0001, time + duration);

        o.connect(gain);
        gain.connect(bgmGain);
        o.start(time);
        o.stop(time + duration);
    });
}

// 4. Pluck de Laúd Folk / Cuerda Acústica (Ataque percusivo con filtro cerrado rápido)
function playPluck(note, time, duration, vol = 0.055) {
    if (!audioCtx || !note) return;
    const freq = typeof note === 'string' ? NOTES[note] : note;
    if (!freq) return;

    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, time);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(250, time + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    o.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);

    o.start(time);
    o.stop(time + duration);
}

// 5. Flauta / Melodía Lírica Cálida
function playFlute(note, time, duration, vol = 0.05) {
    if (!audioCtx || !note) return;
    const freq = typeof note === 'string' ? NOTES[note] : note;
    if (!freq) return;

    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, time);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    o.connect(gain);
    gain.connect(bgmGain);
    o.start(time);
    o.stop(time + duration);
}

// 6. Bajo Acústico Profundo
function playBass(note, time, duration, vol = 0.08) {
    if (!audioCtx || !note) return;
    const freq = typeof note === 'string' ? NOTES[note] : note;
    if (!freq) return;

    const o = audioCtx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, time);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    o.connect(gain);
    gain.connect(bgmGain);
    o.start(time);
    o.stop(time + duration);
}

// 7. Batería Lo-Fi Suave
function playKick(time, vol = 0.065) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.setValueAtTime(75, time);
    o.frequency.exponentialRampToValueAtTime(25, time + 0.09);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    o.connect(g);
    g.connect(bgmGain);
    o.start(time);
    o.stop(time + 0.09);
}

function playBrush(time, vol = 0.02) {
    const buf = getNoiseBuffer();
    if (!audioCtx || !buf) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(filter);
    filter.connect(g);
    g.connect(bgmGain);
    src.start(time);
    src.stop(time + 0.05);
}

// ==========================================
// CATÁLOGO DE 6 SOUNDTRACKS CON METRICAS DIVERSAS
// ==========================================
const bgmTracks = {
    // ----------------------------------------------------
    // 1. SANTUARIO DEL HÉROE - 4/4 Lo-Fi Piano & Ambient Swell (Calma meditativa)
    // ----------------------------------------------------
    '1': {
        name: 'Santuario del Héroe',
        beatsPerBar: 4,
        beatDur: 0.58, // Lento y espaciado (52 BPM)
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { chord: ['C4', 'E4', 'B4'], bass: 'C2', mel: ['E5', 'G5', 'B5', 'G5'] },
                { chord: ['A3', 'C4', 'G4'], bass: 'A1', mel: ['A5', 'E5', 'C5', 'D5'] },
                { chord: ['F3', 'A3', 'E4'], bass: 'F1', mel: ['E5', 'D5', 'C5', 'A4'] },
                { chord: ['G3', 'B3', 'D4'], bass: 'G1', mel: ['D5', 'C5', 'B4', 'D5'] },
                { chord: ['C4', 'E4', 'G4', 'B4'], bass: 'C2', mel: ['G5', 'B5', 'D6', 'C6'] },
                { chord: ['A3', 'E4', 'G4'], bass: 'A1', mel: ['B5', 'A5', 'G5', 'E5'] },
                { chord: ['F3', 'C4', 'E4'], bass: 'F1', mel: ['A5', 'G5', 'F5', 'E5'] },
                { chord: ['G3', 'D4', 'B4'], bass: 'G1', mel: ['D5', 'B4', 'G4', 'E4'] }
            ];
            const p = chords[bar % chords.length];

            // Pad cálido que respira durante todo el compás
            playPad(p.chord, t, b * 4.2, 0.035);
            // Bajo profundo
            playBass(p.bass, t, b * 3.5, 0.08);

            // Acorde de piano Rhodes en tiempos 0 y 2
            playEPiano(p.chord[0], t, b * 1.8, 0.04);
            playEPiano(p.chord[1], t, b * 1.8, 0.04);
            playEPiano(p.chord[2], t, b * 1.8, 0.04);
            playEPiano(p.chord[0], t + b * 2, b * 1.8, 0.035);

            // Melodía lírica espaciada
            playFlute(p.mel[0], t, b * 1.5, 0.05);
            playFlute(p.mel[1], t + b * 1.5, b * 0.9, 0.045);
            playFlute(p.mel[2], t + b * 2.5, b * 1.2, 0.05);
            playFlute(p.mel[3], t + b * 3.5, b * 0.8, 0.04);

            // Escobilla rítmica suave en tiempos 1 y 3
            playBrush(t + b, 0.015);
            playBrush(t + b * 3, 0.015);
        }
    },

    // ----------------------------------------------------
    // 2. BRISA DEL BOSQUE - 6/8 Folk Pastoral (Paseo alegre y saltarín, estilo Zelda/Stardew)
    // ----------------------------------------------------
    '2': {
        name: 'Brisa del Bosque',
        beatsPerBar: 6,
        beatDur: 0.31, // Métrica compuesta 6/8
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { root: 'D4', lute: ['D4', 'F#4', 'A4'], bass: 'D2', flute: ['F#5', 'A5', 'D6'] },
                { root: 'B3', lute: ['B3', 'D4', 'F#4'], bass: 'B1', flute: ['D5', 'F#5', 'B5'] },
                { root: 'G3', lute: ['G3', 'B3', 'D4'], bass: 'G1', flute: ['B4', 'D5', 'G5'] },
                { root: 'A3', lute: ['A3', 'C#4', 'E4'], bass: 'A1', flute: ['C#5', 'E5', 'A5'] },
                { root: 'D4', lute: ['F#4', 'A4', 'D5'], bass: 'D2', flute: ['A5', 'F#5', 'D5'] },
                { root: 'G3', lute: ['B3', 'D4', 'G4'], bass: 'G1', flute: ['G5', 'F#5', 'E5'] },
                { root: 'E3', lute: ['G3', 'B3', 'E4'], bass: 'E1', flute: ['F#5', 'E5', 'D5'] },
                { root: 'A3', lute: ['A3', 'C#4', 'G4'], bass: 'A1', flute: ['E5', 'C#5', 'D5'] }
            ];
            const p = chords[bar % chords.length];

            // Bajo rítmico en tiempos 0 y 3 (el pulso característico del 6/8)
            playBass(p.bass, t, b * 2.8, 0.09);
            playBass(NOTES[p.bass] * 2, t + b * 3, b * 2.5, 0.06);

            // Arpegio saltarín de Laúd acústico en los 6 tiempos (1-2-3, 4-5-6)
            playPluck(p.lute[0], t, b * 0.9, 0.05);
            playPluck(p.lute[1], t + b, b * 0.9, 0.04);
            playPluck(p.lute[2], t + b * 2, b * 0.9, 0.04);
            playPluck(p.lute[1], t + b * 3, b * 0.9, 0.045);
            playPluck(p.lute[2], t + b * 4, b * 0.9, 0.04);
            playPluck(p.lute[0], t + b * 5, b * 0.9, 0.04);

            // Melodía pastoral con flauta
            playFlute(p.flute[0], t, b * 2.5, 0.05);
            playFlute(p.flute[1], t + b * 3, b * 1.5, 0.045);
            playFlute(p.flute[2], t + b * 4.5, b * 1.5, 0.05);
        }
    },

    // ----------------------------------------------------
    // 3. NOCHE ESTRELLADA - Ambient Drone Cósmico & Campanas (Sin compás rígido ni tambores)
    // ----------------------------------------------------
    '3': {
        name: 'Noche Estrellada',
        beatsPerBar: 4,
        beatDur: 1.25, // Un compás dura 5 SEGUNDOS. Cero prisas, flotación pura
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { pad: ['E3', 'B3', 'F#4'], bass: 'E1', bells: ['B5', 'F#5', 'D6'] },
                { pad: ['C3', 'G3', 'D4', 'E4'], bass: 'C1', bells: ['G5', 'E6', 'D5'] },
                { pad: ['G3', 'D4', 'F#4'], bass: 'G1', bells: ['D5', 'B5', 'F#5'] },
                { pad: ['D3', 'A3', 'F#4'], bass: 'D1', bells: ['A4', 'F#5', 'D5'] },
                { pad: ['A2', 'E3', 'B3', 'C4'], bass: 'A1', bells: ['C5', 'E5', 'B5'] },
                { pad: ['C3', 'E4', 'G4', 'B4'], bass: 'C1', bells: ['E5', 'G5', 'D6'] },
                { pad: ['E3', 'G3', 'D4'], bass: 'E1', bells: ['F#5', 'D5', 'B4'] },
                { pad: ['B2', 'F#3', 'D4'], bass: 'B1', bells: ['D5', 'F#5', 'A5'] }
            ];
            const p = chords[bar % chords.length];

            // Inmenso drone de bajo y pad que se expanden durante 5 segundos
            playPad(p.pad, t, b * 4.4, 0.042);
            playBass(p.bass, t, b * 4.2, 0.1);

            // Campanas de cristal celesta cayendo como estrellas en tiempos asimétricos
            playBell(p.bells[0], t + b * 0.6, b * 2.5, 0.04);
            playBell(p.bells[1], t + b * 2.1, b * 2.0, 0.035);
            playBell(p.bells[2], t + b * 3.3, b * 2.2, 0.038);
        }
    },

    // ----------------------------------------------------
    // 4. TABERNA MEDIEVAL - 3/4 Vals de la Hoguera (BUM - pa - pa campesino acogedor)
    // ----------------------------------------------------
    '4': {
        name: 'Taberna Acogedora',
        beatsPerBar: 3,
        beatDur: 0.44, // Vals tradicional (68 BPM)
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { bass: 'G2', lute: ['B3', 'D4', 'G4'], mel: 'B4' },
                { bass: 'E2', lute: ['G3', 'B3', 'E4'], mel: 'G4' },
                { bass: 'C2', lute: ['G3', 'C4', 'E4'], mel: 'E4' },
                { bass: 'D2', lute: ['F#3', 'A3', 'D4'], mel: 'F#4' },
                { bass: 'B1', lute: ['F#3', 'B3', 'D4'], mel: 'D5' },
                { bass: 'E2', lute: ['G3', 'B3', 'E4'], mel: 'B4' },
                { bass: 'A1', lute: ['E3', 'A3', 'C4'], mel: 'C5' },
                { bass: 'D2', lute: ['F#3', 'C4', 'D4'], mel: 'A4' }
            ];
            const p = chords[bar % chords.length];

            // TIEMPO 1: BUM (Golpe de bajo firme y resonante)
            playBass(p.bass, t, b * 2.4, 0.095);
            playPluck(p.mel, t, b * 1.8, 0.06);

            // TIEMPO 2: pa (Acorde rasgado de laúd)
            playPluck(p.lute[0], t + b, b * 0.8, 0.045);
            playPluck(p.lute[1], t + b, b * 0.8, 0.04);
            playPluck(p.lute[2], t + b, b * 0.8, 0.04);

            // TIEMPO 3: pa (Segundo acorde de laúd con adorno melódico)
            playPluck(p.lute[0], t + b * 2, b * 0.8, 0.04);
            playPluck(p.lute[1], t + b * 2, b * 0.8, 0.04);
            playPluck(p.lute[2], t + b * 2, b * 0.8, 0.04);
            playFlute(NOTES[p.mel] * 1.5, t + b * 2, b * 0.9, 0.035);
        }
    },

    // ----------------------------------------------------
    // 5. AMANECER LO-FI - 4/4 Chillhop & Rhodes (Groove relajado con kick y escobilla)
    // ----------------------------------------------------
    '5': {
        name: 'Amanecer Lo-Fi',
        beatsPerBar: 4,
        beatDur: 0.46, // 72 BPM clásico de Lo-Fi Hip Hop
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { chord: ['F3', 'A3', 'C4', 'E4'], bass: 'F2', mel: ['C5', 'E5', 'G5'] },
                { chord: ['E3', 'G3', 'B3', 'D4'], bass: 'E2', mel: ['B4', 'D5', 'G5'] },
                { chord: ['D3', 'F3', 'A3', 'C4'], bass: 'D2', mel: ['A4', 'C5', 'F5'] },
                { chord: ['C3', 'E3', 'G3', 'B3'], bass: 'C2', mel: ['G4', 'B4', 'E5'] },
                { chord: ['A#2', 'D3', 'F3', 'A3'], bass: 'A#1', mel: ['D5', 'F5', 'A5'] },
                { chord: ['A2', 'C#3', 'E3', 'G3'], bass: 'A1', mel: ['C#5', 'E5', 'G5'] },
                { chord: ['D3', 'F3', 'A3', 'E4'], bass: 'D2', mel: ['F5', 'E5', 'D5'] },
                { chord: ['G2', 'B2', 'F3', 'A3'], bass: 'G1', mel: ['B4', 'D5', 'G4'] }
            ];
            const p = chords[bar % chords.length];

            // Batería Lo-Fi sincopada:
            // Tiempo 0: Kick + Bajo + Acorde Rhodes
            playKick(t, 0.065);
            playBass(p.bass, t, b * 1.9, 0.085);
            playEPiano(p.chord[0], t, b * 2.2, 0.045);
            playEPiano(p.chord[1], t, b * 2.2, 0.045);
            playEPiano(p.chord[2], t, b * 2.2, 0.04);
            playEPiano(p.chord[3], t, b * 2.2, 0.04);

            // Tiempo 1: Brush Snare
            playBrush(t + b, 0.022);

            // Tiempo 2: Kick sincopado + Acorde Rhodes secundario
            playKick(t + b * 2, 0.05);
            playEPiano(p.chord[1], t + b * 2, b * 1.8, 0.035);
            playEPiano(p.chord[2], t + b * 2, b * 1.8, 0.035);

            // Tiempo 2.75: Ghost Kick antes del snare
            playKick(t + b * 2.75, 0.035);

            // Tiempo 3: Brush Snare
            playBrush(t + b * 3, 0.022);

            // Melodía de piano Rhodes flotante
            playEPiano(p.mel[0], t + b * 0.5, b * 1.2, 0.045);
            playEPiano(p.mel[1], t + b * 1.75, b * 1.0, 0.045);
            playEPiano(p.mel[2], t + b * 3.0, b * 1.2, 0.04);
        }
    },

    // ----------------------------------------------------
    // 6. CUEVA DE CRISTAL - 5/4 Misterio & Caja de Música (Métrica asimétrica 3+2)
    // ----------------------------------------------------
    '6': {
        name: 'Cueva de Cristal',
        beatsPerBar: 5,
        beatDur: 0.44, // 5 tiempos por compás (ting-ting-ting, tong-tong)
        barsCount: 8,
        renderBar(bar, t, b) {
            const chords = [
                { bells: ['A4', 'C5', 'E5', 'B5', 'A5'], bass1: 'A1', bass2: 'E2' },
                { bells: ['F4', 'A4', 'C5', 'G5', 'F5'], bass1: 'F1', bass2: 'C2' },
                { bells: ['D4', 'F4', 'A4', 'E5', 'D5'], bass1: 'D1', bass2: 'A1' },
                { bells: ['E4', 'G#4', 'B4', 'D5', 'E5'], bass1: 'E1', bass2: 'B1' },
                { bells: ['C5', 'E5', 'G5', 'D6', 'C6'], bass1: 'C2', bass2: 'G1' },
                { bells: ['D5', 'F#5', 'A5', 'C6', 'B5'], bass1: 'D2', bass2: 'A1' },
                { bells: ['F4', 'B4', 'E5', 'A5', 'G5'], bass1: 'F1', bass2: 'C2' },
                { bells: ['E4', 'G#4', 'D5', 'C5', 'B4'], bass1: 'E1', bass2: 'E2' }
            ];
            const p = chords[bar % chords.length];

            // Tiempos 0, 1, 2 (Bloque de 3 campanas de cristal)
            playBell(p.bells[0], t, b * 2.5, 0.045);
            playBell(p.bells[1], t + b, b * 2.2, 0.04);
            playBell(p.bells[2], t + b * 2, b * 2.5, 0.045);
            playBass(p.bass1, t, b * 2.8, 0.08);

            // Tiempos 3, 4 (Bloque de 2 notas graves de resolución subterránea)
            playBell(p.bells[3], t + b * 3, b * 1.8, 0.038);
            playBell(p.bells[4], t + b * 4, b * 1.8, 0.038);
            playBass(p.bass2, t + b * 3, b * 2.0, 0.07);
        }
    }
};

let currentBar = 0;
let nextBarTime = 0;

function changeBGM() {
    const sel = document.getElementById('bgm-select');
    if (!sel || !StateManager.data) return;
    StateManager.data.settings.bgmTrack = sel.value;
    try { localStorage.setItem('rpg_bgm_track', sel.value); } catch(e) {}
    EventBus.emit('state:updated');
    currentBar = 0;
    if (audioCtx) {
        nextBarTime = audioCtx.currentTime + 0.05;
    }
}

function scheduleBGM() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx || audioCtx.state === 'suspended' || StateManager.data.settings.bgmTrack === '0') {
        bgmTimerID = requestAnimationFrame(scheduleBGM);
        return;
    }

    const currentTrackId = StateManager.data.settings.bgmTrack || '1';
    const track = bgmTracks[currentTrackId] || bgmTracks['1'];
    const barDuration = track.beatDur * track.beatsPerBar;

    if (nextBarTime < audioCtx.currentTime) {
        nextBarTime = audioCtx.currentTime + 0.05;
    }

    // Programar compás con un búfer hacia adelante de 0.4s
    while (nextBarTime < audioCtx.currentTime + 0.4) {
        track.renderBar(currentBar, nextBarTime, track.beatDur);
        currentBar = (currentBar + 1) % track.barsCount;
        nextBarTime += barDuration;
    }

    bgmTimerID = requestAnimationFrame(scheduleBGM);
}
