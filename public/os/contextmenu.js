/* ---------------------------------------------------
   Vox OS – Context Menu Engine
   Package 10 (FULL FILE)
--------------------------------------------------- */

let activeContextMenu = null;
let contextTarget = null;

/* ---------------------------------------------------
   CLOSE ANY OPEN MENU
--------------------------------------------------- */

function closeContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.style.display = "none";
        activeContextMenu.remove();
        activeContextMenu = null;
        contextTarget = null;
    }
}

/* Close on click outside */
document.addEventListener("mousedown", (e) => {
    if (activeContextMenu && !activeContextMenu.contains(e.target)) {
        closeContextMenu();
    }
});

/* Close on Escape */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeContextMenu();
});

/* ---------------------------------------------------
   UTILITY – CREATE ELEMENT
--------------------------------------------------- */

function cmItem(label, icon, callback, disabled = false) {
    const item = document.createElement("div");
    item.className = "context-item";

    if (disabled) item.classList.add("disabled");

    if (icon) {
        item.innerHTML = `<img src="${icon}"><span>${label}</span>`;
    } else {
        item.innerHTML = `<span>${label}</span>`;
    }

    if (!disabled && callback) {
        item.onclick = () => {
            callback();
            closeContextMenu();
        };
    }

    return item;
}

function cmSeparator() {
    const sep = document.createElement("div");
    sep.className = "context-separator";
    return sep;
}

/* ---------------------------------------------------
   POSITION THE MENU ON SCREEN
--------------------------------------------------- */

function positionContextMenu(menu, x, y) {
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;

    const maxX = window.innerWidth - w - 10;
    const maxY = window.innerHeight - h - 10;

    menu.style.left = Math.min(x, maxX) + "px";
    menu.style.top = Math.min(y, maxY) + "px";
}

/* ---------------------------------------------------
   BUILD DESKTOP MENU
--------------------------------------------------- */

function openDesktopMenu(x, y) {
    const menu = document.createElement("div");
    menu.className = "context-menu";

    menu.appendChild(cmItem("New Folder", "icons/folder.png", () => {
        const name = prompt("Folder name:");
        if (name) fs.createFolder(`/Desktop/${name}`);
        if (window.refreshDesktop) refreshDesktop();
    }));

    menu.appendChild(cmItem("New File", "icons/file.png", () => {
        const name = prompt("File name:");
        if (name) fs.createFile(`/Desktop/${name}`, "");
        if (window.refreshDesktop) refreshDesktop();
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("Refresh", "icons/refresh.png", () => {
        if (window.refreshDesktop) refreshDesktop();
    }));

    document.body.appendChild(menu);
    menu.style.display = "flex";
    activeContextMenu = menu;

    positionContextMenu(menu, x, y);
}

/* ---------------------------------------------------
   BUILD FILE MENU
--------------------------------------------------- */

function openFileMenu(x, y, filePath, fileName) {
    const menu = document.createElement("div");
    menu.className = "context-menu";

    menu.appendChild(cmItem("Open", "icons/open.png", () => {
        if (window.openFileInExplorer) openFileInExplorer(filePath);
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("Rename", "icons/rename.png", () => {
        const newName = prompt("New name:", fileName);
        if (newName) {
            fs.rename(filePath, newName);
            if (window.refreshDesktop) refreshDesktop();
            if (window.refreshFileExplorer) refreshFileExplorer();
        }
    }));

    menu.appendChild(cmItem("Delete", "icons/delete.png", () => {
        fs.delete(filePath);
        if (window.refreshDesktop) refreshDesktop();
        if (window.refreshFileExplorer) refreshFileExplorer();
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("Properties", "icons/info.png", () => {
        alert(`File: ${fileName}\nPath: ${filePath}`);
    }));

    document.body.appendChild(menu);
    menu.style.display = "flex";
    activeContextMenu = menu;

    positionContextMenu(menu, x, y);
}

/* ---------------------------------------------------
   BUILD FOLDER MENU
--------------------------------------------------- */

function openFolderMenu(x, y, folderPath, folderName) {
    const menu = document.createElement("div");
    menu.className = "context-menu";

    menu.appendChild(cmItem("Open", "icons/open.png", () => {
        if (window.openFolderInExplorer) openFolderInExplorer(folderPath);
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("New File", "icons/file.png", () => {
        const name = prompt("File name:");
        if (name) fs.createFile(`${folderPath}/${name}`, "");
        if (window.refreshFileExplorer) refreshFileExplorer();
    }));

    menu.appendChild(cmItem("New Folder", "icons/folder.png", () => {
        const name = prompt("Folder name:");
        if (name) fs.createFolder(`${folderPath}/${name}`);
        if (window.refreshFileExplorer) refreshFileExplorer();
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("Rename", "icons/rename.png", () => {
        const newName = prompt("New name:", folderName);
        if (newName) {
            fs.rename(folderPath, newName);
            if (window.refreshFileExplorer) refreshFileExplorer();
        }
    }));

    menu.appendChild(cmItem("Delete", "icons/delete.png", () => {
        fs.delete(folderPath);
        if (window.refreshFileExplorer) refreshFileExplorer();
    }));

    menu.appendChild(cmSeparator());

    menu.appendChild(cmItem("Properties", "icons/info.png", () => {
        alert(`Folder: ${folderName}\nPath: ${folderPath}`);
    }));

    document.body.appendChild(menu);
    menu.style.display = "flex";
    activeContextMenu = menu;

    positionContextMenu(menu, x, y);
}

/* ---------------------------------------------------
   HOOK INTO EVENTS
--------------------------------------------------- */

/* Desktop right-click */
document.getElementById("desktop").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    closeContextMenu();

    // Ignore if right-clicking a desktop icon (handled elsewhere)
    if (e.target.closest(".desktop-icon")) return;

    openDesktopMenu(e.clientX, e.clientY);
});

/* Enable apps to trigger file/folder menus */
window.openFileMenu = openFileMenu;
window.openFolderMenu = openFolderMenu;
