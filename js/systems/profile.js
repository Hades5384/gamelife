// js/systems/profile.js
let currentAvatarData = '';
let currentBgData = '';

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    StateManager.data.settings.theme = themeName;
    EventBus.emit('state:updated');
    
    const savedBg = StateManager.data.settings.backgrounds[themeName];

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

function updateProfileLive() {
    const nameInput = document.getElementById('input-name');
    const bioInput = document.getElementById('input-bio');
    const avatarInput = document.getElementById('input-avatar');
    
    if (!nameInput || !bioInput || !avatarInput) return;
    
    const name = nameInput.value || 'CREATOR';
    const bio = bioInput.value || '"Construyendo el cambio, forjando ideas y entrenando el cuerpo."';
    const avatarUrl = avatarInput.value.trim().replace(/^["']+|["';]+$/g, '');

    const dispName = document.getElementById('display-name');
    const dispBio = document.getElementById('display-bio');
    if(dispName) dispName.textContent = name;
    if(dispBio) dispBio.textContent = bio;

    // Si el usuario escribe una URL en el campo, actualizar la fuente activa
    if (avatarUrl) {
        currentAvatarData = avatarUrl;
    } else if (currentAvatarData && !currentAvatarData.startsWith('data:')) {
        currentAvatarData = '';
    }

    const avatarBox = document.getElementById('avatar-preview');
    const modalPreview = document.getElementById('modal-avatar-preview');
    
    const defaultAvatarSVG = `<svg viewBox="0 0 16 16" width="100%" height="100%" style="fill:var(--primary-color); shape-rendering: crispEdges; background: var(--panel-bg); display:block;">
        <path d="M5 1h6v2h2v2h1v6h-1v2H9v-2H7v2H3v-2H2V5h1V3h2V1zm1 4v2H4v2h2V7h4v2h2V7h-2V5H6z"/>
    </svg>`;

    const targetSrc = (currentAvatarData || avatarUrl || '').trim().replace(/^["']+|["';]+$/g, '');

    function renderTo(container) {
        if (!container) return;

        if (targetSrc) {
            const existingImg = container.querySelector('img');
            if (existingImg && existingImg.src === targetSrc) {
                return;
            }

            container.innerHTML = defaultAvatarSVG;

            const img = new Image();
            img.className = 'hud-avatar-img';
            img.alt = 'Avatar';

            img.onload = function() {
                container.innerHTML = '';
                container.appendChild(img);
            };

            img.onerror = function() {
                container.innerHTML = defaultAvatarSVG;
            };

            img.src = targetSrc;

            if (img.complete && img.naturalWidth > 0) {
                container.innerHTML = '';
                container.appendChild(img);
            }
        } else {
            container.innerHTML = defaultAvatarSVG;
        }
    }

    renderTo(avatarBox);
    renderTo(modalPreview);

    StateManager.data.profile.name = name;
    StateManager.data.profile.bio = bio;
    StateManager.data.profile.avatar = targetSrc;
    EventBus.emit('state:updated');
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

    try {
        if (currentBgData) {
            document.body.style.backgroundImage = `url('${currentBgData}')`;
            StateManager.data.settings.backgrounds[currentTheme] = currentBgData;
        } else if (bgUrl) {
            document.body.style.backgroundImage = `url('${bgUrl}')`;
            StateManager.data.settings.backgrounds[currentTheme] = bgUrl;
        } else {
            document.body.style.backgroundImage = 'none';
            delete StateManager.data.settings.backgrounds[currentTheme];
        }
        EventBus.emit('state:updated');
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
    const bgInput = document.getElementById('input-bg-url');
    const fileLabel = document.getElementById('bg-file-label');
    if (bgInput) bgInput.value = '';
    if (fileLabel) fileLabel.innerHTML = `[^] Haz Clic, Arrastra o Pega el Fondo aquí`;
    
    const currentTheme = document.documentElement.getAttribute('data-theme');
    delete StateManager.data.settings.backgrounds[currentTheme];
    document.body.style.backgroundImage = 'none';
    EventBus.emit('state:updated');
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
    const profileModal = document.getElementById('profile-modal');
    const bgModal = document.getElementById('bg-modal');
    if (!profileModal || !bgModal) return;
    
    const profileActive = profileModal.classList.contains('active');
    const bgActive = bgModal.classList.contains('active');
    
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
