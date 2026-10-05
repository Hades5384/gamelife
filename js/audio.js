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

function playClickSound() { playTone(800, 'square', 0.04, 0.05); } 
function playModalOpenSound() { playTone(300, 'sine', 0.15, 0.1, 600); } 
function playModalCloseSound() { playTone(600, 'sine', 0.15, 0.1, 300); } 
function playSuccessSound() { 
    if (!StateManager.data.settings.sound) return;
    playTone(987.77, 'square', 0.1); 
    setTimeout(() => playTone(1318.51, 'square', 0.3), 100); 
}
function playLevelUpSound() {
    if (!StateManager.data.settings.sound) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, index) => { setTimeout(() => playTone(freq, 'square', 0.15, 0.2), index * 120); });
    setTimeout(() => playTone(1046.50, 'square', 0.6, 0.2), notes.length * 120);
}
function playErrorSound() {
    if (!StateManager.data.settings.sound) return;
    playTone(150, 'sawtooth', 0.2, 0.2);
    setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.2), 200);
}
function playTrashSound() {
    if (!StateManager.data.settings.sound) return;
    playTone(300, 'sawtooth', 0.1, 0.15);
    setTimeout(() => playTone(200, 'sawtooth', 0.15, 0.15), 100);
}

document.addEventListener('mousedown', (e) => {
    if (StateManager.data && !StateManager.data.settings.sound) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'SELECT' || e.target.classList.contains('drop-zone')) {
        playClickSound();
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
