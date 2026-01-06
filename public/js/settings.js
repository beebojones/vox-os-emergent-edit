// ============================================
// Vox OS - Settings Page Logic
// Light/Dark Mode Toggle
// ============================================

import { enableDark, enableLight } from "./theme.js";

const toggle = document.getElementById("themeToggle");

// Default state: dark mode
toggle.checked = false;

// When user flips the switch
toggle.addEventListener("change", () => {
  if (toggle.checked) {
    enableLight();
  } else {
    enableDark();
  }
});
