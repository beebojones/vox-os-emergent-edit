/* ---------------------------------------------------
   Vox OS – Drag & Drop Engine
   Package 10 (FULL FILE)
--------------------------------------------------- */

let dragState = {
    dragging: false,
    filePath: null,
    fileName: null,
    ghost: null
};

/* ---------------------------------------------------
   CREATE GHOST PREVIEW
--------------------------------------------------- */

function createGhost(name, x, y) {
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.textContent = name;

    ghost.style.left = x + "px";
    ghost.style.top = y + "px";

    document.body.appendChild(ghost);
    return ghost;
}

/* ---------------------------------------------------
   CLEAR DRAG STATE
--------------------------------------------------- */

function endDrag() {
    if (dragState.ghost) dragState.ghost.remove();

    dragState = {
        dragging: false,
        filePath: null,
        fileName: null,
        ghost: null
    };

    removeFolderHighlights();
}

/* ---------------------------------------------------
   HIGHLIGHT FOLDERS WHILE DRAGGING
--------------------------------------------------- */

function highlightFolder(el) {
    el.classList.add("drop-highlight");
}

function removeFolderHighlights() {
    document.querySelectorAll(".drop-highlight").forEach((el) => {
        el.classList.remove("drop-highlight");
    });
}

/* ---------------------------------------------------
   INITIATE DRAG
--------------------------------------------------- */

function startFileDrag(e, filePath, fileName) {
    e.preventDefault();

    dragState.dragging = true;
    dragState.filePath = filePath;
    dragState.fileName = fileName;

    dragState.ghost = createGhost(fileName, e.clientX, e.clientY);
}

/* ---------------------------------------------------
   DRAGGING BEHAVIOR
--------------------------------------------------- */

document.addEventListener("mousemove", (e) => {
    if (!dragState.dragging || !dragState.ghost) return;

    dragState.ghost.style.left = e.clientX + 12 + "px";
    dragState.ghost.style.top = e.clientY + 12 + "px";

    removeFolderHighlights();

    // Check if hovering over a folder in File Explorer
    const folderEl = document.elementFromPoint(e.clientX, e.clientY)
        ?.closest?.(".fe-folder, .desktop-folder");

    if (folderEl) {
        highlightFolder(folderEl);
    }
});

/* ---------------------------------------------------
   DROP HANDLING
--------------------------------------------------- */

document.addEventListener("mouseup", (e) => {
    if (!dragState.dragging) return;

    const destFolderEl = document.elementFromPoint(e.clientX, e.clientY)
        ?.closest?.(".fe-folder, .desktop-folder");

    let destPath = null;

    if (destFolderEl) {
        destPath = destFolderEl.dataset.path;
    } else {
        // Drop onto desktop
        destPath = "/Desktop";
    }

    const src = dragState.filePath;

    if (destPath) {
        const srcParts = src.split("/");
        const fileName = srcParts.pop();

        const result = fs.move(src, destPath);
        if (result) {
            if (window.refreshDesktop) refreshDesktop();
            if (window.refreshFileExplorer) refreshFileExplorer();
        }
    }

    endDrag();
});

/* ---------------------------------------------------
   HOOKS FOR DESKTOP AND FILE EXPLORER
--------------------------------------------------- */

window.startFileDrag = startFileDrag;
