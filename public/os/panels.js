/* ---------------------------------------------------
   Vox OS – Desktop Panels Logic
   Consolidated through Package 6
--------------------------------------------------- */

/* Panel DOM nodes */
const quickPanel = document.getElementById("quick-panel");
const notifCenter = document.getElementById("notification-center");
const clockPanel = document.getElementById("clock-panel");

/* Taskbar buttons */
const notifBtn = document.getElementById("notif-btn");
const clockBtn = document.getElementById("clock-btn");

/* Taskbar clock display */
const taskbarClock = document.getElementById("taskbar-clock");

/* ---------------------------------------------------
   CLOSE ALL PANELS
--------------------------------------------------- */
function closeAllPanels() {
    quickPanel.classList.remove("open");
    notifCenter.classList.remove("open");
    clockPanel.classList.remove("open");
}

/* ---------------------------------------------------
   TOGGLE FUNCTIONS
--------------------------------------------------- */
function toggleQuickPanel() {
    const open = quickPanel.classList.contains("open");
    closeAllPanels();
    if (!open) quickPanel.classList.add("open");
}

function toggleNotificationCenter() {
    const open = notifCenter.classList.contains("open");
    closeAllPanels();
    if (!open) notifCenter.classList.add("open");
}

function toggleClockPanel() {
    const open = clockPanel.classList.contains("open");
    closeAllPanels();
    if (!open) clockPanel.classList.add("open");
}

/* ---------------------------------------------------
   TASKBAR BUTTON HANDLERS
--------------------------------------------------- */
notifBtn.addEventListener("click", () => {
    toggleNotificationCenter();
});

clockBtn.addEventListener("click", () => {
    toggleClockPanel();
});

/* ---------------------------------------------------
   CLICK OUTSIDE CLOSES PANELS
--------------------------------------------------- */
document.addEventListener("mousedown", (e) => {
    if (
        quickPanel.contains(e.target) ||
        notifCenter.contains(e.target) ||
        clockPanel.contains(e.target) ||
        notifBtn.contains(e.target) ||
        clockBtn.contains(e.target)
    ) {
        return;
    }
    closeAllPanels();
});

/* ---------------------------------------------------
   ESC CLOSES PANELS
--------------------------------------------------- */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAllPanels();
    }
});

/* ---------------------------------------------------
   TASKBAR CLOCK (LIVE)
--------------------------------------------------- */
function updateTaskbarClock() {
    const now = new Date();
    taskbarClock.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}
setInterval(updateTaskbarClock, 1000);
updateTaskbarClock();

/* ---------------------------------------------------
   LARGE CLOCK (CLOCK PANEL)
--------------------------------------------------- */
function updateLargeClock() {
    const clockLarge = document.getElementById("clock-large");
    if (!clockLarge) return;

    const now = new Date();
    clockLarge.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}
setInterval(updateLargeClock, 1000);
updateLargeClock();

/* ---------------------------------------------------
   CALENDAR RENDERING
--------------------------------------------------- */
function renderCalendar() {
    const container = document.getElementById("calendar");
    if (!container) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    container.innerHTML = "";

    /* Header: Month + Year */
    const header = document.createElement("div");
    header.style.color = "var(--os-text)";
    header.style.fontSize = "15px";
    header.style.fontWeight = "600";
    header.style.textAlign = "center";
    header.textContent = now.toLocaleString("default", {
        month: "long",
        year: "numeric"
    });
    container.appendChild(header);

    /* Weekday labels */
    const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
    const headerRow = document.createElement("div");
    headerRow.className = "calendar-header";

    weekdays.forEach(d => {
        const el = document.createElement("div");
        el.textContent = d;
        headerRow.appendChild(el);
    });

    container.appendChild(headerRow);

    /* Grid */
    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    /* Empty cells for offset */
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        grid.appendChild(empty);
    }

    /* Days */
    for (let day = 1; day <= daysInMonth; day++) {
        const el = document.createElement("div");
        el.className = "calendar-day";
        el.textContent = day;

        if (day === today) {
            el.classList.add("today");
        }

        grid.appendChild(el);
    }

    container.appendChild(grid);
}

renderCalendar();

/* ---------------------------------------------------
   THEME ENGINE HOOKS (Package 6)
--------------------------------------------------- */

/* Theme toggle button */
const themeBtn = document.getElementById("theme-btn");

if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        if (window.toggleTheme) {
            toggleTheme();  // implemented in theme_engine.js (File 6)
        }
    });
}

/* ---------------------------------------------------
   EXPORTS
--------------------------------------------------- */
window.toggleQuickPanel = toggleQuickPanel;
window.toggleNotificationCenter = toggleNotificationCenter;
window.toggleClockPanel = toggleClockPanel;
