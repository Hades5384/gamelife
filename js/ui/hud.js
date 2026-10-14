// js/ui/hud.js

let ecgAnimationId = null;
let ecgX = 0;
let ecgPrevX = 0;
let ecgPrevY = 10;
let ecgBeatPhase = -1;
let ecgDistanceSinceLastBeat = 0;

function stopECG() {
    if (ecgAnimationId) {
        cancelAnimationFrame(ecgAnimationId);
        ecgAnimationId = null;
    }
}

function startECG() {
    if (ecgAnimationId) return;
    const canvas = document.getElementById('re-ecg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const midY = Math.floor(h / 2);

    ctx.fillStyle = '#020f06';
    ctx.fillRect(0, 0, w, h);

    ecgX = 0;
    ecgPrevX = 0;
    ecgPrevY = midY;
    ecgBeatPhase = -1;
    ecgDistanceSinceLastBeat = 0;

    function loop() {
        const c = document.getElementById('re-ecg-canvas');
        if (!c) {
            ecgAnimationId = null;
            return;
        }

        const hp = StateManager.data ? StateManager.data.hero.hp : 100;
        const maxHp = StateManager.data ? StateManager.data.hero.maxHp : 100;
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

        let color = '#22C55E';
        let speed = 1.8;
        let beatInterval = 85;

        if (hp <= 0) {
            color = '#6B7280';
            speed = 1.2;
            beatInterval = 999999;
        } else if (hpPct <= 25) {
            color = '#EF4444';
            speed = 2.6;
            beatInterval = 38;
        } else if (hpPct <= 50) {
            color = '#F59E0B';
            speed = 2.2;
            beatInterval = 58;
        }

        const nextX = ecgX + speed;

        // Borrar una franja suave por delante del haz de electrones
        ctx.fillStyle = '#020f06';
        ctx.fillRect(ecgX, 0, speed + 14, h);

        let targetY = midY;

        if (hp > 0) {
            ecgDistanceSinceLastBeat += speed;
            if (ecgBeatPhase === -1 && ecgDistanceSinceLastBeat >= beatInterval) {
                ecgBeatPhase = 0;
                ecgDistanceSinceLastBeat = 0;
            }

            if (ecgBeatPhase >= 0) {
                const p = ecgBeatPhase;
                if (p <= 4) {
                    targetY = midY - Math.sin((p / 4) * Math.PI) * 2.5; // P wave
                } else if (p <= 7) {
                    targetY = midY;
                } else if (p <= 10) {
                    targetY = midY + 3.5; // Q dip
                } else if (p <= 14) {
                    targetY = midY - 8.5; // R spike alto
                } else if (p <= 18) {
                    targetY = midY + 6.5; // S dip profundo
                } else if (p <= 21) {
                    targetY = midY;
                } else if (p <= 26) {
                    targetY = midY - Math.sin(((p - 21) / 5) * Math.PI) * 3; // T wave
                } else {
                    targetY = midY;
                    ecgBeatPhase = -1;
                }

                if (ecgBeatPhase >= 0) {
                    ecgBeatPhase += speed;
                }
            }
        }

        // Trazar línea continua
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'square';
        ctx.shadowColor = color;
        ctx.shadowBlur = 3;
        ctx.moveTo(ecgPrevX, ecgPrevY);
        ctx.lineTo(nextX, targetY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ecgPrevX = nextX;
        ecgPrevY = targetY;
        ecgX = nextX;

        // Envolver continuamente al final del canvas
        if (ecgX >= w) {
            ecgX = 0;
            ecgPrevX = 0;
            ecgPrevY = midY;
        }

        ecgAnimationId = requestAnimationFrame(loop);
    }

    ecgAnimationId = requestAnimationFrame(loop);
}

const HUD = {
    init() {
        EventBus.on('state:updated', this.render.bind(this));
        EventBus.on('hero:hp_changed', this.animateHp.bind(this));
        
        // Efectos visuales de Game Over
        EventBus.on('hero:death', () => {
            if (window.FX) {
                FX.shake('heavy');
                FX.flash('red');
            }
            if (window.AudioSys) AudioSys.playSFX('hit');
            else playErrorSound();
            
            setTimeout(() => {
                openModal('gameover-modal');
            }, 550);
        });
        
        this.render();
    },

    setHpStyle(style) {
        if (!['hearts', 'bar', 'ecg'].includes(style)) style = 'bar';
        if (StateManager.data) {
            StateManager.data.settings.hpStyle = style;
            try { localStorage.setItem('rpg_hp_style', style); } catch(e) {}
            EventBus.emit('state:updated');
        }
        if (window.AudioSys) AudioSys.playSFX('click');
        this.render();
    },

    render() {
        if (!StateManager.data) return;

        const hp = StateManager.data.hero.hp;
        const maxHp = StateManager.data.hero.maxHp;
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const style = (StateManager.data.settings && StateManager.data.settings.hpStyle) || 'bar';

        // 1. Sincronizar botones en Modal de Apariencia
        ['hearts', 'bar', 'ecg'].forEach(s => {
            const btn = document.getElementById(`opt-hp-${s}`);
            if (btn) {
                if (s === style) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        // 2. Renderizar slot de vitalidad
        const slot = document.getElementById('hud-hp-slot');
        if (slot) {
            if (style !== 'ecg') {
                stopECG();
            }

            if (style === 'bar') {
                // Barra original: Roja pura con leve brillo arriba, sin texturas ni números
                const isLow = hpPct <= 25 ? ' low' : '';
                slot.innerHTML = `
                    <div class="vitality-bar-container">
                        <div class="hud-hp-fill${isLow}" id="hud-hp-fill" style="width: ${hpPct}%;"></div>
                    </div>
                `;
            } else if (style === 'hearts') {
                // Corazones limpios
                const totalHearts = Math.ceil(maxHp / 10);
                const currentHearts = Math.ceil(hp / 10);
                let heartsHtml = '<div class="vitality-hearts-container">';
                for (let i = 0; i < totalHearts; i++) {
                    if (i < currentHearts) {
                        heartsHtml += `<img src="assets/life.png" class="vitality-heart-img" alt="HP">`;
                    } else {
                        heartsHtml += `<img src="assets/life.png" class="vitality-heart-img empty" alt="Lost HP">`;
                    }
                }
                heartsHtml += '</div>';
                slot.innerHTML = heartsHtml;
            } else if (style === 'ecg') {
                let statusName = 'FINE';
                let statusClass = 'fine';
                if (hp <= 0) {
                    statusName = 'DEAD';
                    statusClass = 'dead';
                } else if (hpPct <= 25) {
                    statusName = 'DANGER';
                    statusClass = 'danger';
                } else if (hpPct <= 50) {
                    statusName = 'CAUTION';
                    statusClass = 'caution';
                }

                const existingScreen = document.getElementById('re-ecg-screen');
                const existingStatus = document.getElementById('re-ecg-status');
                if (existingScreen && existingStatus) {
                    existingScreen.className = `re-ecg-screen status-${statusClass}`;
                    existingStatus.className = `re-ecg-status-text ${statusClass}`;
                    existingStatus.textContent = statusName;
                } else {
                    slot.innerHTML = `
                        <div class="re-ecg-screen status-${statusClass}" id="re-ecg-screen">
                            <span class="re-ecg-status-text ${statusClass}" id="re-ecg-status">${statusName}</span>
                            <canvas id="re-ecg-canvas" width="230" height="20" class="re-ecg-canvas"></canvas>
                        </div>
                    `;
                    startECG();
                }
            }
        }

        // 3. Barra de Experiencia (XP)
        const xpFill = document.getElementById('hud-xp-fill');
        const xpText = document.getElementById('hud-xp-text');
        const xp = StateManager.data.hero.xp;
        const nextXp = 100 + (StateManager.data.hero.level - 1) * 50;
        const xpPct = Math.max(0, Math.min(100, (xp / nextXp) * 100));

        if (xpFill) xpFill.style.width = xpPct + '%';
        if (xpText) xpText.textContent = `XP: ${xp}/${nextXp}`;

        // 4. Nivel, Racha, Escudos, Tesorería
        const levelText = document.getElementById('hud-level-text');
        const streakText = document.getElementById('hud-streak-text');
        const shieldText = document.getElementById('hud-shield-text');
        const goldText = document.getElementById('hud-gold-text');
        const equippedTitle = document.getElementById('hud-equipped-title');

        if (levelText) levelText.textContent = `Nv. ${StateManager.data.hero.level}`;
        if (streakText) streakText.textContent = StateManager.data.streak.current;
        if (shieldText) shieldText.textContent = `${StateManager.data.streak.shields}/2`;
        if (goldText && StateManager.data.economy) goldText.textContent = StateManager.data.economy.gold;
        
        // 5. Título equipado
        if (equippedTitle) {
            let t = StateManager.data.profile.equippedTitle;
            if (t === 'NONE') {
                equippedTitle.textContent = '';
                equippedTitle.style.display = 'none';
            } else {
                equippedTitle.style.display = 'block';
                if (!t) {
                    let h = StateManager.data.hero.level;
                    if (h >= 50) t = 'Leyenda';
                    else if (h >= 35) t = 'Héroe';
                    else if (h >= 20) t = 'Veterano';
                    else if (h >= 10) t = 'Aventurero';
                    else if (h >= 5) t = 'Aprendiz';
                    else t = 'Novato';
                }
                equippedTitle.textContent = t;
            }
        }
    },

    animateHp(data) {
        const avatarBox = document.getElementById('avatar-preview');
        if (avatarBox) {
            const floatEl = document.createElement('div');
            floatEl.className = 'floating-text';
            if (data.type === 'heal') {
                floatEl.style.color = '#2ecc71';
                floatEl.textContent = `+${data.amount} HP`;
            } else {
                floatEl.style.color = '#e74c3c';
                floatEl.textContent = `-${data.amount} HP`;
            }

            const rx = Math.random() * 40 - 20;
            floatEl.style.left = `calc(50% + ${rx}px)`;
            floatEl.style.top = `50%`;

            avatarBox.style.position = 'relative';
            avatarBox.appendChild(floatEl);

            setTimeout(() => {
                floatEl.remove();
            }, 1000);
        }
    }
};
