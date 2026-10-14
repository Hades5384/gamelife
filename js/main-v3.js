window.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar StateManager
    StateManager.init();
    
    // Iniciar Sistemas v3
    Hero.init();
    Streak.init();
    History.init();
    Achievements.init();
    HUD.init();
    DayEngine.init();
    if (window.Economy) Economy.init();
    if (window.FX) FX.init();
    
    // 2. Restaurar UI Audio y Temas
    updateSoundButtonUI();
    const selectBGM = document.getElementById('bgm-select');
    if(selectBGM) selectBGM.value = StateManager.data.settings.bgmTrack;
    const volSlider = document.getElementById('volume-slider');
    const savedVol = (StateManager.data && StateManager.data.settings.volume !== undefined) ? StateManager.data.settings.volume : 0.3;
    if (volSlider) volSlider.value = savedVol;
    const volLabel = document.getElementById('volume-label');
    if (volLabel) volLabel.textContent = `${Math.round(savedVol * 100)}%`;

    setupDropZone('avatar-drop-zone', 'input-file', handleFileSelect);
    setupDropZone('bg-drop-zone', 'input-bg-file', handleBgFileSelect);

    setTheme(StateManager.data.settings.theme);

    // 3. Restaurar Perfil
    const nameInput = document.getElementById('input-name');
    const bioInput = document.getElementById('input-bio');
    const avatarInput = document.getElementById('input-avatar');

    if(nameInput) nameInput.value = StateManager.data.profile.name;
    if(bioInput) bioInput.value = StateManager.data.profile.bio;
    
    if (StateManager.data.profile.avatar) {
        const cleanAvatar = StateManager.data.profile.avatar.trim().replace(/^["']+|["';]+$/g, '');
        currentAvatarData = cleanAvatar;
        StateManager.data.profile.avatar = cleanAvatar;
        if (!cleanAvatar.startsWith('data:')) {
            if(avatarInput) avatarInput.value = cleanAvatar;
        }
    }
    
    updateProfileLive();

    // 4. Renderizar stats y misiones
    renderMissions();
    renderStats();

    // 5. Toggle widget de música en móviles
    const musicBadge = document.getElementById('music-badge');
    const musicWidget = document.getElementById('music-widget');
    if (musicBadge && musicWidget) {
        musicBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            musicWidget.classList.toggle('is-open');
        });

        document.addEventListener('click', (e) => {
            if (!musicWidget.contains(e.target)) {
                musicWidget.classList.remove('is-open');
            }
        });
    }
});
