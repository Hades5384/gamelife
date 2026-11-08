// js/ui/toasts.js - Sistema Maestro de Notificaciones Retro en Cascada
const ToastManager = {
    container: null,
    maxToasts: 4,

    getContainer() {
        if (!this.container || !document.body.contains(this.container)) {
            let el = document.getElementById('toast-container');
            if (!el) {
                el = document.createElement('div');
                el.id = 'toast-container';
                el.className = 'toast-stack-container';
                el.setAttribute('aria-live', 'polite');
                document.body.appendChild(el);
            }
            this.container = el;
        }
        return this.container;
    },

    show(title, msg, typeOrError = false, duration = 3800) {
        const isError = typeOrError === true || typeOrError === 'error';
        const isWarning = typeOrError === 'warning';

        if (isError) {
            if (window.AudioSys) AudioSys.playSFX('error');
            else if (typeof playErrorSound === 'function') playErrorSound();
        }

        const container = this.getContainer();

        // Evitar saturación de pantalla limitando a maxToasts activos
        const existingToasts = container.querySelectorAll('.toast-card:not(.hiding)');
        if (existingToasts.length >= this.maxToasts) {
            this.dismiss(existingToasts[0]);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-card';
        if (isError) {
            toast.classList.add('toast-error');
        } else if (isWarning) {
            toast.classList.add('toast-warning');
        } else {
            toast.classList.add('toast-success');
        }

        const header = document.createElement('div');
        header.className = 'toast-header';

        const titleEl = document.createElement('div');
        titleEl.className = 'toast-title';
        titleEl.innerHTML = title;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'toast-close-btn';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.textContent = '✕';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.dismiss(toast);
        };

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        const msgEl = document.createElement('div');
        msgEl.className = 'toast-message';
        msgEl.innerHTML = msg;

        toast.appendChild(header);
        toast.appendChild(msgEl);

        toast.onclick = () => this.dismiss(toast);

        container.appendChild(toast);

        // Activación con transición suave
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        const timer = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        toast._timer = timer;
        return toast;
    },

    dismiss(toast) {
        if (!toast || toast._isDismissing) return;
        toast._isDismissing = true;
        if (toast._timer) clearTimeout(toast._timer);

        toast.classList.remove('show');
        toast.classList.add('hiding');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 280);
    }
};

function showToast(title, msg, isError = false) {
    ToastManager.show(title, msg, isError);
}

function mostrarLevelUp(statKey, newLevel) {
    const statNames = { fuerza: "Fuerza", sabiduria: "Sabiduría", creatividad: "Creatividad", carisma: "Carisma" };
    const statName = statNames[statKey] || statKey;
    ToastManager.show(
        '▲ ¡STAT LEVEL UP!',
        `Tu atributo <b>${statName}</b> subió a <b>Nivel ${newLevel}</b>.`,
        'warning',
        4500
    );
}

window.ToastManager = ToastManager;
window.showToast = showToast;
window.mostrarLevelUp = mostrarLevelUp;
