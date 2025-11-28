/* ---------------------------------------------------
   Vox OS – Window Snap Engine
   Package 11 (FULL FILE)
--------------------------------------------------- */

let snapGhost = null;
let snapTarget = null;

function ensureSnapGhost() {
    if (!snapGhost) {
        snapGhost = document.createElement("div");
        snapGhost.className = "snap-ghost";
        document.body.appendChild(snapGhost);
    }
}

/* ---------------------------------------------------
   DURING DRAG: Show snap preview
--------------------------------------------------- */

function handleSnapDrag(win, x, y) {
    ensureSnapGhost();

    const w = window.innerWidth;
    const h = window.innerHeight;

    const edgeSize = 60;

    snapTarget = null;

    if (x <= edgeSize) {
        snapTarget = "left";
        showSnapGhost(0, 0, w / 2, h);
    } 
    else if (x >= w - edgeSize) {
        snapTarget = "right";
        showSnapGhost(w / 2, 0, w / 2, h);
    } 
    else if (y <= edgeSize) {
        snapTarget = "top";
        showSnapGhost(0, 0, w, h);
    } 
    else if (y >= h - edgeSize) {
        snapTarget = "bottom";
        showSnapGhost(0, h / 2, w, h / 2);
    } 
    else {
        hideSnapGhost();
    }
}

/* ---------------------------------------------------
   ON MOUSE RELEASE: Apply snap
--------------------------------------------------- */

function handleSnapRelease(win) {
    if (!snapTarget) {
        hideSnapGhost();
        return;
    }

    applySnap(win, snapTarget);
    hideSnapGhost();
}

/* ---------------------------------------------------
   Apply a snap state to a window
--------------------------------------------------- */

function applySnap(win, mode) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    win.classList.remove("maximized");

    if (mode === "left") {
        win.style.left = "0px";
        win.style.top = "0px";
        win.style.width = w / 2 + "px";
        win.style.height = h + "px";
    }

    if (mode === "right") {
        win.style.left = w / 2 + "px";
        win.style.top = "0px";
        win.style.width = w / 2 + "px";
        win.style.height = h + "px";
    }

    if (mode === "top") {
        win.classList.add("maximized");
    }

    if (mode === "bottom") {
        win.style.left = "0px";
        win.style.top = h / 2 + "px";
        win.style.width = w + "px";
        win.style.height = h / 2 + "px";
    }
}

/* ---------------------------------------------------
   SNAP GHOST VISIBILITY
--------------------------------------------------- */

function showSnapGhost(x, y, width, height) {
    ensureSnapGhost();

    snapGhost.style.display = "block";
    snapGhost.style.left = x + "px";
    snapGhost.style.top = y + "px";
    snapGhost.style.width = width + "px";
    snapGhost.style.height = height + "px";
    snapGhost.classList.add("active", "animate-in");
}

function hideSnapGhost() {
    if (!snapGhost) return;
    snapGhost.style.display = "none";
    snapGhost.classList.remove("active", "animate-in");
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.handleSnapDrag = handleSnapDrag;
window.handleSnapRelease = handleSnapRelease;
