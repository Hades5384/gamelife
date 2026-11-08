// js/systems/profile.js
let currentAvatarData = '';
let currentBgData = '';

function updateThemeButtonsUI(activeTheme) {
    document.querySelectorAll('.btn-theme-choice').forEach(btn => {
        const t = btn.getAttribute('data-theme');
        const existingStar = btn.querySelector('.theme-star-badge');
        if (existingStar) existingStar.remove();

        if (t === activeTheme) {
            btn.classList.add('active-theme');
            const star = document.createElement('img');
            star.src = 'assets/star.png';
            star.className = 'theme-star-badge';
            star.alt = 'Seleccionado';
            btn.prepend(star);
        } else {
            btn.classList.remove('active-theme');
        }
    });
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    StateManager.data.settings.theme = themeName;
    try { localStorage.setItem('selected_theme', themeName); } catch(e) {}
    updateThemeButtonsUI(themeName);
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

function compressImageFile(file, maxDimension, quality, callback) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        showToast("> ERROR", "Formato de archivo no válido.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            try {
                let compressed = canvas.toDataURL('image/webp', quality);
                if (!compressed.startsWith('data:image/webp')) {
                    compressed = canvas.toDataURL('image/jpeg', quality);
                }
                callback(compressed);
            } catch (err) {
                console.warn("Fallo al exportar canvas comprimido, usando origen", err);
                callback(e.target.result);
            }
        };
        img.onerror = function() {
            showToast("> ERROR", "No se pudo decodificar la imagen.", true);
        };
        img.src = e.target.result;
    };
    reader.onerror = function() {
        showToast("> ERROR", "Error al leer el archivo.", true);
    };
    reader.readAsDataURL(file);
}

function handleFileSelect(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    document.getElementById('file-label').innerHTML = `✓ Procesando avatar...`;
    compressImageFile(file, 256, 0.85, (compressedData) => {
        currentAvatarData = compressedData;
        const avatarInput = document.getElementById('input-avatar');
        if (avatarInput) avatarInput.value = '';
        document.getElementById('file-label').innerHTML = `✓ Avatar optimizado`;
        updateProfileLive();
        showToast("> AVATAR GUARDADO", "Imagen ajustada y comprimida para tu perfil.");
    });
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
    document.getElementById('bg-file-label').innerHTML = `✓ Procesando fondo...`;
    compressImageFile(file, 1280, 0.75, (compressedData) => {
        currentBgData = compressedData;
        const bgInput = document.getElementById('input-bg-url');
        if (bgInput) bgInput.value = '';
        document.getElementById('bg-file-label').innerHTML = `✓ Fondo optimizado`;
        updateBackgroundLive();
        showToast("> FONDO GUARDADO", "Imagen de fondo optimizada y aplicada.");
    });
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
            if (profileActive) {
                document.getElementById('file-label').innerHTML = '✓ Procesando avatar pegado...';
                compressImageFile(blob, 256, 0.85, (compressed) => {
                    currentAvatarData = compressed;
                    document.getElementById('file-label').innerHTML = '✓ Avatar pegado y optimizado';
                    const avatarInput = document.getElementById('input-avatar');
                    if (avatarInput) avatarInput.value = '';
                    updateProfileLive();
                    showToast("> SISTEMA", "Avatar actualizado (Ctrl+V) 📋✨");
                });
            } else if (bgActive) {
                document.getElementById('bg-file-label').innerHTML = '✓ Procesando fondo pegado...';
                compressImageFile(blob, 1280, 0.75, (compressed) => {
                    currentBgData = compressed;
                    document.getElementById('bg-file-label').innerHTML = '✓ Fondo pegado y optimizado';
                    const bgInput = document.getElementById('input-bg-url');
                    if (bgInput) bgInput.value = '';
                    updateBackgroundLive();
                    showToast("> SISTEMA", "Fondo actualizado (Ctrl+V) 📋✨");
                });
            }
            break;
        }
    }
});
