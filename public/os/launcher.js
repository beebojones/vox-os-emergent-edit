import { openApp } from "./windowManager.js";

const launchpad = document.getElementById("vox-launchpad");
const launchBtn = document.getElementById("vox-launcher-btn");

// ----------------------------------------------------
// APP DEFINITIONS
// ----------------------------------------------------
const apps = [
    {
        id: "memory-inspector",
        label: "Memory Inspector",
        url: "/os/apps/memory-inspector.html"
    },
    {
        id: "persona-builder",
        label: "Persona Builder",
        url: "/os/apps/persona-builder.html"
    },
    {
        id: "memory-debugger",
        label: "Memory Debugger",
        url: "/os/apps/memory-debugger.html"
    },
    {
        id: "admin-panel",
        label: "Admin Panel",
        url: "/os/apps/admin-panel.html"
    }
];

// ----------------------------------------------------
// BUILD LAUNCHPAD GRID
// ----------------------------------------------------
function buildGrid() {
    apps.forEach(app => {
        const hex = document.createElement("div");
        hex.className = "vox-app-hex";
        hex.onclick = () => {
            closeLaunchpad();
            openApp(app.id, app.url, app.label);
        };

        const label = document.createElement("div");
        label.className = "vox-app-label";
        label.textContent = app.label;

        hex.appendChild(label);
        launchpad.appendChild(hex);
    });
}

buildGrid();

// ----------------------------------------------------
// OPEN / CLOSE LAUNCHPAD
// ----------------------------------------------------
launchBtn.addEventListener("click", () => {
    launchpad.classList.add("visible");
});

launchpad.addEventListener("click", (e) => {
    if (e.target === launchpad) {
        closeLaunchpad();
    }
});

function closeLaunchpad() {
    launchpad.classList.remove("visible");
}
