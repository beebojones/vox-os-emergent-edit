/* ==========================================================
   VOX THEME ENGINE
   Applies: dark, light, and auto (system)
   Persists in localStorage
   Syncs system theme changes
   Applies class to HTML + BODY (bulletproof)
   ========================================================== */

/* Load theme BEFORE page renders */
(function initializeTheme() {
  const saved = localStorage.getItem("vox-theme") || "auto";
  applyTheme(saved);
})();

/* ----------------------------------------------------------
   Apply theme to HTML + BODY
   ---------------------------------------------------------- */
function applyTheme(mode) {
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove("light-mode", "dark-mode");
  body.classList.remove("light-mode", "dark-mode");

  if (mode === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const selected = prefersDark ? "dark" : "light";
    html.classList.add(`${selected}-mode`);
    body.classList.add(`${selected}-mode`);
  } else {
    html.classList.add(`${mode}-mode`);
    body.classList.add(`${mode}-mode`);
  }

  localStorage.setItem("vox-theme", mode);
}

/* ----------------------------------------------------------
   For Theme Settings UI to use
   ---------------------------------------------------------- */
window.voxSetTheme = function(mode) {
  applyTheme(mode);
};

/* ----------------------------------------------------------
   Sync with system theme when in auto mode
   ---------------------------------------------------------- */
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const saved = localStorage.getItem("vox-theme");
  if (saved === "auto") applyTheme("auto");
});

/* ----------------------------------------------------------
   Cross-page/theme propagation
   - Update theme when localStorage changes (other tabs/pages)
   - Re-apply on pageshow/visibilitychange to avoid stale theme
   ---------------------------------------------------------- */
window.addEventListener('storage', (e) => {
  if (e.key === 'vox-theme') {
    const mode = e.newValue || 'auto';
    applyTheme(mode);
  }
});
window.addEventListener('pageshow', () => {
  const saved = localStorage.getItem('vox-theme') || 'auto';
  applyTheme(saved);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const saved = localStorage.getItem('vox-theme') || 'auto';
    applyTheme(saved);
  }
});
