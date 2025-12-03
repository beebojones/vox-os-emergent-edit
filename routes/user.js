// user.js — Global header controller for Vox OS
document.addEventListener("DOMContentLoaded", async () => {
    const pill = document.getElementById("vox-user-pill");
    const dropdown = document.getElementById("vox-dropdown");
    const displayNameEl = document.getElementById("vox-displayname");
    const avatarWrap = document.getElementById("vox-avatar-wrap");
    const avatarHex = document.getElementById("vox-avatar-hex");
    const logoutLink = document.getElementById("logoutLink");

    // If the header doesn't exist on a page, stop.
    if (!pill || !dropdown || !displayNameEl || !avatarWrap || !avatarHex) {
        console.warn("Vox header not found on this page.");
        return;
    }

    // -----------------------------------------
    // FETCH CURRENT USER
    // -----------------------------------------
    let user = null;
    try {
        const res = await fetch("/auth/validate", {
            credentials: "include"
        });

        if (res.ok) {
            const data = await res.json();
            user = data.user;
        }
    } catch (err) {
        console.error("Auth validation failed:", err);
    }

    // If not authenticated → login.html
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // -----------------------------------------
    // POPULATE DISPLAY NAME
    // -----------------------------------------
    displayNameEl.textContent = user.displayName || user.username;

    // -----------------------------------------
    // LOAD AVATAR INTO HEXAGON
    // -----------------------------------------
    if (user.avatarDataUrl) {
        const img = document.createElement("img");
        img.src = user.avatarDataUrl;
        img.alt = "User Avatar";

        // Clear existing content and insert image
        avatarHex.innerHTML = "";
        avatarHex.appendChild(img);
    } else {
        // Default empty hex stays glowing
        avatarHex.innerHTML = "";
    }

    // -----------------------------------------
    // AVATAR CLICK → PROFILE PAGE
    // -----------------------------------------
    avatarWrap.addEventListener("click", () => {
        window.location.href = "profile.html";
    });

    // -----------------------------------------
    // USER PILL TOGGLE DROPDOWN
    // -----------------------------------------
    pill.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
    });

    // Close dropdown on outside click
    document.addEventListener("click", () => {
        dropdown.classList.add("hidden");
    });

    // Prevent dropdown from closing when clicking inside it
    dropdown.addEventListener("click", (e) => e.stopPropagation());

    // -----------------------------------------
    // LOGOUT
    // -----------------------------------------
    if (logoutLink) {
        logoutLink.addEventListener("click", async (e) => {
            e.preventDefault();

            try {
                await fetch("/auth/logout", {
                    method: "POST",
                    credentials: "include"
                });
            } catch (err) {
                console.error("Logout error:", err);
            }

            window.location.href = "login.html";
        });
    }
});
