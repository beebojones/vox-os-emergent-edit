/* ---------------------------------------------------
   Vox OS – Toast Notification Stack Engine
   Package 9 (FULL FILE)
--------------------------------------------------- */

const toastLayer = document.getElementById("toast-layer");

// Store currently visible toasts
let activeToasts = [];

/* ---------------------------------------------------
   CREATE A TOAST
--------------------------------------------------- */

function createToast({ 
    title = "Notification",
    message = "",
    type = "system",
    actionText = null,
    action = null,
    duration = 4500,
    priority = "normal",
    icon = null,
    onClose = null
}) {

    // Toast container
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    if (priority === "high") toast.classList.add("shake");
    if (priority === "critical") toast.classList.add("critical");

    // Default system icon if none provided
    const iconSrc = icon || `icons/${type}.png`;

    toast.innerHTML = `
        <img class="toast-icon" src="${iconSrc}">
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
            ${actionText ? `<div class="toast-action">${actionText}</div>` : ""}
        </div>
        <div class="toast-timer">
            <svg><circle cx="14" cy="14" r="14"></circle></svg>
        </div>
        <div class="toast-close">✕</div>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    const actionBtn = toast.querySelector(".toast-action");
    const circle = toast.querySelector("circle");

    /* ---------------------------------------------------
       ATTACH EVENT HANDLERS
    --------------------------------------------------- */

    // Close button click
    closeBtn.onclick = () => dismissToast(toast, onClose);

    // Action click
    if (actionBtn && action) {
        actionBtn.onclick = () => {
            action();
            dismissToast(toast, onClose);
        };
    }

    /* ---------------------------------------------------
       AUTO-DISMISS TIMER
    --------------------------------------------------- */

    let autoTimer = null;

    if (priority !== "critical") {
        // Animate circle stroke
        circle.style.transition = `stroke-dashoffset ${duration}ms linear`;
        circle.style.strokeDashoffset = 88; // full circle

        // Start countdown
        autoTimer = setTimeout(() => {
            dismissToast(toast, onClose);
        }, duration);
    } else {
        // Critical toasts never auto-dismiss
        circle.style.opacity = 0.2;
    }

    /* ---------------------------------------------------
       ADD TO STACK
    --------------------------------------------------- */

    toastLayer.appendChild(toast);

    // Force reflow, then animate in
    requestAnimationFrame(() => {
        toast.classList.add("visible");
    });

    activeToasts.push(toast);

    return toast;
}

/* ---------------------------------------------------
   DISMISS TOAST
--------------------------------------------------- */

function dismissToast(toast, onClose) {
    if (!toast) return;

    toast.classList.remove("visible");
    toast.classList.add("closing");

    setTimeout(() => {
        toast.remove();

        // Remove from active list
        activeToasts = activeToasts.filter(t => t !== toast);

        if (onClose) onClose();
    }, 250);
}

/* ---------------------------------------------------
   PUBLIC API
--------------------------------------------------- */

window.createToast = createToast;
window.dismissToast = dismissToast;
