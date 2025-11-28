/* ---------------------------------------------------
   Vox OS – Notification History 2.0
   Package 9 (FULL FILE)
--------------------------------------------------- */

//
// HISTORY STRUCTURE:
// [
//   {
//     title: "...",
//     message: "...",
//     type: "system" | "app" | "task" | "widget" | "error" | "success",
//     icon: "icons/...",
//     timestamp: Date(),
//     unread: true
//   }
// ]
//

const HISTORY_KEY = "vox_notif_history";

let notifHistory = loadHistory();

/* ---------------------------------------------------
   LOAD + SAVE
--------------------------------------------------- */

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(notifHistory));
}

/* ---------------------------------------------------
   ADD ENTRY
--------------------------------------------------- */

function addNotificationToHistory(entry) {
    notifHistory.unshift({
        title: entry.title,
        message: entry.message,
        type: entry.type,
        icon: entry.icon || `icons/${entry.type}.png`,
        timestamp: entry.timestamp || new Date(),
        unread: entry.unread ?? true
    });

    saveHistory();
}

/* ---------------------------------------------------
   GROUP BY TYPE
--------------------------------------------------- */

function groupHistoryByType() {
    const buckets = {};

    for (const item of notifHistory) {
        if (!buckets[item.type]) buckets[item.type] = [];
        buckets[item.type].push(item);
    }

    return buckets;
}

/* ---------------------------------------------------
   TIMESTAMP FORMATTER
--------------------------------------------------- */

function formatTimestamp(ts) {
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* ---------------------------------------------------
   MARK ALL AS READ
--------------------------------------------------- */

function markAllAsRead() {
    notifHistory = notifHistory.map(n => ({ ...n, unread: false }));
    saveHistory();
}

/* ---------------------------------------------------
   CLEAR CATEGORY
--------------------------------------------------- */

function clearCategory(type) {
    notifHistory = notifHistory.filter(n => n.type !== type);
    saveHistory();
}

/* ---------------------------------------------------
   RENDER NOTIFICATION CENTER
--------------------------------------------------- */

function updateNotificationCenter() {
    const container = document.getElementById("notif-list");
    if (!container) return;

    const buckets = groupHistoryByType();
    container.innerHTML = "";

    const typesInOrder = [
        "system",
        "app",
        "task",
        "widget",
        "success",
        "error"
    ];

    let unreadCount = 0;

    for (const group of Object.values(notifHistory)) {
        if (group.unread) unreadCount++;
    }

    /* Bell badge (later you can add visual badge) */
    const notifBtn = document.getElementById("notif-btn");
    if (notifBtn) {
        notifBtn.dataset.count = unreadCount > 0 ? unreadCount : "";
    }

    for (const type of typesInOrder) {
        const items = buckets[type];
        if (!items) continue;

        // Category header
        const header = document.createElement("div");
        header.className = "notif-section-header";
        header.innerHTML = `
            <span class="notif-section-title">${type.toUpperCase()}</span>
            <button class="notif-clear-btn" data-type="${type}">
                Clear
            </button>
        `;
        container.appendChild(header);

        // Attach clear button handler
        header.querySelector(".notif-clear-btn").onclick = () => {
            clearCategory(type);
            updateNotificationCenter();
        };

        // List items in this category
        for (const item of items) {
            const row = document.createElement("div");
            row.className = "notif-item";
            if (item.unread) row.classList.add("unread");

            row.innerHTML = `
                <img class="notif-item-icon" src="${item.icon}">
                <div class="notif-item-body">
                    <div class="notif-item-title">${item.title}</div>
                    <div class="notif-item-message">${item.message}</div>
                    <div class="notif-item-time">${formatTimestamp(item.timestamp)}</div>
                </div>
            `;

            // Mark as read when clicked
            row.onclick = () => {
                item.unread = false;
                saveHistory();
                updateNotificationCenter();
            };

            container.appendChild(row);
        }
    }
}

/* ---------------------------------------------------
   EXPORTS
--------------------------------------------------- */

window.addNotificationToHistory = addNotificationToHistory;
window.updateNotificationCenter = updateNotificationCenter;
window.markAllAsRead = markAllAsRead;
window.clearCategory = clearCategory;

// Initial load
updateNotificationCenter();
