/* ---------------------------------------------------
   Vox OS – Application Launcher Logic
   Package 12 (FULL FILE)
--------------------------------------------------- */

let launcherOpen = false;
let launcherEl = null;
let launcherSearch = null;
let launcherCategories = null;
let launcherContent = null;

/* ---------------------------------------------------
   INITIALIZE LAUNCHER
--------------------------------------------------- */

function initLauncher() {
    launcherEl = document.getElementById("launcher");
    launcherSearch = document.getElementById("launcher-search");
    launcherCategories = document.getElementById("launcher-categories");
    launcherContent = document.getElementById("launcher-content");

    if (!launcherEl) {
        console.error("Launcher container not found");
        return;
    }

    // Search typing
    launcherSearch.addEventListener("input", () => {
        const q = launcherSearch.value.trim();
        if (q.length === 0) {
            // Reset to selected category
            const active = launcherCategories.querySelector(".active");
            if (active) renderLauncherApps(active.dataset.category);
        } else {
            renderLauncherSearch(q);
        }
    });

    // ESC closes launcher
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && launcherOpen) {
            closeLauncher();
        }
    });

    // Clicking outside closes launcher
    document.addEventListener("mousedown", (e) => {
        if (!launcherOpen) return;
        if (!launcherEl.contains(e.target)) {
            closeLauncher();
        }
    });

    buildLauncherCategories();
}

/* ---------------------------------------------------
   OPEN / CLOSE
--------------------------------------------------- */

function openLauncher() {
    launcherEl.style.display = "block";
    launcherOpen = true;

    launcherSearch.value = "";
    launcherSearch.focus();

    // Default to "All"
    highlightLauncherCategory("All");
    renderLauncherApps("All");
}

function closeLauncher() {
    launcherEl.style.display = "none";
    launcherOpen = false;
}

/* ---------------------------------------------------
   CATEGORIES
--------------------------------------------------- */

function buildLauncherCategories() {
    launcherCategories.innerHTML = "";

    const cats = ["All", ...new Set(listAllApps().map(a => a.category || "Other"))];

    cats.forEach((cat) => {
        const div = document.createElement("div");
        div.className = "launcher-category";
        div.textContent = cat;
        div.dataset.category = cat;

        div.onclick = () => {
            highlightLauncherCategory(cat);
            renderLauncherApps(cat);
        };

        launcherCategories.appendChild(div);
    });
}

function highlightLauncherCategory(cat) {
    launcherCategories.querySelectorAll(".launcher-category")
        .forEach(c => c.classList.remove("active"));

    const el = launcherCategories.querySelector(`[data-category="${cat}"]`);
    if (el) el.classList.add("active");
}

/* ---------------------------------------------------
   RENDER APPS FOR A CATEGORY
--------------------------------------------------- */

function renderLauncherApps(cat) {
    launcherContent.innerHTML = "";

    let apps;

    if (cat === "All") {
        apps = listAllApps();
    } else {
        apps = listAppsByCategory(cat);
    }

    apps.forEach(app => {
        const div = document.createElement("div");
        div.className = "launcher-app";

        div.innerHTML = `
            <img class="launcher-app-icon" src="${app.icon}">
            <div class="launcher-app-label">${app.name}</div>
        `;

        div.onclick = () => {
            closeLauncher();
            app.launch();
        };

        launcherContent.appendChild(div);
    });
}

/* ---------------------------------------------------
   RENDER SEARCH RESULTS
--------------------------------------------------- */

function renderLauncherSearch(query) {
    launcherContent.innerHTML = "";

    const results = searchApps(query);

    if (results.length === 0) {
        launcherContent.innerHTML = `<div style="opacity:0.6; padding:20px; font-size:14px;">
            No apps match "${query}"
        </div>`;
        return;
    }

    results.forEach(app => {
        const div = document.createElement("div");
        div.className = "launcher-app";

        div.innerHTML = `
            <img class="launcher-app-icon" src="${app.icon}">
            <div class="launcher-app-label">${app.name}</div>
        `;

        div.onclick = () => {
            closeLauncher();
            app.launch();
        };

        launcherContent.appendChild(div);
    });
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.initLauncher = initLauncher;
window.openLauncher = openLauncher;
window.closeLauncher = closeLauncher;
