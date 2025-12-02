/* ======================================================
   Vox OS — Hex Dashboard Logic
   ====================================================== */

// Base path for API calls
const BASE_URL = "";

// ------------------------------------------------------
// Profile Photo Loader
// ------------------------------------------------------
async function loadProfilePhoto() {
    try {
        const res = await fetch(`/auth/validate`, {
            method: "GET",
            credentials: "include"
        });

        if (res.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        const data = await res.json();
        const user = data?.user;

        const img = document.getElementById("profilePhoto");
        if (img && user?.profile_photo) {
            img.src = user.profile_photo;
        }

    } catch (err) {
        console.error("Failed to load profile:", err);
    }
}

// ------------------------------------------------------
// Tile Navigation
// ------------------------------------------------------
function setupTileNavigation() {
    document.querySelectorAll(".hex-tile").forEach(tile => {
        const link = tile.getAttribute("data-link");

        if (link) {
            tile.addEventListener("click", () => {
                window.location.href = link;
            });
        }
    });
}

// ------------------------------------------------------
// Logout Handler
// ------------------------------------------------------
function setupLogout() {
    const logoutTile = document.getElementById("logoutTile");
    const logoutBtn = document.getElementById("logoutBtn");

    async function doLogout() {
        try {
            await fetch(`${BASE_URL}/auth/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (e) {
            console.warn("Logout error:", e);
        }
        window.location.href = "/login.html";
    }

    if (logoutTile) logoutTile.addEventListener("click", doLogout);
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
}

// ------------------------------------------------------
// Initialize Dashboard
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadProfilePhoto();
    setupTileNavigation();
    setupLogout();
});
