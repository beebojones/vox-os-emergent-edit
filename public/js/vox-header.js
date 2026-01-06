// =============================================
// Vox OS - Persistent System Header
// Top-left: Vox OS
// Top-right: Avatar + Username + Dropdown
// Adds body top padding automatically
// =============================================

(async function initVoxHeader() {
  try {
    const res = await fetch('/auth/validate');
    if (!res.ok) return;
    const data = await res.json();
    const user = data.user;
    if (!user) return;

    injectHeader(user);
    loadSavedAvatar();
    setupAvatarUpload();
    setupDropdown();
    addPagePadding();

  } catch (err) {
    console.error("Header init failed", err);
  }
})();

function injectHeader(user) {
  if (document.getElementById("voxHeader")) return;

  const hdr = document.createElement("header");
  hdr.id = "voxHeader";

  hdr.innerHTML = `
    <div id="voxBrand">Vox OS</div>

    <div id="voxUserArea">

      <div class="vox-avatar-container">
        <label for="voxAvatarUpload" class="vox-avatar">
          <img id="voxAvatarImage" src="/images/default-avatar.png">
        </label>
        <input type="file" id="voxAvatarUpload" accept="image/*">
      </div>

      <span id="voxUserName">${
        user.display_name ||
        user.displayName ||
        user.name ||
        user.full_name ||
        user.fullName ||
        user.nickname ||
        user.username ||
        "User"
      }</span>

      <span id="voxAdminBadge"
            class="badge badge-admin"
            style="display:${user.role === "admin" ? "inline-flex" : "none"}">
        ADMIN
      </span>

      <span id="voxDropdownArrow" style="color:#e8e4ff; cursor:pointer;">▼</span>
    </div>

    <div id="voxUserDropdown">
      <a href="/index.html">Home</a>
      <a href="/chat.html">Chat</a>
      <a href="/chat-history.html">Chat History</a>
      <a href="/memory.html">Memory Console</a>
      <a href="/notifications.html">Notifications</a>
      <a href="/tools.html">Developer Tools</a>
      <a href="/help.html">Help</a>
      <a href="/support.html">Support</a>
      <a href="/profile.html">Profile</a>
      <a href="/account-settings.html">Account Settings</a>
      <button id="voxLogoutBtn">Logout</button>
    </div>
  `;

  document.body.appendChild(hdr);

  document.getElementById("voxLogoutBtn").onclick = async () => {
    try { await fetch("/auth/logout", { method: "POST" }); } catch {}
    window.location.href = "/login.html";
  };
}

function loadSavedAvatar() {
  const saved = localStorage.getItem("voxAvatar");
  if (saved) {
    const img = document.getElementById("voxAvatarImage");
    if (img) img.src = saved;
  }
}

function setupAvatarUpload() {
  const input = document.getElementById("voxAvatarUpload");
  const img = document.getElementById("voxAvatarImage");

  if (!input || !img) return;

  input.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      img.src = dataUrl;
      localStorage.setItem("voxAvatar", dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function setupDropdown() {
  const arrow = document.getElementById("voxDropdownArrow");
  const dropdown = document.getElementById("voxUserDropdown");

  arrow.onclick = (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  };

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== arrow) {
      dropdown.style.display = "none";
    }
  });
}

function addPagePadding() {
  document.body.style.paddingTop = "90px";
}
