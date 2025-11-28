/* ---------------------------------------------------
   Vox OS – Spotlight Search Engine
   Package 12 (FULL FILE)
--------------------------------------------------- */

let spotlightOpen = false;
let spotlightEl = null;
let spotlightSearch = null;
let spotlightResults = null;
let spotlightIndex = -1;

/* ---------------------------------------------------
   INIT SPOTLIGHT
--------------------------------------------------- */

function initSpotlight() {
    spotlightEl = document.getElementById("spotlight");
    spotlightSearch = document.getElementById("spotlight-search");
    spotlightResults = document.getElementById("spotlight-results");

    if (!spotlightEl) {
        console.error("Spotlight container not found");
        return;
    }

    /* Keyboard shortcut: Ctrl + Space */
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.code === "Space") {
            toggleSpotlight();
            e.preventDefault();
        }

        if (!spotlightOpen) return;

        // ESC closes spotlight
        if (e.key === "Escape") {
            closeSpotlight();
        }

        // Navigation
        if (e.key === "ArrowDown") {
            moveSpotlightSelection(1);
            e.preventDefault();
        }
        if (e.key === "ArrowUp") {
            moveSpotlightSelection(-1);
            e.preventDefault();
        }
        if (e.key === "Enter") {
            activateSpotlightSelection();
            e.preventDefault();
        }
    });

    // Live search
    spotlightSearch.addEventListener("input", () => {
        const q = spotlightSearch.value.trim();
        if (q.length === 0) {
            spotlightResults.innerHTML = "";
            spotlightIndex = -1;
        } else {
            renderSpotlightResults(q);
        }
    });

    // Click outside closes
    document.addEventListener("mousedown", (e) => {
        if (!spotlightOpen) return;
        if (!spotlightEl.contains(e.target)) closeSpotlight();
    });
}

/* ---------------------------------------------------
   OPEN / CLOSE / TOGGLE
--------------------------------------------------- */

function openSpotlight() {
    spotlightEl.style.display = "block";
    spotlightOpen = true;

    spotlightSearch.value = "";
    spotlightSearch.focus();
    spotlightResults.innerHTML = "";
    spotlightIndex = -1;
}

function closeSpotlight() {
    spotlightEl.style.display = "none";
    spotlightOpen = false;
}

function toggleSpotlight() {
    if (spotlightOpen) closeSpotlight();
    else openSpotlight();
}

/* ---------------------------------------------------
   RENDER RESULTS
--------------------------------------------------- */

function renderSpotlightResults(query) {
    spotlightResults.innerHTML = "";
    spotlightIndex = -1;

    const apps = searchApps(query);

    apps.forEach((app, i) => {
        const item = document.createElement("div");
        item.className = "spotlight-item";
        item.dataset.index = i;
        item.dataset.app = app.id;

        item.innerHTML = `
            <img class="spotlight-item-icon" src="${app.icon}">
            <div class="spotlight-item-title">${app.name}</div>
        `;

        if (app.description) {
            const desc = document.createElement("div");
            desc.className = "spotlight-item-desc";
            desc.textContent = app.description;
            item.appendChild(desc);
        }

        item.onclick = () => {
            closeSpotlight();
            app.launch();
        };

        spotlightResults.appendChild(item);
    });
}

/* ---------------------------------------------------
   KEYBOARD NAVIGATION
--------------------------------------------------- */

function moveSpotlightSelection(dir) {
    const items = spotlightResults.querySelectorAll(".spotlight-item");
    if (items.length === 0) return;

    spotlightIndex += dir;

    if (spotlightIndex < 0) spotlightIndex = items.length - 1;
    if (spotlightIndex >= items.length) spotlightIndex = 0;

    items.forEach(i => i.classList.remove("active"));
    const active = items[spotlightIndex];
    active.classList.add("active");

    // Scroll into view
    active.scrollIntoView({ block: "nearest" });
}

function activateSpotlightSelection() {
    const active = spotlightResults.querySelector(".spotlight-item.active");
    if (!active) return;

    const id = active.dataset.app;
    const app = VOX_APPS[id];

    if (app) {
        closeSpotlight();
        app.launch();
    }
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.initSpotlight = initSpotlight;
window.openSpotlight = openSpotlight;
window.closeSpotlight = closeSpotlight;
window.toggleSpotlight = toggleSpotlight;
