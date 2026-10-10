# GAMELIFE: AI HANDOVER CONTEXT

Este documento está diseñado específicamente para que cualquier Asistente de IA (LLM) que retome este proyecto pueda entender inmediatamente el flujo, la arquitectura, la filosofía de diseño y el estado actual de "GameLife".

## 1. CONCEPTO DEL PROYECTO
**GameLife** no es una "app de productividad con temática de juegos". Es un **videojuego RPG** en el que las misiones son las tareas de la vida real del usuario. 
*   **Filosofía:** "No quiero que mi juego se vuelva una escapatoria de tus responsabilidades". 
*   **Diseño Visual:** Estrictamente retro (Pixel Art). **Prohibido** usar bordes redondeados (`border-radius: 0`). Todo debe tener líneas duras, sombras sólidas (box-shadows sin blur), y efectos CRT (scanlines).
*   **Stack:** Vanilla HTML5, CSS3, y JavaScript (ES6 Modules). Sin frameworks pesados.

## 2. ARQUITECTURA DEL CÓDIGO
El proyecto sigue una arquitectura modular en el Frontend.

### Estructura de Directorios Principal:
*   `/index.html`: La Interfaz Única (SPA). Contiene la estructura DOM completa: Navegación Superior (Top Nav), Grid de 3 Columnas (Dashboard) y Modales ocultos.
*   `/style.css`: Hoja de estilos masiva y global. Contiene:
    *   Variables de temas (ej. `[data-theme="dark-minimal"]`).
    *   Tipografía Dual: `Press Start 2P` (para UI, números, stats) y `Pixelify Sans` (para textos largos legibles).
    *   Clases base de UI (`.panel`, `.btn-pixel`, `.btn-menu`).
    *   Sistema de grid responsivo para `.dashboard`.
    *   Gestión de sprites (`.sprite-icon`, `.sprite-icon.small`).
*   `/css/systems.css`: Estilos adicionales de sistemas.
*   `/assets/`: Contiene los sprites en pixel art subidos por el usuario (iconos como `coin.png`, `life.png`, `force.png`, etc.) y fondos de base.
*   `/js/core/StateManager.js`: **La única fuente de verdad**. Maneja todo el estado del jugador (HP, XP, Oro, Racha, Misiones) mediante LocalStorage y un sistema de EventBus básico (`dispatchEvent`).
*   `/js/ui/hud.js`: Controlador de la UI que escucha los cambios del `StateManager` y repinta el Header, los corazones (`life.png`), las barras de XP y stats.
*   `/js/systems/`: Lógica separada por mecánicas (Misiones, Base/Santuario, Música, Crónica/Logros).

## 3. DISEÑO DE LA INTERFAZ (UI/UX)
El layout fue reconstruido y estabilizado recientemente bajo un esquema de **Grid/Flexbox Responsivo**:

*   **Global (`body` y `.dashboard`):** 
    *   En Desktop (`min-width: 900px`): `body` ocupa `100vh` con `overflow: hidden`. El `.dashboard` usa `flex: 1` para llenar la pantalla sin cortarse, y aplica un grid de 3 columnas (Sidebar Izquierda, Main Content, Sidebar Derecha). Los paneles hacen scroll interno independientemente (`overflow-y: auto`).
    *   En Mobile (`max-width: 899px`): El `.dashboard` se apila en una sola columna vertical. El `body` permite `overflow: auto` para hacer scroll global. Los bordes cambian de `border-right` a `border-bottom` para separar secciones lógicamente.
*   **Sprites de Arte:** Todos los emojis genéricos fueron reemplazados por `.png` de pixel art renderizados con `image-rendering: pixelated;`.

## 4. ESTADO ACTUAL (Progreso hasta la fecha)
✅ **Completado:**
*   Reestructuración total del layout a 3 columnas robustas (responsive).
*   Limpieza total del CSS: Todo se maneja por clases centralizadas (como `.btn-menu`), eliminando estilos en línea destructivos.
*   Integración de Pixel Art del Usuario: Corazones dinámicos de vida, escudos, oro, rachas y menú principal conectados a imágenes reales del juego.
*   Corrección tipográfica: Se aumentaron las fuentes `Press Start 2P` a `1rem`/`1.2rem` para garantizar contraste y legibilidad a nivel de pixel sin difuminados.
*   Integración básica del motor de estado (`StateManager`).

⏳ **Siguientes Pasos (Pendientes):**
1.  **Lógica del Core Loop (Misiones):** Dar vida funcional al motor de misiones (`/js/systems/missions.js`). Crear mecánicas de agregar, fallar, y completar quests para afectar el XP y HP en tiempo real.
2.  **Santuario del Héroe (Base):** Implementar la construcción/mejora visual de la base del jugador gastando los recursos obtenidos.
3.  **Tienda y Recompensas:** Lógica de economía interna y Gremio.
4.  **Audio:** Refinar el reproductor de música integrado (`music-widget`).

## 5. REGLAS PARA LA IA
1.  **NUNCA rompas el diseño responsive:** Si agregas paneles nuevos, respeta las reglas de flexbox del `.dashboard`.
2.  **NUNCA añadas `border-radius` a ningún elemento CSS.**
3.  **NO dependas de emojis:** Usa los sprites del directorio `/assets/` o pide al usuario que suba nuevos si es estrictamente necesario. Aplícales la clase `.sprite-icon`.
4.  **Tipografía:** Los textos de UI (`button`, contadores) deben usar `Press Start 2P`. Los descriptivos (`p`, `span` narrativo) deben usar `Pixelify Sans`. Nunca uses menos de `1rem` para texto pixelado.
5.  **Estado:** Si cambias datos de jugador, hazlo a través del `StateManager` y asegúrate de emitir el evento correcto para que `hud.js` reaccione pasivamente. ¡No mutar el DOM manualmente fuera de los controladores de UI!
