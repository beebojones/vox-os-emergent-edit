/* ---------------------------------------------------
   Vox OS – Widget Engine
   Package 7 (Full File)
--------------------------------------------------- */

/* Layer where widgets are rendered */
const widgetsLayer = document.getElementById("widgets-layer");

/* LocalStorage keys */
const LS_WIDGETS = "vox_widgets_active";
const LS_POS_PREFIX = "vox_widget_pos_";
const LS_NOTES_TEXT = "vox_widget_notes";

/* Widget definitions from presets */
const PRESETS = window.WIDGET_PRESETS;

/* Active widgets (id: DOM element) */
let activeWidgets = {};

/* ---------------------------------------------------
   LOAD SAVED ACTIVE WIDGETS
--------------------------------------------------- */

function loadActiveWidgets() {
    const saved = localStorage.getItem(LS_WIDGETS);
    if (!saved) return [];

    try {
        return JSON.parse(saved);
    } catch {
        return [];
    }
}

function saveActiveWidgets(list) {
    localStorage.setItem(LS_WIDGETS, JSON.stringify(list));
}

/* ---------------------------------------------------
   CREATE A WIDGET
--------------------------------------------------- */

function createWidget(id) {
    const preset = PRESETS[id];
    if (!preset) return;

    /* If already active, ignore */
    if (activeWidgets[id]) return;

    /* Create element */
    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.id = id;
    el.style.width = preset.width + "px";
    el.style.height = preset.height + "px";

    /* Insert HTML template */
    el.innerHTML = preset.template();

    /* Add to layer */
    widgetsLayer.appendChild(el);
    activeWidgets[id] = el;

    /* Load saved position or default */
    loadWidgetPosition(el, preset);

    /* Fade in */
    requestAnimationFrame(() => {
        el.classList.add("visible");
    });

    /* Make draggable */
    makeWidgetDraggable(el);

    /* Special widget behaviors */
    initSpecialWidget(id, el);

    /* Save list */
    const saved = loadActiveWidgets();
    if (!saved.includes(id)) {
        saved.push(id);
        saveActiveWidgets(saved);
    }
}

/* ---------------------------------------------------
   REMOVE A WIDGET
--------------------------------------------------- */

function removeWidget(id) {
    const el = activeWidgets[id];
    if (!el) return;

    el.classList.remove("visible");
    setTimeout(() => el.remove(), 150);

    delete activeWidgets[id];

    /* Update saved list */
    const saved = loadActiveWidgets().filter(x => x !== id);
    saveActiveWidgets(saved);
}

/* ---------------------------------------------------
   LOAD WIDGET POSITIONS
--------------------------------------------------- */

function loadWidgetPosition(el, preset) {
    const key = LS_POS_PREFIX + preset.id;
    const saved = localStorage.getItem(key);

    if (saved) {
        const pos = JSON.parse(saved);
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
    } else {
        el.style.left = preset.defaultX + "px";
        el.style.top = preset.defaultY + "px";
    }
}

function saveWidgetPosition(id, x, y) {
    const key = LS_POS_PREFIX + id;
    localStorage.setItem(key, JSON.stringify({ x, y }));
}

/* ---------------------------------------------------
   DRAGGABLE WIDGETS
--------------------------------------------------- */

function makeWidgetDraggable(el) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    const id = el.dataset.id;

    el.addEventListener("mousedown", (e) => {
        dragging = true;
        el.classList.add("dragging");

        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", stopDrag);
    });

    function onDrag(e) {
        if (!dragging) return;

        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        /* Keep in bounds */
        x = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, x));
        y = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 60, y));

        el.style.left = x + "px";
        el.style.top = y + "px";
    }

    function stopDrag() {
        if (!dragging) return;
        dragging = false;

        el.classList.remove("dragging");

        /* Save position */
        saveWidgetPosition(id, el.offsetLeft, el.offsetTop);

        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", stopDrag);
    }
}

/* ---------------------------------------------------
   SPECIAL WIDGET LOGIC
--------------------------------------------------- */

function initSpecialWidget(id, el) {

    /* CLOCK WIDGET */
    if (id === "clock") {
        const timeEl = el.querySelector("#clock-widget-time");
        const dateEl = el.querySelector("#clock-widget-date");

        function updateClockWidget() {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
            dateEl.textContent = now.toLocaleDateString();
        }

        updateClockWidget();
        setInterval(updateClockWidget, 1000);
    }

    /* WEATHER WIDGET */
    if (id === "weather") {
        /* Mock data for now */
        const tempEl = el.querySelector("#weather-temp");
        const descEl = el.querySelector("#weather-desc");

        /* Fake drift effect */
        setInterval(() => {
            let temp = 70 + Math.floor(Math.random() * 6);
            tempEl.textContent = temp + "°";

            const descriptions = ["Sunny", "Clear", "Warm", "Windy", "Nice"];
            descEl.textContent = descriptions[Math.floor(Math.random() * descriptions.length)];

        }, 8000);
    }

    /* SYSTEM STATS (fake animation) */
    if (id === "stats") {
        const cpu = el.querySelector("#cpu-fill");
        const ram = el.querySelector("#ram-fill");
        const gpu = el.querySelector("#gpu-fill");

        setInterval(() => {
            cpu.style.width = (20 + Math.random() * 60) + "%";
            ram.style.width = (30 + Math.random() * 50) + "%";
            gpu.style.width = (10 + Math.random() * 70) + "%";
        }, 1200);
    }

    /* STICKY NOTES */
    if (id === "notes") {
        const box = el.querySelector("#notes-text");

        /* Load saved notes text */
        const saved = localStorage.getItem(LS_NOTES_TEXT);
        if (saved) box.value = saved;

        /* Save on input */
        box.addEventListener("input", () => {
            localStorage.setItem(LS_NOTES_TEXT, box.value);
        });
    }

    /* QUOTE OF THE DAY */
    if (id === "quote") {
        /* You can upgrade this later with a real API */
    }
}

/* ---------------------------------------------------
   QUICK SETTINGS TOGGLES
--------------------------------------------------- */

function initWidgetToggles() {
    const toggles = document.querySelectorAll(".widget-toggle");

    toggles.forEach(toggle => {
        const id = toggle.dataset.id;

        /* Set initial state from saved widgets */
        const saved = loadActiveWidgets();
        toggle.checked = saved.includes(id);

        toggle.addEventListener("change", () => {
            if (toggle.checked) {
                createWidget(id);
            } else {
                removeWidget(id);
            }
        });
    });
}

/* ---------------------------------------------------
   INIT ON STARTUP
--------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    /* Load saved widgets */
    const list = loadActiveWidgets();
    list.forEach(id => createWidget(id));

    /* Activate toggles */
    initWidgetToggles();
});

/* ---------------------------------------------------
   EXPORTS (optional)
--------------------------------------------------- */

window.createWidget = createWidget;
window.removeWidget = removeWidget;
