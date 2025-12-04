/* user.js — Global header loader + user state */

async function loadHeader() {
    try {
        const headerHtml = await fetch("header.html").then(r => r.text());
        const mount = document.createElement("div");
        mount.innerHTML = headerHtml;
        document.body.prepend(mount);

        initializeHeader();
    } catch (e) {
        console.error("Failed to load header:", e);
    }
}

async function initializeHeader() {
    const pill = document.getElementById("vos-user-pill");
    const dropdown = document.getElementById("vos-dropdown");
    const avatar = document.getElementById("vos-avatar");
    const displayName = document.getElementById("vos-user-display");

    // Fetch user info
    const res = await fetch("/auth/validate", { credentials: "include" });
    const data = await res.json();

    if (!data.user) return;

    displayName.textContent = data.user.displayName || data.user.username;

    if (data.user.avatarDataUrl) {
        avatar.src = data.user.avatarDataUrl;
    } else {
        avatar.src = "img/avatar-default.png";
    }

    // Clicking avatar goes to profile
    document.getElementById("vos-avatar-wrapper").onclick = () => {
        window.location.href = "profile.html";
    };

    // Dropdown toggle
    pill.addEventListener("click", () => {
        dropdown.classList.toggle("visible");
    });

    document.addEventListener("click", (e) => {
        if (!pill.contains(e.target)) dropdown.classList.remove("visible");
    });

    // Logout
    document.getElementById("logout-link").onclick = async () => {
        await fetch("/auth/logout", { method: "POST", credentials: "include" });
        window.location.href = "login.html";
    };
}

// Load the header as soon as possible
document.addEventListener("DOMContentLoaded", loadHeader);
