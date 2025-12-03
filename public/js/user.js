// ========================================================================
//   V O S   O S   —   GLOBAL USER + HEADER HANDLER
// ========================================================================
// Injects the global header into every page.
// Pulls user info from /auth/validate.
// Displays hex avatar + display name + dropdown.
// Syncs theme mode.
// ========================================================================


// --------------------------------------------
// Fetch the authenticated user
// --------------------------------------------
async function voxFetchUser() {
    try {
        const res = await fetch("/auth/validate", {
            method: "GET",
            credentials: "include"
        });
        const data = await res.json();
        return data.user || null;
    } catch (err) {
        console.error("validate failed:", err);
        return null;
    }
}


// --------------------------------------------
// Build the global header HTML
// --------------------------------------------
function buildHeaderHTML(user) {
    const avatar = user?.avatarDataUrl || "";
    const displayName = user?.displayName || "User";

    return `
    <header class="vox-header">
        <!-- Left: Logo -->
        <div class="vox-logo">Vos OS</div>

        <!-- Right: User Area -->
        <div class="vox-user-area" id="voxUserArea">
            <div class="vox-display-name">${displayName}</div>
            <div class="vox-dropdown-arrow">▼</div>

            <div class="vox-avatar-hex">
                ${avatar
                    ? `<img class="vox-avatar-img" src="${avatar}" alt="avatar">`
                    : `<img class="vox-avatar-img" src="/img/default-avatar.png" alt="avatar">`
                }
            </div>

            <!-- Dropdown -->
            <div class="vox-dropdown" id="voxDropdown">
                <div class="vox-dropdown-item" data-nav="/profile.html">Profile</div>
                <div class="vox-dropdown-item" data-nav="/account-settings.html">Account Settings</div>
                <div class="vox-dropdown-item" data-nav="/settings.html">Settings</div>
                <div class="vox-dropdown-item" data-nav="/notifications.html">Notifications</div>
                <div class="vox-dropdown-item" data-nav="/memory.html">Memory Console</div>
                <div class="vox-dropdown-item" data-nav="/dashboard.html">Dashboard</div>
                <div class="vox-dropdown-item" data-nav="/logout">Logout</div>
            </div>
        </div>
    </header>
    `;
}


// --------------------------------------------
// Inject header into the page
// --------------------------------------------
function injectHeader(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.prepend(wrap.firstElementChild);
}


// --------------------------------------------
// Dropdown toggle logic
// --------------------------------------------
function initDropdown() {
    const userArea = document.getElementById("voxUserArea");
    const menu = document.getElementById("voxDropdown");

    if (!userArea || !menu) return;

    let open = false;

    userArea.addEventListener("click", () => {
        open = !open;
        menu.style.display = open ? "block" : "none";
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!userArea.contains(e.target)) {
            menu.style.display = "none";
            open = false;
        }
    });

    // Navigation from dropdown
    menu.querySelectorAll(".vox-dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
            const nav = item.getAttribute("data-nav");
            if (nav === "/logout") {
                // Logout = destroy session cookie
                fetch("/auth/logout", { method: "POST", credentials: "include" })
                    .finally(() => window.location.href = "/login.html");
            } else {
                window.location.href = nav;
            }
        });
    });
}


// --------------------------------------------
// Theme Sync
// --------------------------------------------
function applyTheme(mode) {
    if (!mode) mode = "dark";  // default

    if (mode === "light") {
        document.body.classList.remove("vox-dark");
        document.body.classList.add("vox-light");
    } else {
        document.body.classList.remove("vox-light");
        document.body.classList.add("vox-dark");
    }
}


// --------------------------------------------
// Load user + initialize header
// --------------------------------------------
(async function initUserHeader() {
    const user = await voxFetchUser();

    // If not logged in → skip header
    if (!user) return;

    // Inject header
    const html = buildHeaderHTML(user);
    injectHeader(html);

    // Initialize dropdown
    initDropdown();

    // Apply theme (from preferences if available)
    const prefs = user.preferences || {};
    applyTheme(prefs.themeMode || "dark");
})();
