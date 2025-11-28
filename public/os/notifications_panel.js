/* ---------------------------------------------------
   Vox OS – Notifications Center Logic
   Package 13 (FULL FILE)
--------------------------------------------------- */

let notifPanel = null;
let notifList = null;
let notifClearBtn = null;
let notifBell = null;
let notifBadge = null;

let notifPanelOpen = false;

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */

function initNotificationsPanel() {
    notifPanel = document.getElementById("notifications-panel");
    notifList = document.getElementById("notif-list");
    notifClearBtn = document.getElementById("notif-clear");
    notifBell = document.getElementById("taskbar-bell");
    notifBadge = document.getElementById("notif-badge");

    if (!notifPanel || !notifList || !notifBell) {
        console.error("Notifications panel elements missing");
        return;
    }

    /* Toggle on bell click */
    notifBell.addEventListener("click", toggleNotificationsPanel);

    /* Clear all */
    notifClearBtn.addEventListener("click", () => {
        clearAllNotifications();
        renderNotificationsList();
    });

    /* Click outside closes panel */
    document.addEventListener("mousedown", (e) => {
        if (!notifPanelOpen) return;
        if (!notifPanel.contains(e.target) && e.target !== notifBell) {
            closeNotificationsPanel();
        }
    });

    /* Keyboard shortcut Ctrl + N */
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "n") {
            toggleNotificationsPanel();
            e.preventDefault();
        }
    });

    /* Render initial */
    renderNotificationsList();
    updateNotifBadge();

    /* Listen for new notifications (from notifications.js) */
    document.addEventListener("vox:new-notification", () => {
        renderNotificationsList();
        updateNotifBadge();
    });
}

/* ---------------------------------------------------
   PANEL OPEN / CLOSE
--------------------------------------------------- */

function toggleNotificationsPanel() {
    notifPanelOpen = !notifPanelOpen;
    notifPanel.classList.toggle("open", notifPanelOpen);

    if (notifPanelOpen) {
        markAllAsRead();
        updateNotifBadge();
        renderNotificationsList();
    }
}

function closeNotificationsPanel() {
    notifPanelOpen = false;
    notifPanel.classList.remove("open");
}

/* ---------------------------------------------------
   RENDER LIST
--------------------------------------------------- */

function renderNotificationsList() {
    if (!notifList) return;

    notifList.innerHTML = "";

    const notes = getNotificationsHistory();

    notes.forEach((n, index) => {
        const item = document.createElement("div");
        item.className = "notif-item";
        item.dataset.index = index;

        item.innerHTML = `
            <div class="notif-title-row">
                <img class="notif-icon" src="${getIconForNotif(n.category)}">
                <div class="notif-title">${n.title}</div>
            </div>

            <div class="notif-category">${n.category}</div>
            <div class="notif-time">${formatTimestamp(n.time)}</div>

            <div class="notif-details">${n.message}</div>
        `;

        item.addEventListener("click", () => {
            item.classList.toggle("expanded");
        });

        notifList.appendChild(item);
    });
}

/* ---------------------------------------------------
   BADGE
--------------------------------------------------- */

function updateNotifBadge() {
    const unread = countUnreadNotifications();

    if (unread > 0) {
        notifBadge.textContent = unread;
        notifBadge.classList.add("show");
    } else {
        notifBadge.classList.remove("show");
    }
}

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */

function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleString();
}

function getIconForNotif(category) {
    switch(category) {
        case "error": return "icons/notifications/error.png";
        case "warning": return "icons/notifications/warning.png";
        case "system": return "icons/notifications/system.png";
        case "app": return "icons/notifications/app.png";
        default: return "icons/notifications/info.png";
    }
}

function clearAllNotifications() {
    localStorage.setItem("vox_notifications", JSON.stringify([]));
}

function markAllAsRead() {
    const notes = getNotificationsHistory().map(n => ({
        ...n,
        unread: false
    }));
    localStorage.setItem("vox_notifications", JSON.stringify(notes));
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.initNotificationsPanel = initNotificationsPanel;
