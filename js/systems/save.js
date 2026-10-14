// js/systems/save.js
const SaveSystem = {
    createSavePoint() {
        StateManager.save(); 
        const dataStr = JSON.stringify(StateManager.data);
        const b64 = btoa(unescape(encodeURIComponent(dataStr)));
        localStorage.setItem('gamelife_savepoint', b64);
        showToast("> GUARDADO", "Punto de guardado creado (Save State).");
    },
    
    restoreSavePoint() {
        closeModal('save-modal');
        showConfirm("Esto sobreescribirá tu estado actual. ¿Continuar?", () => {
            const b64 = localStorage.getItem('gamelife_savepoint');
            if (b64) {
                try {
                    const dataStr = decodeURIComponent(escape(atob(b64)));
                    const data = JSON.parse(dataStr);
                    StateManager.data = data;
                    StateManager.save();
                    window.location.reload();
                } catch (e) {
                    showToast("> ERROR", "Punto de guardado corrupto.", true);
                }
            } else {
                showToast("> ERROR", "No hay punto de guardado.", true);
            }
        });
    },
    
    exportData() {
        StateManager.save();
        const dataStr = JSON.stringify(StateManager.data);
        const checksum = Utils.hash(dataStr);
        const exportObj = {
            data: StateManager.data,
            checksum: checksum
        };
        
        const blob = new Blob([JSON.stringify(exportObj)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gamelife_save_${Utils.getTodayISO()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    importData(event) {
        const file = event.target.files ? event.target.files[0] : null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                let validData = null;
                
                if (imported.checksum && imported.data) {
                    const calc = Utils.hash(JSON.stringify(imported.data));
                    if (calc !== imported.checksum) {
                        showToast("> ADVERTENCIA", "El archivo parece editado, pero lo cargaremos.");
                    }
                    validData = imported.data;
                } else if (imported.schemaVersion) {
                    validData = imported;
                } else {
                    throw new Error("Formato no válido");
                }
                
                if (validData) {
                    closeModal('save-modal');
                    showConfirm("Importar borrará el progreso actual. ¿Continuar?", () => {
                        StateManager.data = validData;
                        StateManager.save();
                        window.location.reload();
                    });
                }
            } catch(err) {
                showToast("> ERROR", "No se pudo leer el archivo.", true);
            }
        };
        reader.readAsText(file);
    },
    
    newGame() {
        closeModal('save-modal');
        showConfirm("¡ATENCIÓN! Se borrará TODO el progreso. ¿Estás seguro?", () => {
            StateManager.data = StateManager.getDefaultState();
            StateManager.save();
            window.location.reload();
        });
    }
};

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        SaveSystem.createSavePoint();
    }
});
