(function initVoxUserHeader(){
  try {
    // If page already has its own user menu, do not duplicate
    if (document.querySelector('.user-menu')) return;

    // Inject styles once
    if (!document.getElementById('voxUserPillStyle')){
      const s = document.createElement('style');
      s.id = 'voxUserPillStyle';
      s.textContent = `
/* ================================
   Hexagon Avatar (glowing)
   ================================ */
.vox-avatar-container{
  width:40px;
  height:34.6px; /* hex height = width * 0.866 */
  position:relative;
  cursor:pointer;
  flex-shrink:0;
}

#voxAvatarUpload{
  display:none;
}

.vox-avatar{
  width:40px;
  height:34.6px;
  clip-path: polygon(
    25% 0%,
    75% 0%,
    100% 50%,
    75% 100%,
    25% 100%,
    0% 50%
  );
  overflow:hidden;
  border:1px solid var(--border-soft);
  background:#111;
  position:relative;
  transition:transform .22s ease;
}

.vox-avatar:hover{
  transform:scale(1.06);
}

.vox-avatar::before{
  content:"";
  position:absolute;
  inset:0;
  padding:2px;
  background:linear-gradient(130deg, var(--cyan), var(--magenta), var(--purple));
  -webkit-mask: 
    linear-gradient(#000 0 0) content-box, 
    linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask-composite:exclude;
  opacity:0;
  transition:opacity .25s ease;
}

.vox-avatar:hover::before{
  opacity:1;
}

#voxAvatarImage{
  width:100%;
  height:100%;
  object-fit:cover;
  pointer-events:none;
}

/* Existing pill/dropdown styling */
.vox-user-pill{
  position:fixed;
  top:16px;
  right:16px;
  z-index:9999;
  display:flex;
  align-items:center;
  gap:12px;
  padding:8px 16px;
  border-radius:999px;
  color:#e8e4ff;
  background:
    linear-gradient(145deg, rgba(5,5,12,.9), rgba(15,15,28,.96)) padding-box,
    linear-gradient(120deg, var(--cyan), var(--magenta), var(--purple)) border-box;
  border:1px solid transparent;
  background-size:100% 100%,220% 220%;
  animation: voxBorderShift 14s linear infinite;
  box-shadow: 0 0 18px rgba(154,77,255,.25),
              0 0 12px rgba(0,246,255,.18);
  backdrop-filter:blur(12px);
  cursor:pointer;
}

.vox-user-dropdown{
  position:fixed;
  top:58px;
  right:16px;
  z-index:9999;
  display:none;
  flex-direction:column;
  width:220px;
  border-radius:14px;
  overflow:hidden;
  background:linear-gradient(145deg, rgba(5,5,12,.95), rgba(12,12,22,.98));
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:0 12px 40px rgba(0,0,0,.5), 0 0 22px rgba(154,77,255,.22);
  backdrop-filter:blur(18px);
}

.vox-user-dropdown a,
.vox-user-dropdown button{
  appearance:none;
  border:none;
  background:transparent;
  color:#e8e4ff;
  text-align:left;
  padding:12px 14px;
  cursor:pointer;
  font:inherit;
}

.vox-user-dropdown a:hover,
.vox-user-dropdown button:hover{
  background:rgba(255,255,255,0.10);
  box-shadow: inset 0 0 0 9999px rgba(0,0,0,.02);
}

.badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:2px 8px;
  font-size:12px;
  letter-spacing:.08em;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.22);
  background:rgba(255,255,255,0.12);
}

.badge-admin{
  color:#00f6ff;
  border-color:rgba(0,246,255,0.45);
  background:rgba(0,246,255,0.12);
  box-shadow:0 0 8px rgba(0,246,255,0.35);
}
      `;
      document.head.appendChild(s);
    }

    // === Fetch user ===
    async function fetchUser(){
      try{
        const res = await fetch('/auth/validate');
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || null;
      } catch { return null; }
    }

    // === Dropdown toggle ===
    function toggleDropdown(){
      const dd = document.getElementById('voxUserDropdown');
      if (!dd) return;
      dd.style.display = dd.style.display === 'flex' ? 'none' : 'flex';
    }

    function closeOnOutsideClick(e){
      const pill = document.getElementById('voxUserPill');
      const dd = document.getElementById('voxUserDropdown');
      if (!pill || !dd) return;
      if (!pill.contains(e.target) && !dd.contains(e.target)){
        dd.style.display = 'none';
      }
    }

    // === Avatar Persistence ===
    function loadSavedAvatar(){
      const saved = localStorage.getItem("voxAvatar");
      if (saved){
        const img = document.getElementById("voxAvatarImage");
        if (img) img.src = saved;
      }
    }

    function setupAvatarUpload(){
      const input = document.getElementById("voxAvatarUpload");
      const img = document.getElementById("voxAvatarImage");

      if (!input || !img) return;

      input.addEventListener("change", function(){
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target.result;
          img.src = dataUrl;
          localStorage.setItem("voxAvatar", dataUrl);
        };
        reader.readAsDataURL(file);
      });
    }

    // === Build UI ===
    function buildUI(user){
      // =============================
      // Build User Pill with Avatar
      // =============================
      if (!document.getElementById('voxUserPill')){
        const pill = document.createElement('div');
        pill.id = 'voxUserPill';
        pill.className = 'vox-user-pill';

        pill.innerHTML = `
          <div class="vox-avatar-container" id="voxAvatarClick">
            <label for="voxAvatarUpload" class="vox-avatar">
              <img id="voxAvatarImage" src="/images/default-avatar.png" alt="Avatar">
            </label>
            <input type="file" id="voxAvatarUpload" accept="image/*">
          </div>

          <span id="voxUserName">
            ${(user.display_name||user.displayName||user.name||user.full_name||user.fullName||user.nickname||user.username||'User')}
          </span>

          <span id="voxAdminBadge" class="badge badge-admin" style="display:${(user.role==='admin')?'inline-flex':'none'}">
            ADMIN
          </span>

          <span aria-hidden="true">▼</span>
        `;

        pill.addEventListener('click', function(e){
          // Prevent avatar click from blocking dropdown
          if (e.target.id === "voxAvatarImage" ||
              e.target.id === "voxAvatarUpload" ||
              e.target.closest(".vox-avatar-container")){
            return;
          }
          toggleDropdown();
        });

        document.body.appendChild(pill);
      }

      // =============================
      // Build Dropdown
      // =============================
      if (!document.getElementById('voxUserDropdown')){
        const dd = document.createElement('div');
        dd.id = 'voxUserDropdown';
        dd.className = 'vox-user-dropdown';

        dd.innerHTML = `
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
        `;

        document.body.appendChild(dd);

        document.getElementById('voxLogoutBtn').onclick = async () => {
          try { await fetch('/auth/logout', { method:'POST' }); } catch {}
          window.location.href = '/login.html';
        };

        window.addEventListener('click', closeOnOutsideClick);
      }

      // Load saved avatar + setup upload
      loadSavedAvatar();
      setupAvatarUpload();
    }

    // Run
    (async () => {
      const user = await fetchUser();
      if (!user) return;
      buildUI(user);
    })();

  } catch {}
})();
