// js/ui/chronicle.js
const ChronicleUI = {
    open() {
        this.renderMedals();
        this.renderTitles();
        this.renderHistory();
        this.switchTab('medals'); // Default tab
        openModal('chronicle-modal');
    },
    
    renderMedals() {
        const c = document.getElementById('tab-medals-content');
        if (!c) return;
        c.innerHTML = '';
        
        const catalog = [...Achievements.catalog].sort((a, b) => {
            const aUnlocked = !!StateManager.data.achievements[a.id];
            const bUnlocked = !!StateManager.data.achievements[b.id];
            if (aUnlocked === bUnlocked) return 0;
            return aUnlocked ? -1 : 1;
        });

        catalog.forEach(ach => {
            const unlocked = StateManager.data.achievements[ach.id];
            const div = document.createElement('div');
            div.style.padding = '12px';
            div.style.border = '2px solid var(--border-color)';
            div.style.marginBottom = '10px';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.gap = '5px';
            
            if (!unlocked) {
                div.style.opacity = '0.5';
                div.style.filter = 'grayscale(100%)';
            }
            
            let color = 'var(--text-dim)';
            if (unlocked) {
                if (ach.tier === 'bronze') color = 'var(--tier-bronze, #cd7f32)';
                else if (ach.tier === 'silver') color = 'var(--tier-silver, #c0c0c0)';
                else if (ach.tier === 'gold') color = 'var(--tier-gold, #ffd700)';
                else if (ach.tier === 'legendary') color = 'var(--tier-legendary, #ff8c00)';
                div.style.borderColor = color;
            }
            
            let displayName = ach.name;
            let displayDesc = ach.desc;
            
            if (!unlocked && ach.secret) {
                displayName = '??? (Logro Oculto)';
                displayDesc = 'Descubre cómo desbloquearlo jugando...';
            }
            
            div.innerHTML = `
                <div style="color: ${color}; font-weight: bold; font-size: 0.65rem;">
                    ${unlocked ? '🏆' : '🔒'} ${displayName}
                </div>
                <div style="font-size: 0.55rem; color: var(--text-color); line-height: 1.4;">
                    ${displayDesc}
                </div>
            `;
            c.appendChild(div);
        });
    },

    renderTitles() {
        const c = document.getElementById('tab-titles-content');
        if (!c) return;
        c.innerHTML = '';

        const isHidden = StateManager.data.profile.equippedTitle === 'NONE';
        const customEquipped = StateManager.data.profile.equippedTitle && StateManager.data.profile.equippedTitle !== 'NONE' ? StateManager.data.profile.equippedTitle : null;

        let autoTitle = 'Novato';
        const h = StateManager.data.hero.level;
        if (h >= 50) autoTitle = 'Leyenda';
        else if (h >= 35) autoTitle = 'Héroe';
        else if (h >= 20) autoTitle = 'Veterano';
        else if (h >= 10) autoTitle = 'Aventurero';
        else if (h >= 5) autoTitle = 'Aprendiz';

        const displayCurrent = isHidden ? 'NINGUNO (Oculto)' : (customEquipped || `${autoTitle} (Auto)`);

        // Banner superior de estado y acción
        const statusBox = document.createElement('div');
        statusBox.style.cssText = 'padding: 12px 14px; margin-bottom: 18px; background: var(--bg-color); border: 2px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;';

        const textCol = document.createElement('div');
        textCol.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
        textCol.innerHTML = `
            <span style="font-size: 0.55rem; color: var(--text-dim); font-family: 'Press Start 2P', monospace;">ESTADO EN EL HUD:</span>
            <span style="font-size: 0.72rem; color: ${isHidden ? 'var(--color-danger)' : 'var(--primary-color)'}; font-family: 'Press Start 2P', monospace; display: flex; align-items: center; gap: 6px;">
                ${isHidden ? '[X] OCULTO' : `<img src="assets/star.png" class="sprite-icon" style="width:14px; height:14px; vertical-align:middle;" alt="Star"> ${displayCurrent}`}
            </span>
        `;
        statusBox.appendChild(textCol);

        const actionsCol = document.createElement('div');
        actionsCol.style.cssText = 'display: flex; gap: 8px; align-items: center;';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-pixel';
        toggleBtn.style.cssText = 'padding: 8px 12px; font-size: 0.55rem; cursor: pointer;';

        if (isHidden) {
            toggleBtn.style.background = 'var(--primary-color)';
            toggleBtn.style.color = 'var(--bg-color)';
            toggleBtn.style.borderColor = 'var(--primary-color)';
            toggleBtn.textContent = 'MOSTRAR TÍTULO';
            toggleBtn.onclick = () => {
                Titles.equip(''); // Restaura el título al automático
                this.renderTitles();
                playClickSound();
                showToast('> TÍTULO', 'Título restaurado en el HUD.');
            };
        } else {
            toggleBtn.style.background = 'transparent';
            toggleBtn.style.color = 'var(--color-danger)';
            toggleBtn.style.borderColor = 'var(--color-danger)';
            toggleBtn.textContent = 'OCULTAR TÍTULO';
            toggleBtn.onclick = () => {
                Titles.equip('NONE'); // Oculta el título
                this.renderTitles();
                playClickSound();
                showToast('> TÍTULO', 'Título ocultado del HUD.');
            };
        }
        actionsCol.appendChild(toggleBtn);

        if (!isHidden && customEquipped) {
            const autoBtn = document.createElement('button');
            autoBtn.type = 'button';
            autoBtn.className = 'btn-pixel';
            autoBtn.style.cssText = 'padding: 8px 10px; font-size: 0.55rem; background: transparent; color: var(--text-dim); border-color: var(--border-color); cursor: pointer;';
            autoBtn.textContent = 'AUTO';
            autoBtn.title = 'Volver al título por nivel de héroe';
            autoBtn.onclick = () => {
                Titles.equip('');
                this.renderTitles();
                playClickSound();
            };
            actionsCol.appendChild(autoBtn);
        }

        statusBox.appendChild(actionsCol);
        c.appendChild(statusBox);

        let allTitles = [
            { id: 'Novato', name: 'Novato', desc: 'Alcanza el Nivel 1 de Héroe', check: s => s.hero.level >= 1 },
            { id: 'Aprendiz', name: 'Aprendiz', desc: 'Alcanza el Nivel 5 de Héroe', check: s => s.hero.level >= 5 },
            { id: 'Aventurero', name: 'Aventurero', desc: 'Alcanza el Nivel 10 de Héroe', check: s => s.hero.level >= 10 },
            { id: 'Veterano', name: 'Veterano', desc: 'Alcanza el Nivel 20 de Héroe', check: s => s.hero.level >= 20 },
            { id: 'Héroe', name: 'Héroe', desc: 'Alcanza el Nivel 35 de Héroe', check: s => s.hero.level >= 35 },
            { id: 'Leyenda', name: 'Leyenda', desc: 'Alcanza el Nivel 50 de Héroe', check: s => s.hero.level >= 50 }
        ];

        Achievements.catalog.forEach(ach => {
            if (ach.title) {
                allTitles.push({
                    id: ach.title,
                    name: ach.title,
                    desc: ach.desc,
                    secret: ach.secret,
                    check: s => !!s.achievements[ach.id]
                });
            }
        });

        allTitles.forEach(t => {
            const unlocked = t.check(StateManager.data);
            
            const div = document.createElement('div');
            div.style.padding = '12px';
            div.style.border = '2px solid var(--border-color)';
            div.style.marginBottom = '10px';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.gap = '5px';
            
            if (!unlocked) {
                div.style.opacity = '0.5';
                div.style.filter = 'grayscale(100%)';
            }

            let displayName = t.name;
            let displayDesc = t.desc;
            
            if (!unlocked && t.secret) {
                displayName = '??? (Título Oculto)';
                displayDesc = 'Descubre cómo desbloquearlo jugando...';
            }

            const header = document.createElement('div');
            header.style.fontWeight = 'bold';
            header.style.fontSize = '0.65rem';
            header.style.color = unlocked ? 'var(--primary-color)' : 'var(--text-dim)';
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '6px';
            header.innerHTML = (unlocked ? '<img src="assets/star.png" class="sprite-icon small" style="width:13px; height:13px;" alt="Star"> ' : '🔒 ') + displayName;
            div.appendChild(header);

            const desc = document.createElement('div');
            desc.style.fontSize = '0.55rem';
            desc.style.color = 'var(--text-color)';
            desc.style.lineHeight = '1.4';
            desc.innerText = displayDesc;
            div.appendChild(desc);

            if (unlocked) {
                const btn = document.createElement('button');
                btn.className = 'btn-pixel';
                btn.style.marginTop = '10px';
                btn.style.padding = '10px';
                btn.style.fontSize = '0.5rem';
                btn.type = 'button';
                
                let isEquipped = false;
                let isAuto = false;

                if (!isHidden) {
                    if (customEquipped === t.id) {
                        isEquipped = true;
                    } else if (!customEquipped && autoTitle === t.id) {
                        isAuto = true;
                    }
                }

                if (isEquipped) {
                    btn.style.borderColor = 'var(--primary-color)';
                    btn.style.backgroundColor = 'var(--primary-color)';
                    btn.style.color = 'var(--bg-color)';
                    btn.textContent = 'EQUIPADO (CLIC PARA QUITAR)';
                    btn.onclick = () => {
                        Titles.equip(''); // Vuelve a auto
                        this.renderTitles();
                        playClickSound();
                    };
                } else if (isAuto) {
                    btn.style.borderColor = 'var(--primary-color)';
                    btn.style.backgroundColor = 'var(--bg-color)';
                    btn.style.color = 'var(--primary-color)';
                    btn.textContent = 'EQUIPADO (AUTO)';
                    btn.onclick = () => {
                        showToast('> TÍTULO', 'Este título está activo automáticamente por tu nivel.');
                    };
                } else {
                    btn.textContent = 'EQUIPAR';
                    btn.style.backgroundColor = 'var(--bg-color)';
                    btn.style.color = 'var(--text-color)';
                    btn.style.borderColor = 'var(--border-color)';
                    btn.onclick = () => {
                        Titles.equip(t.id);
                        this.renderTitles();
                        playClickSound();
                    };
                }
                div.appendChild(btn);
            }

            c.appendChild(div);
        });
    },
    
    renderHistory() {
        const c = document.getElementById('tab-history-content');
        if (!c) return;
        c.innerHTML = '';
        const hist = [...StateManager.data.history].reverse();
        hist.forEach(item => {
            const date = new Date(item.ts).toLocaleString();
            const div = document.createElement('div');
            div.style.fontSize = '0.55rem';
            div.style.marginBottom = '10px';
            div.style.borderBottom = '1px dashed var(--border-color)';
            div.style.paddingBottom = '5px';
            
            let msg = '';
            if (item.type === 'mission') msg = `Completaste misión nivel ${item.data.level}`;
            else if (item.type === 'levelup') msg = `¡Subiste a nivel de héroe ${item.data.level}!`;
            else if (item.type === 'gameover') msg = `GAME OVER - Tu salud llegó a cero.`;
            else if (item.type === 'achievement') msg = `Logro desbloqueado: ${item.data.id}`;
            
            div.innerHTML = `<span style="color:var(--text-dim)">[${date}]</span><br><span style="color:var(--primary-color)">${msg}</span>`;
            c.appendChild(div);
        });
    },
    
    switchTab(tabId) {
        document.querySelectorAll('.chronicle-tab').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.btn-tab').forEach(el => {
            el.style.backgroundColor = 'var(--bg-color)';
            el.style.color = 'var(--text-color)';
        });
        const content = document.getElementById(`tab-${tabId}-content`);
        const btn = document.getElementById(`btn-tab-${tabId}`);
        if (content) content.style.display = 'block';
        if (btn) {
            btn.style.backgroundColor = 'var(--primary-color)';
            btn.style.color = 'var(--bg-color)';
        }
    }
};
