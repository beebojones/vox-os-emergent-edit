import { openApp } from "./windowManager.js";

const launchpad = document.getElementById("vox-launchpad");
const launchBtn = document.getElementById("vox-launcher-btn");

// ----------------------------------------------------
// APP DEFINITIONS (only include existing pages)
// ----------------------------------------------------
const apps = [
  {
    id: "memory-inspector",
    label: "Memory Inspector",
    url: "os/apps/memory-inspector.html",
  },
];

// ----------------------------------------------------
// BUILD LAUNCHPAD GRID
// ----------------------------------------------------
function buildGrid() {
  apps.forEach((app) => {
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

// Open launchpad on first load (helps new users on blank desktop)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    launchpad.classList.remove('hidden');
    launchpad.classList.add('visible');
  }, { once: true });
} else {
  launchpad.classList.remove('hidden');
  launchpad.classList.add('visible');
}

// ----------------------------------------------------
// OPEN / CLOSE LAUNCHPAD
// ----------------------------------------------------
launchBtn.addEventListener("click", () => {
  launchpad.classList.remove('hidden');
  launchpad.classList.add("visible");
});

launchpad.addEventListener("click", (e) => {
  if (e.target === launchpad) {
    closeLaunchpad();
  }
});

function closeLaunchpad() {
  launchpad.classList.remove("visible");
  launchpad.classList.add('hidden');
}
