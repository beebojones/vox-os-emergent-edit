/* ---------------------------------------------------
   Vox OS – Notification Engine (Toasts + History)
   Package 13 (FULL FILE)
--------------------------------------------------- */

let notifContainer = null;

/* ---------------------------------------------------
   INIT TOAST CONTAINER
--------------------------------------------------- */

function initNotifications() {
    notifContainer = document.getElementById("notifications");

    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.id = "notifications";
        document.body.appendChild(notifContainer);
    }
}

/* ---------------------------------------------------
   PUBLIC API
--------------------------------------------------- */

function sendNotification(title, message = "", category = "system") {
    const data = {
        title,
        message,
        category,
        time: Date.now(),
        unread: true
    };

    addNotificationToHistory(data);
    showToast(data);
    playNotificationSound(category);

    // Notify listeners (like the panel)
    document.dispatchEvent(new Event("vox:new-notification"));
}

/* ---------------------------------------------------
   TOAST UI
--------------------------------------------------- */

function showToast(note) {
    const toast = document.createElement("div");
    toast.className = "toast";

    toast.innerHTML = `
        <div class="toast-icon">
            <img src="${getToastIcon(note.category)}">
        </div>
        <div class="toast-content">
            <div class="toast-title">${note.title}</div>
            <div class="toast-message">${note.message}</div>
        </div>
    `;

    notifContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add("show");
    }, 20);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getToastIcon(category) {
    switch(category) {
        case "error": return "icons/notifications/error.png";
        case "warning": return "icons/notifications/warning.png";
        case "app": return "icons/notifications/app.png";
        case "system": return "icons/notifications/system.png";
        default: return "icons/notifications/info.png";
    }
}

/* ---------------------------------------------------
   HISTORY STORAGE
--------------------------------------------------- */

function addNotificationToHistory(note) {
    const history = getNotificationsHistory();
    history.unshift(note); // newest first
    localStorage.setItem("vox_notifications", JSON.stringify(history));
}

function getNotificationsHistory() {
    const raw = localStorage.getItem("vox_notifications");
    return raw ? JSON.parse(raw) : [];
}

function countUnreadNotifications() {
    return getNotificationsHistory().filter(n => n.unread).length;
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.initNotifications = initNotifications;
window.sendNotification = sendNotification;
window.getNotificationsHistory = getNotificationsHistory;
window.countUnreadNotifications = countUnreadNotifications;
