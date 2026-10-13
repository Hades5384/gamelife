// js/ui/fx.js - Sistema Maestro de Game Feel, Partículas Pixel Art y Efectos de Impacto
const FX = {
    init() {
        // 1. Escuchar eventos globales de combate y progresión
        EventBus.on('hero:hp_changed', (data) => {
            if (data.type === 'damage') {
                this.shake('medium');
                this.flash('red');
                if (window.AudioSys) AudioSys.playSFX('hit');
            } else if (data.type === 'heal') {
                this.flash('green');
                const hpTrack = document.querySelector('.hud-hp-track');
                if (hpTrack) this.burstAtElement(hpTrack, ['#10b981', '#34d399', '#ffffff'], 8);
            }
        });

        EventBus.on('hero:levelup', (level) => {
            this.flash('gold');
            this.shake('light');
            const heroSection = document.querySelector('.hud-hero-section');
            if (heroSection) {
                this.burstAtElement(heroSection, ['#ffd700', '#00f5ff', '#ff3366', '#ffffff', '#10b981'], 32);
            }
        });

        EventBus.on('hero:death', () => {
            this.shake('heavy');
            this.flash('red');
            if (window.AudioSys) AudioSys.playSFX('hit');
        });

        EventBus.on('streak:increased', () => {
            this.flash('green');
            const streakBadge = document.querySelector('.hud-streak-box');
            if (streakBadge) {
                this.burstAtElement(streakBadge, ['#ff9900', '#ffd700', '#ffffff'], 16);
            }
            if (window.AudioSys) AudioSys.playSFX('streak');
        });

        EventBus.on('streak:broken', () => {
            this.shake('medium');
            this.flash('red');
            if (window.AudioSys) AudioSys.playSFX('hit');
        });
        
        // 2. Inyectar estilos CSS de efectos de forma nativa
        this.injectCSS();
    },

    // Generador de partículas retro cuadradas (Pixel Art Burst)
    pixelBurst(x, y, colors = ['#ffd700', '#ffffff', '#ff9900'], count = 16) {
        if (!x || !y) {
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'fx-pixel-particle';

            // Tamaño cuadrado retro (3px a 7px)
            const size = Math.floor(Math.random() * 5) + 3;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            // Posición inicial
            p.style.left = x + 'px';
            p.style.top = y + 'px';

            // Vector de eyección en arco
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 85 + 35;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance + 20; // Gravedad hacia abajo

            p.style.setProperty('--tx', `${tx}px`);
            p.style.setProperty('--ty', `${ty}px`);

            document.body.appendChild(p);

            // Limpieza tras finalizar animación (650ms)
            setTimeout(() => p.remove(), 650);
        }
    },

    // Disparar partículas centradas en cualquier elemento del DOM
    burstAtElement(target, colors, count = 16) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        this.pixelBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, colors, count);
    },

    // Números y mensajes flotantes estilo RPG
    floatingText(x, y, text, color = 'var(--primary-color)', isCrit = false) {
        const el = document.createElement('div');
        el.className = isCrit ? 'fx-floating-text fx-crit-text' : 'fx-floating-text';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = color;
        el.innerHTML = text;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), isCrit ? 1500 : 1200);
    },

    // Calcular posición óptima desde un evento de clic o elemento
    spawnFromEvent(e, text, color, isCrit = false) {
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;

        if (e && typeof e.clientX === 'number') {
            x = e.clientX;
            y = e.clientY;
        } else if (e && e.target) {
            const rect = e.target.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }

        // Variación aleatoria para que números sucesivos se lean con claridad
        const randomX = (Math.random() - 0.5) * 44;
        const randomY = (Math.random() - 0.5) * 24;
        this.floatingText(x + randomX, y - 24 + randomY, text, color, isCrit);
    },

    // Sacudida de pantalla con 3 niveles de intensidad
    shake(intensity = 'normal') {
        const cls = intensity === 'heavy' ? 'fx-shake-heavy' : (intensity === 'light' ? 'fx-shake-light' : 'fx-shake');
        
        document.body.classList.remove('fx-shake', 'fx-shake-light', 'fx-shake-heavy');
        void document.body.offsetWidth; // Forzar reflow
        document.body.classList.add(cls);
        
        const duration = intensity === 'heavy' ? 480 : (intensity === 'light' ? 240 : 360);
        setTimeout(() => {
            document.body.classList.remove('fx-shake', 'fx-shake-light', 'fx-shake-heavy');
        }, duration);
    },

    // Destello de color de pantalla completa (rojo, verde, oro, blanco)
    flash(colorClass = 'red') {
        let overlay = document.getElementById('fx-flash-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fx-flash-overlay';
            overlay.className = 'fx-flash-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.classList.remove('red', 'green', 'gold', 'white');
        void overlay.offsetWidth; // Forzar reflow
        
        overlay.classList.add(colorClass);
        setTimeout(() => {
            overlay.classList.remove(colorClass);
        }, 320);
    },

    // Inyección de estilos y animaciones JRPG
    injectCSS() {
        if (document.getElementById('fx-styles')) return;
        const style = document.createElement('style');
        style.id = 'fx-styles';
        style.innerHTML = `
            /* Partículas Pixeladas */
            @keyframes fxParticleFly {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                60% {
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--tx), var(--ty)) scale(0);
                    opacity: 0;
                }
            }
            .fx-pixel-particle {
                position: fixed;
                pointer-events: none;
                z-index: 10000;
                shape-rendering: crispEdges;
                animation: fxParticleFly 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }

            /* Números Flotantes Normales */
            @keyframes floatUpAndFade {
                0% { transform: translateY(0) scale(0.85); opacity: 0; }
                15% { transform: translateY(-10px) scale(1.1); opacity: 1; }
                70% { transform: translateY(-42px) scale(1); opacity: 1; }
                100% { transform: translateY(-64px) scale(0.9); opacity: 0; }
            }
            .fx-floating-text {
                position: fixed;
                pointer-events: none;
                font-family: 'Press Start 2P', monospace;
                font-size: 1.05rem;
                font-weight: normal;
                z-index: 9999;
                text-shadow: 2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000;
                animation: floatUpAndFade 1.2s ease-out forwards;
                user-select: none;
            }

            /* Números Flotantes de Golpe Crítico */
            @keyframes floatUpCrit {
                0% { transform: translateY(0) scale(0.6); opacity: 0; }
                20% { transform: translateY(-18px) scale(1.35); opacity: 1; }
                50% { transform: translateY(-34px) scale(1.15); opacity: 1; }
                80% { transform: translateY(-50px) scale(1.05); opacity: 1; }
                100% { transform: translateY(-70px) scale(0.9); opacity: 0; }
            }
            .fx-floating-text.fx-crit-text {
                font-size: 1.35rem;
                color: #ffd700 !important;
                text-shadow: 0 0 12px rgba(255, 215, 0, 0.9), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
                animation: floatUpCrit 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }

            /* Sacudidas de Pantalla (Screen Shake) */
            @keyframes fxShakeHeavy {
                0% { transform: translate(0, 0) rotate(0deg); }
                15% { transform: translate(-6px, 4px) rotate(-1.5deg); }
                30% { transform: translate(6px, -4px) rotate(1.5deg); }
                45% { transform: translate(-4px, -3px) rotate(-1deg); }
                60% { transform: translate(4px, 3px) rotate(1deg); }
                75% { transform: translate(-2px, 1px) rotate(-0.5deg); }
                90% { transform: translate(2px, -1px) rotate(0deg); }
                100% { transform: translate(0, 0) rotate(0deg); }
            }

            @keyframes fxShakeMed {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                40% { transform: translate(3px, 2px) rotate(0deg); }
                60% { transform: translate(-2px, 1px) rotate(0deg); }
                80% { transform: translate(1px, -1px) rotate(0deg); }
                100% { transform: translate(0, 0) rotate(0deg); }
            }

            @keyframes fxShakeLight {
                0% { transform: translate(0, 0); }
                25% { transform: translate(-2px, 2px); }
                50% { transform: translate(2px, -1px); }
                75% { transform: translate(-1px, -1px); }
                100% { transform: translate(0, 0); }
            }

            .fx-shake-heavy {
                animation: fxShakeHeavy 0.48s cubic-bezier(.36,.07,.19,.97) both;
            }
            .fx-shake {
                animation: fxShakeMed 0.36s cubic-bezier(.36,.07,.19,.97) both;
            }
            .fx-shake-light {
                animation: fxShakeLight 0.24s ease-out both;
            }

            /* Flash de Pantalla Completa */
            .fx-flash-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 9998;
                opacity: 0;
                transition: opacity 0.3s ease-out;
            }
            .fx-flash-overlay.red { background-color: rgba(239, 68, 68, 0.35); opacity: 1; transition: opacity 0.05s ease-in; }
            .fx-flash-overlay.green { background-color: rgba(16, 185, 129, 0.25); opacity: 1; transition: opacity 0.05s ease-in; }
            .fx-flash-overlay.gold { background-color: rgba(255, 215, 0, 0.3); opacity: 1; transition: opacity 0.05s ease-in; }
            .fx-flash-overlay.white { background-color: rgba(255, 255, 255, 0.45); opacity: 1; transition: opacity 0.05s ease-in; }

            /* Feedback Táctil Arcade en Botones */
            .btn-pixel:active, .btn-menu:active, .btn-nav:active, .cmd-btn:active, .btn-pixel-icon:active {
                transform: translate(2px, 2px) !important;
                box-shadow: 1px 1px 0px rgba(0,0,0,0.9) !important;
            }
        `;
        document.head.appendChild(style);
    }
};

window.FX = FX;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => FX.init(), 100);
});
