// ============================================
// Vox OS – Simple Theme Engine (Light + Dark)
// Dark mode is the default
// ============================================

const root = document.documentElement;

// Switch theme by name
export function setTheme(themeName) {
  if (themeName !== "light" && themeName !== "dark") return;
  root.setAttribute("data-theme", themeName);
}

// Optional helper functions
export function enableDark() {
  setTheme("dark");
}

export function enableLight() {
  setTheme("light");
}

// Start in dark mode automatically
enableDark();
