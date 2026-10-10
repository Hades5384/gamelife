// js/systems/base.js
const BaseUI = {
    initV4() {
        if (!StateManager.data.pet) {
            StateManager.data.pet = { level: 1, exp: 0, state: 'happy' };
        }
    },

    renderV4() {
        this.initV4();
        const viewport = document.getElementById('base-viewport');
        if (!viewport) return;

        // Limpiar
        viewport.innerHTML = '';
        viewport.className = 'base-viewport'; // Limpiar clases extras

        const state = StateManager.data;
        const stats = state.stats;
        const streak = state.streaks?.current || 0;
        const maxStreak = state.streaks?.max || 0;
        const heroLevel = state.hero?.level || 1;

        // 1. Clima y Cielo (Basado en racha)
        if (streak >= 7) {
            viewport.classList.add('weather-sunny');
            viewport.innerHTML += '<div style="position:absolute; top:10px; right:20px; font-size:40px; z-index: 1;">☀️</div>';
        } else if (streak >= 1) {
            viewport.style.backgroundColor = '#8b9bb4'; // Tarde / Día nublado
            viewport.innerHTML += '<div style="position:absolute; top:10px; right:20px; font-size:40px; z-index: 1;">⛅</div>';
        } else {
            viewport.classList.add('weather-rain');
            viewport.innerHTML += '<div style="position:absolute; top:10px; right:20px; font-size:40px; z-index: 10;">🌧️</div>';
        }

        // 2. Terreno
        const ground = document.createElement('div');
        ground.style.position = 'absolute';
        ground.style.bottom = '0';
        ground.style.width = '100%';
        ground.style.height = '40%';
        ground.style.backgroundColor = '#2d4c1e';
        ground.style.borderTop = '4px solid #1a3010';
        viewport.appendChild(ground);

        // 3. Estructura Central (Santuario)
        let shrineIcon = '🛖'; // Default cabaña
        if (heroLevel >= 25) shrineIcon = '🏰';
        else if (heroLevel >= 10) shrineIcon = '🏯';
        
        viewport.innerHTML += `
            <div style="position:absolute; bottom: 20%; left: 50%; transform: translateX(-50%); font-size: 80px; text-shadow: 0px 10px 0px rgba(0,0,0,0.5); z-index: 2;">
                ${shrineIcon}
            </div>
        `;

        // 4. Edificios de Atributos (Crecen si el atributo > 5)
        if (stats && stats.fuerza && stats.fuerza.level >= 5) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 15%; left: 10%; font-size: 50px; text-shadow: 0px 5px 0px rgba(0,0,0,0.5); z-index: 3;" title="Zona de Entrenamiento (Fuerza ${stats.fuerza.level})">⚔️</div>`;
        }
        if (stats && stats.sabiduria && stats.sabiduria.level >= 5) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 25%; right: 15%; font-size: 50px; text-shadow: 0px 5px 0px rgba(0,0,0,0.5); z-index: 1;" title="Torre de Sabiduría (Sab ${stats.sabiduria.level})">📚</div>`;
        }
        if (stats && stats.creatividad && stats.creatividad.level >= 5) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 10%; right: 30%; font-size: 40px; text-shadow: 0px 5px 0px rgba(0,0,0,0.5); z-index: 3;" title="Taller Creativo (Cre ${stats.creatividad.level})">🎨</div>`;
        }
        if (stats && stats.carisma && stats.carisma.level >= 5) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 10%; left: 30%; font-size: 40px; text-shadow: 0px 5px 0px rgba(0,0,0,0.5); z-index: 3;" title="Taberna (Car ${stats.carisma.level})">🍺</div>`;
        }

        // 5. Trofeos Permanentes
        if (maxStreak >= 10) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 35%; left: 40%; font-size: 30px; filter: drop-shadow(0px 0px 10px gold); z-index: 1;" title="Estatua de Bronce (Racha 10)">🥉</div>`;
        }
        if (maxStreak >= 30) {
            viewport.innerHTML += `<div style="position:absolute; bottom: 35%; right: 40%; font-size: 30px; filter: drop-shadow(0px 0px 10px gold); z-index: 1;" title="Estatua de Oro (Racha 30)">🏆</div>`;
        }

        // 6. Compañero Espiritual (Pet) V4
        let petName = 'Chispa';
        let petFallbackIcon = '✨';
        let petImage = 'pet_spark.png';

        if (heroLevel >= 15) {
            petName = 'Dragón';
            petFallbackIcon = '🐉';
            petImage = 'pet_dragon.png';
        } else if (heroLevel >= 5) {
            petName = 'Lobo';
            petFallbackIcon = '🐺';
            petImage = 'pet_wolf.png';
        }

        viewport.innerHTML += `
            <div class="base-pet" title="${petName} (Compañero Vinculado)" style="z-index: 5; text-align: center;">
                <img src="assets/${petImage}" alt="${petName}" onerror="this.outerHTML='<span style=\\'font-size: 40px;\\'>${petFallbackIcon}</span>'" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
        `;
    }
};

// Register events
document.addEventListener('DOMContentLoaded', () => {
    EventBus.on('state:updated', () => {
        // Solo renderizar si el viewport está activo o existe
        const viewport = document.getElementById('base-viewport');
        if(viewport && viewport.parentElement.style.display !== 'none') {
            BaseUI.renderV4();
        }
    });
});
