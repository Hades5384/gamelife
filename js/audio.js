// js/audio.js
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
    
    const savedVol = StateManager.data.settings.volume;
    const volSlider = document.getElementById('volume-slider');
    if(volSlider) volSlider.value = savedVol;
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
    if (!masterGain) return;
    const vol = document.getElementById('volume-slider').value;
    masterGain.gain.value = vol;
    StateManager.data.settings.volume = vol;
    EventBus.emit('state:updated');
}

function toggleSound() {
    StateManager.data.settings.sound = !StateManager.data.settings.sound;
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

const bgmTracks = {
    '1': { notes: [261.63, 392.00, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66], bass: [130.81, 130.81, 174.61, 196.00], speed: 0.5, wave: 'sine', bassWave: 'triangle' },
    '2': { notes: [329.63, 293.66, 261.63, 246.94, 220.00, 246.94, 261.63, 293.66], bass: [110.00, 110.00, 110.00, 82.41, 82.41, 82.41, 98.00, 98.00], speed: 0.4, wave: 'triangle', bassWave: 'sine' },
    '3': { notes: [440, 440, 880, 440, 523.25, 587.33, 523.25, 493.88], bass: [110, 110, 55, 110, 130.81, 130.81, 65.41, 130.81], speed: 0.18, wave: 'sawtooth', bassWave: 'square' }
};

let noteIndex = 0; let bassIndex = 0; let nextNoteTime = 0;

function changeBGM() {
    StateManager.data.settings.bgmTrack = document.getElementById('bgm-select').value;
    EventBus.emit('state:updated');
    noteIndex = 0; bassIndex = 0; 
}

function scheduleBGM() {
    if (!StateManager.data || !StateManager.data.settings.sound || !audioCtx || audioCtx.state === 'suspended' || StateManager.data.settings.bgmTrack === '0') {
        bgmTimerID = requestAnimationFrame(scheduleBGM);
        return;
    }

    const track = bgmTracks[StateManager.data.settings.bgmTrack];
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

        const bassTrigger = StateManager.data.settings.bgmTrack === '2' ? (noteIndex % 3 === 0) : (noteIndex === 0 || noteIndex === Math.floor(track.notes.length / 2));

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
