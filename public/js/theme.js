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
   Apply theme to HTML + BODY (works even if body not yet parsed)
   ---------------------------------------------------------- */
function applyTheme(mode) {
  const html = document.documentElement;

  // Always update <html> immediately
  html.classList.remove("light-mode", "dark-mode");

  const setOnBody = () => {
    const body = document.body;
    if (!body) return; // body might still not be ready in rare cases
    body.classList.remove("light-mode", "dark-mode");
  };

  // Compute selection
  let selectedMode = mode;
  if (mode === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    selectedMode = prefersDark ? "dark" : "light";
  }

  html.classList.add(`${selectedMode}-mode`);

  // Apply to body now or when it becomes available
  if (document.body) {
    setOnBody();
    document.body.classList.add(`${selectedMode}-mode`);
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        setOnBody();
        if (document.body) document.body.classList.add(`${selectedMode}-mode`);
      },
      { once: true }
    );
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
