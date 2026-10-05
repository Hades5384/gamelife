// js/ui/modals.js
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('active');
    playModalOpenSound();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.remove('active');
    playModalCloseSound();
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('mousedown', (e) => {
        if(e.target === overlay) closeModal(overlay.id);
    });
});

let confirmCallback = null;
function showConfirm(message, callback) {
    const msgEl = document.getElementById('confirm-message');
    if(msgEl) msgEl.textContent = message;
    openModal('confirm-modal');
    confirmCallback = callback;
}
function confirmYes() {
    if(confirmCallback) confirmCallback();
    closeModal('confirm-modal');
}
