// js/ui/toasts.js
function showToast(title, msg, isError = false) {
    if (isError) playErrorSound();

    // En v3 usamos una cola o múltiples toasts, pero por compatibilidad con v2 usaremos la base.
    const toast = document.getElementById('generic-toast');
    if(!toast) return;
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

function mostrarLevelUp(statKey, newLevel) {
    const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
    const toast = document.getElementById('level-up-toast');
    if(!toast) return;
    document.getElementById('level-up-message').textContent = `Tu ${statNames[statKey]} subió a Nivel ${newLevel}!`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}
