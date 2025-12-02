// =====================================================
// Vox OS Window Manager
// =====================================================

let voxDesktop = document.getElementById('vox-desktop');
let windowZ = 10;

// Ensure desktop reference regardless of when the module executes
function ensureDesktop() {
  if (!voxDesktop) {
    voxDesktop = document.getElementById('vox-desktop');
  }
  if (!voxDesktop) {
    console.warn('Vox OS: #vox-desktop not found');
  }
  // Hide boot overlay when desktop is ready
  if (voxDesktop) {
    const boot = document.getElementById('boot-status');
    if (boot) boot.style.display = 'none';
  }
  return !!voxDesktop;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureDesktop, { once: true });
} else {
  ensureDesktop();
}

// =====================================================
// API: openApp(appId, appUrl, title)
// =====================================================
export function openApp(appId, appUrl, title = 'Vox App') {
  if (!ensureDesktop()) return console.error('Vox OS: Desktop not initialized');

  // Unique window
  const winId = `vox-window-${Date.now()}-${Math.floor(Math.random() * 99999)}`;

  const win = document.createElement('div');
  win.classList.add('vox-window');
  win.setAttribute('data-app-id', appId);
  win.id = winId;

  // =====================================================
  // Window HTML
  // =====================================================
  win.innerHTML = `
        <div class="vox-window-titlebar">
            <span class="vox-window-title">${title}</span>
            <div class="vox-window-controls">
                <button class="vox-btn-min">–</button>
                <button class="vox-btn-max">□</button>
                <button class="vox-btn-close">×</button>
            </div>
        </div>
        <iframe class="vox-window-content" src="${appUrl}"></iframe>
    `;

  // Position
  win.style.top = `${70 + Math.random() * 50}px`;
  win.style.left = `${70 + Math.random() * 50}px`;
  win.style.zIndex = windowZ++;

  // Add to desktop
  voxDesktop.appendChild(win);

  // Attach behaviors
  attachDrag(win);
  attachControls(win);

  return win;
}

// =====================================================
// Window Dragging
// =====================================================
function attachDrag(win) {
  const bar = win.querySelector('.vox-window-titlebar');
  let offsetX = 0,
    offsetY = 0;
  let dragging = false;

  bar.addEventListener('mousedown', (e) => {
    dragging = true;
    win.style.zIndex = ++windowZ;
    offsetX = e.clientX - win.getBoundingClientRect().left;
    offsetY = e.clientY - win.getBoundingClientRect().top;
    win.classList.add('dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;

    win.style.left = `${e.clientX - offsetX}px`;
    win.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    win.classList.remove('dragging');
  });
}

// =====================================================
// Window Controls
// =====================================================
function attachControls(win) {
  const btnMin = win.querySelector('.vox-btn-min');
  const btnMax = win.querySelector('.vox-btn-max');
  const btnClose = win.querySelector('.vox-btn-close');
  const content = win.querySelector('.vox-window-content');

  let maximized = false;
  let prevPos = null;

  // Minimize
  btnMin.addEventListener('click', () => {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });

  // Maximize / Restore
  btnMax.addEventListener('click', () => {
    if (!maximized) {
      prevPos = {
        top: win.style.top,
        left: win.style.left,
        width: win.style.width,
        height: win.style.height,
      };
      win.style.top = '0';
      win.style.left = '0';
      win.style.width = '100%';
      win.style.height = '100%';
      maximized = true;
    } else {
      win.style.top = prevPos.top;
      win.style.left = prevPos.left;
      win.style.width = prevPos.width || '600px';
      win.style.height = prevPos.height || '400px';
      maximized = false;
    }
  });

  // Close
  btnClose.addEventListener('click', () => {
    win.remove();
  });
}
