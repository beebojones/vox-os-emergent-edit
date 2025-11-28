/* ---------------------------------------------------
   Vox OS – Theme Engine
   Package 6 (FULL FILE)
--------------------------------------------------- */

const root = document.documentElement;

/* Local storage keys */
const LS_THEME = "vox_theme";
const LS_ACCENT = "vox_accent";
const LS_WALLPAPER = "vox_wallpaper";
const LS_BLUR = "vox_wallpaper_blur";
const LS_BRIGHT = "vox_wallpaper_brightness";

/* Inputs (added in desktop.html) */
const brightnessSlider = document.getElementById("wallpaper-brightness-slider");
const blurSlider = document.getElementById("wallpaper-blur-slider");
const accentPicker = document.getElementById("accent-picker");
const wallpaperFile = document.getElementById("wallpaper-file");

/* ---------------------------------------------------
   PERSISTENCE HELPERS
--------------------------------------------------- */

function save(key, value) {
    localStorage.setItem(key, value);
}

function load(key, fallback) {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
}

/* ---------------------------------------------------
   THEME MODE
--------------------------------------------------- */

function applyTheme(name) {
    root.className = name; // switch entire theme
    save(LS_THEME, name);
}

/* Simple toggle for Quick Panel button */
function toggleTheme() {
    const current = root.className;

    const sequence = ["dark", "light", "amoled", "synthwave"];
    const index = sequence.indexOf(current);
    const next = index === -1 ? "light" : sequence[(index + 1) % sequence.length];

    applyTheme(next);

    notify("Theme Changed", `Switched to ${next} theme.`, {
        priority: "normal"
    });
}

/* ---------------------------------------------------
   ACCENT COLOR
--------------------------------------------------- */

function applyAccentColor(color) {
    root.style.setProperty("--accent-color", color);
    root.style.setProperty("--accent-glow", color + "80"); // auto glow with opacity

    save(LS_ACCENT, color);
}

/* ---------------------------------------------------
   WALLPAPER
--------------------------------------------------- */

function setWallpaper(url) {
    root.style.setProperty("--wallpaper-image", `url("${url}")`);
    save(LS_WALLPAPER, url);
}

/* ---------------------------------------------------
   BLUR / BRIGHTNESS
--------------------------------------------------- */

function setWallpaperBlur(px) {
    root.style.setProperty("--wallpaper-blur", `${px}px`);
    save(LS_BLUR, px);
}

function setWallpaperBrightness(val) {
    root.style.setProperty("--wallpaper-brightness", val);
    save(LS_BRIGHT, val);
}

/* ---------------------------------------------------
   WALLPAPER UPLOAD HANDLER
--------------------------------------------------- */

if (wallpaperFile) {
    wallpaperFile.addEventListener("change", () => {
        const file = wallpaperFile.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const url = e.target.result;
            setWallpaper(url);

            notify("Wallpaper Updated", "Your new wallpaper is now active.", {
                image: url,
                priority: "normal"
            });
        };

        reader.readAsDataURL(file);
    });
}

/* ---------------------------------------------------
   SLIDER HANDLERS
--------------------------------------------------- */

if (brightnessSlider) {
    brightnessSlider.addEventListener("input", () => {
        setWallpaperBrightness(brightnessSlider.value);
    });
}

if (blurSlider) {
    blurSlider.addEventListener("input", () => {
        setWallpaperBlur(blurSlider.value);
    });
}

/* ---------------------------------------------------
   ACCENT COLOR HANDLER
--------------------------------------------------- */

if (accentPicker) {
    accentPicker.addEventListener("input", () => {
        applyAccentColor(accentPicker.value);
    });
}

/* ---------------------------------------------------
   INITIAL LOAD ON STARTUP
--------------------------------------------------- */

function initThemeEngine() {
    /* Theme mode */
    const savedTheme = load(LS_THEME, "dark");
    applyTheme(savedTheme);

    /* Accent */
    const savedAccent = load(LS_ACCENT, "#4f8bff");
    applyAccentColor(savedAccent);
    if (accentPicker) accentPicker.value = savedAccent;

    /* Wallpaper */
    const savedWallpaper = load(LS_WALLPAPER, "wallpapers/default.jpg");
    setWallpaper(savedWallpaper);

    /* Blur */
    const savedBlur = Number(load(LS_BLUR, "0"));
    setWallpaperBlur(savedBlur);
    if (blurSlider) blurSlider.value = savedBlur;

    /* Brightness */
    const savedBright = Number(load(LS_BRIGHT, "1"));
    setWallpaperBrightness(savedBright);
    if (brightnessSlider) brightnessSlider.value = savedBright;
}

/* ---------------------------------------------------
   EXPORTS
--------------------------------------------------- */

window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.applyAccentColor = applyAccentColor;
window.setWallpaper = setWallpaper;

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */

document.addEventListener("DOMContentLoaded", initThemeEngine);
