/* ---------------------------------------------------
   Vox OS – File Explorer Engine
   Package 10 (FULL FILE)
--------------------------------------------------- */

let FE_currentPath = "/Desktop";

/* ---------------------------------------------------
   OPEN FILE EXPLORER WINDOW
--------------------------------------------------- */

function loadFileExplorer() {
    const root = resolveExplorerRoot();
    renderExplorerSidebar(root);
    renderExplorer(FE_currentPath);
}

function resolveExplorerRoot() {
    return fs.root;
}

/* ---------------------------------------------------
   REFRESH CURRENT VIEW
--------------------------------------------------- */

function refreshFileExplorer() {
    renderExplorer(FE_currentPath);
}

/* ---------------------------------------------------
   SIDEBAR
--------------------------------------------------- */

function renderExplorerSidebar(root) {
    const explorer = document.getElementById("file-explorer");
    if (!explorer) return;

    explorer.innerHTML = `
        <div class="fe-sidebar">
            <div class="fe-sidebar-section-title">Locations</div>

            <div class="fe-sidebar-item" data-path="/Desktop">
                <img src="icons/folder.png" width="18"> Desktop
            </div>

            <div class="fe-sidebar-item" data-path="/Documents">
                <img src="icons/folder.png" width="18"> Documents
            </div>

            <div class="fe-sidebar-item" data-path="/Pictures">
                <img src="icons/folder.png" width="18"> Pictures
            </div>

            <div class="fe-sidebar-section-title">System</div>

            <div class="fe-sidebar-item" data-path="/Trash">
                <img src="icons/folder.png" width="18"> Trash
            </div>
        </div>

        <div class="fe-main">
            <div class="fe-toolbar">
                <div class="fe-up-btn">
                    <img src="icons/up.png" width="20">
                </div>
                <div class="fe-refresh-btn">
                    <img src="icons/refresh.png" width="20">
                </div>
                <div class="fe-path">${FE_currentPath}</div>
            </div>

            <div class="fe-content"></div>
        </div>
    `;

    // Sidebar events
    explorer.querySelectorAll(".fe-sidebar-item").forEach(item => {
        item.onclick = () => {
            FE_currentPath = item.dataset.path;
            renderExplorer(FE_currentPath);
        };
    });

    // Toolbar events
    explorer.querySelector(".fe-refresh-btn").onclick = () => {
        renderExplorer(FE_currentPath);
    };

    explorer.querySelector(".fe-up-btn").onclick = () => {
        goUpOneLevel();
    };
}

/* ---------------------------------------------------
   GO UP ONE LEVEL
--------------------------------------------------- */

function goUpOneLevel() {
    const parts = FE_currentPath.split("/").filter(Boolean);
    parts.pop();
    FE_currentPath = "/" + (parts.join("/") || "Desktop");
    renderExplorer(FE_currentPath);
}

/* ---------------------------------------------------
   RENDER A FOLDER
--------------------------------------------------- */

function renderExplorer(path) {
    const explorer = document.getElementById("file-explorer");
    if (!explorer) return;

    const main = explorer.querySelector(".fe-main");
    const content = explorer.querySelector(".fe-content");
    const pathBar = explorer.querySelector(".fe-path");

    const folder = fs.resolvePath(path);
    if (!folder || folder.type !== "folder") return;

    FE_currentPath = path;
    pathBar.textContent = path;

    content.innerHTML = "";

    const items = fs.list(path);

    items.forEach(item => {
        const isFolder = item.type === "folder";
        const itemPath = `${path}/${item.name}`;

        const box = document.createElement("div");
        box.className = "fe-item-box";
        box.dataset.path = itemPath;
        box.dataset.name = item.name;

        // Icon
        const icon = document.createElement("img");

        if (isFolder) {
            icon.className = "fs-icon fs-folder-icon";
        } else {
            // Select filetype icon
            const ext = item.name.split(".").pop().toLowerCase();

            let typeClass = "fs-icon-unknown";

            if (["txt", "md", "log"].includes(ext)) typeClass = "fs-icon-txt";
            if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) typeClass = "fs-icon-img";
            if (["json"].includes(ext)) typeClass = "fs-icon-json";
            if (["js"].includes(ext)) typeClass = "fs-icon-js";
            if (["css"].includes(ext)) typeClass = "fs-icon-css";
            if (["html", "htm"].includes(ext)) typeClass = "fs-icon-html";

            icon.className = `fs-icon ${typeClass}`;
        }

        box.appendChild(icon);

        // Name
        const name = document.createElement("div");
        name.className = "fe-item-name";
        name.textContent = item.name;
        box.appendChild(name);

        /* ---------------------------------------------------
           CLICK TO OPEN FILE / FOLDER
        --------------------------------------------------- */

        box.ondblclick = () => {
            if (isFolder) {
                openFolderInExplorer(itemPath);
            } else {
                openFileInExplorer(itemPath);
            }
        };

        /* ---------------------------------------------------
           RIGHT CLICK MENU
        --------------------------------------------------- */

        box.oncontextmenu = (e) => {
            e.preventDefault();
            closeContextMenu();

            if (isFolder) {
                openFolderMenu(e.clientX, e.clientY, itemPath, item.name);
            } else {
                openFileMenu(e.clientX, e.clientY, itemPath, item.name);
            }
        };

        /* ---------------------------------------------------
           DRAG & DROP
        --------------------------------------------------- */

        box.onmousedown = (e) => {
            if (e.button === 0) {
                startFileDrag(e, itemPath, item.name);
            }
        };

        content.appendChild(box);
    });
}

/* ---------------------------------------------------
   OPENING FILES / FOLDERS (EXPORTED)
--------------------------------------------------- */

function openFolderInExplorer(path) {
    FE_currentPath = path;
    renderExplorer(path);
}

function openFileInExplorer(path) {
    const content = fs.readFile(path);

    // Open in a window (generic text viewer)
    openWindow("fileviewer", path, `
        <textarea style="width:100%; height:100%; background:transparent; color:var(--os-text); border:none; outline:none;">
${content || ""}
        </textarea>
    `);
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.refreshFileExplorer = refreshFileExplorer;
window.openFolderInExplorer = openFolderInExplorer;
window.openFileInExplorer = openFileInExplorer;
window.loadFileExplorer = loadFileExplorer;
