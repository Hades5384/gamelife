const FX = {
    init() {
        // Escuchar eventos globales para disparar efectos automáticos
        EventBus.on('hero:hp_changed', (data) => {
            if (data.type === 'damage') {
                this.shake();
                this.flash('red');
            } else if (data.type === 'heal') {
                this.flash('green');
            }
        });
        
        // Agregar estilos CSS necesarios de forma dinámica
        this.injectCSS();
    },

    floatingText(x, y, text, color = 'var(--primary-color)') {
        const el = document.createElement('div');
        el.className = 'fx-floating-text';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = color;
        el.innerHTML = text;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    },

    spawnFromEvent(e, text, color) {
        if (!e) return;
        // Pequeño desplazamiento aleatorio para que los textos no se superpongan si saltan varios
        const randomX = (Math.random() - 0.5) * 40;
        const randomY = (Math.random() - 0.5) * 20;
        this.floatingText(e.clientX + randomX, e.clientY - 20 + randomY, text, color);
    },

    shake(intensity = 'normal') {
        // Remover si ya existe para reiniciar la animación
        document.body.classList.remove('fx-shake');
        void document.body.offsetWidth; // Reflow hack
        document.body.classList.add('fx-shake');
        
        setTimeout(() => {
            document.body.classList.remove('fx-shake');
        }, 400);

        if (window.AudioSys && AudioSys.playSFX) {
            AudioSys.playSFX('hit');
        }
    },

    flash(colorClass = 'red') {
        let overlay = document.getElementById('fx-flash-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fx-flash-overlay';
            overlay.className = 'fx-flash-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.classList.remove('red', 'green', 'gold');
        void overlay.offsetWidth; // Reflow hack
        
        overlay.classList.add(colorClass);
        setTimeout(() => {
            overlay.classList.remove(colorClass);
        }, 300);
    },

    injectCSS() {
        if (document.getElementById('fx-styles')) return;
        const style = document.createElement('style');
        style.id = 'fx-styles';
        style.innerHTML = `
            @keyframes floatUpAndFade {
                0% { transform: translateY(0) scale(0.8); opacity: 1; }
                50% { transform: translateY(-35px) scale(1.1); opacity: 1; }
                100% { transform: translateY(-55px) scale(1); opacity: 0; }
            }
            .fx-floating-text {
                position: fixed;
                pointer-events: none;
                font-family: 'Press Start 2P', monospace;
                font-size: 1.1rem;
                font-weight: normal;
                z-index: 9999;
                text-shadow: 2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000;
                animation: floatUpAndFade 1.2s ease-out forwards;
            }

            @keyframes fxShake {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-1deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(1deg); }
                50% { transform: translate(-1px, 2px) rotate(-1deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .fx-shake {
                animation: fxShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
            }

            .fx-flash-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 9998;
                opacity: 0;
                transition: opacity 0.3s ease-out;
            }
            .fx-flash-overlay.red { background-color: rgba(255, 0, 0, 0.25); opacity: 1; transition: opacity 0.05s ease-in; }
            .fx-flash-overlay.green { background-color: rgba(0, 255, 0, 0.15); opacity: 1; transition: opacity 0.05s ease-in; }
            .fx-flash-overlay.gold { background-color: rgba(255, 215, 0, 0.2); opacity: 1; transition: opacity 0.05s ease-in; }

            /* Jugo táctil en botones */
            .btn-pixel:active, .btn-menu:active, .btn-nav:active {
                transform: translateY(3px) !important;
            }
        `;
        document.head.appendChild(style);
    }
};

window.FX = FX;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => FX.init(), 100);
});
