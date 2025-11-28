/* ---------------------------------------------------
   Vox OS – Taskbar Integration
   Package 11 (FULL FILE)
--------------------------------------------------- */

const taskbarApps = {};  // Maps app ID → taskbar button element

/* ---------------------------------------------------
   ADD OR GET TASKBAR BUTTON
--------------------------------------------------- */

function ensureTaskbarButton(id, title, icon) {
    if (taskbarApps[id]) return taskbarApps[id];

    const btn = document.createElement("div");
    btn.className = "taskbar-app";

    btn.innerHTML = `
        <img src="${icon}" class="taskbar-app-icon">
        <span class="taskbar-app-label">${title}</span>
    `;

    btn.dataset.app = id;
    document.getElementById("taskbar-apps").appendChild(btn);
    taskbarApps[id] = btn;

    btn.onclick = () => handleTaskbarClick(id);

    return btn;
}

/* ---------------------------------------------------
   WHEN USER CLICKS TASKBAR APP
--------------------------------------------------- */

function handleTaskbarClick(id) {
    const win = document.getElementById("window-" + id);
    const btn = taskbarApps[id];

    // Window exists but minimized → restore
    if (win && win.style.display === "none") {
        restoreWindow(id);
        focusWindow(win);
        playRestoreBounce(win);
        highlightTaskbarBtn(btn);
        return;
    }

    // Window exists and is focused → minimize
    if (win && win.classList.contains("active")) {
        minimizeWindow(id, win);
        highlightTaskbarBtn(btn, false);
        return;
    }

    // Window exists but is behind others → bring to front
    if (win) {
        restoreWindow(id);
        focusWindow(win);
        highlightTaskbarBtn(btn);
        return;
    }

    // Window does not exist at all → reopen
    if (window.launchAppById) {
        window.launchAppById(id);
        highlightTaskbarBtn(btn);
    }
}

/* ---------------------------------------------------
   TASKBAR BUTTON HIGHLIGHT
--------------------------------------------------- */

function highlightTaskbarBtn(btn, active = true) {
    document.querySelectorAll(".taskbar-app").forEach(b => {
        b.classList.remove("active");
    });

    if (active) btn.classList.add("active");
}

/* ---------------------------------------------------
   MINIMIZE WINDOW
--------------------------------------------------- */

window.minimizeWindow = function(id, win) {
    if (!win) win = document.getElementById("window-" + id);
    if (!win) return;

    win.classList.add("minimizing");

    setTimeout(() => {
        win.classList.remove("minimizing");
        win.style.display = "none";
    }, 180);

    windowStates[id] = windowStates[id] || {};
    windowStates[id].minimized = true;

    const btn = taskbarApps[id];
    if (btn) highlightTaskbarBtn(btn, false);
};

/* ---------------------------------------------------
   RESTORE WINDOW
--------------------------------------------------- */

window.restoreWindow = function(id) {
    const win = document.getElementById("window-" + id);
    if (!win) return;

    win.style.display = "flex";
    win.classList.add("restore-anim");

    setTimeout(() => {
        win.classList.remove("restore-anim");
    }, 220);

    windowStates[id] = windowStates[id] || {};
    windowStates[id].minimized = false;
};

/* ---------------------------------------------------
   RESTORE BOUNCE
--------------------------------------------------- */

function playRestoreBounce(win) {
    win.classList.add("restore-anim");
    setTimeout(() => win.classList.remove("restore-anim"), 220);
}

/* ---------------------------------------------------
   ON WINDOW OPEN
--------------------------------------------------- */

window.openWindow = (function(original) {
    return function(id, title, content, icon = "icons/app.png") {
        const win = original(id, title, content, icon);
        ensureTaskbarButton(id, title, icon);
        highlightTaskbarBtn(taskbarApps[id]);
        return win;
    };
})(window.openWindow);

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.ensureTaskbarButton = ensureTaskbarButton;
window.highlightTaskbarBtn = highlightTaskbarBtn;
window.handleTaskbarClick = handleTaskbarClick;
