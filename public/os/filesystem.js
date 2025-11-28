/* ---------------------------------------------------
   Vox OS – Virtual File System 1.0
   Package 10 (FULL FILE)
--------------------------------------------------- */

//
// Virtual file system structure stored in localStorage:
//
// {
//   "Desktop": { type:"folder", children:{ ... } },
//   "Documents": { ... },
//   "Pictures": { ... }
// }
//
// Each file:
// {
//   type: "file",
//   name: "note.txt",
//   content: "Hello",
//   modified: timestamp
// }
//
// Each folder:
// {
//   type: "folder",
//   children: { ... },
//   modified: timestamp
// }
//

const FS_KEY = "vox_filesystem";

let fsRoot = loadFS();

/* ---------------------------------------------------
   DEFAULT FILESYSTEM
--------------------------------------------------- */

function defaultFS() {
    return {
        Desktop: {
            type: "folder",
            children: {},
            modified: Date.now()
        },
        Documents: {
            type: "folder",
            children: {
                "welcome.txt": {
                    type: "file",
                    content: "Welcome to Vox OS.",
                    modified: Date.now()
                }
            },
            modified: Date.now()
        },
        Pictures: {
            type: "folder",
            children: {},
            modified: Date.now()
        },
        Trash: {
            type: "folder",
            children: {},
            modified: Date.now()
        }
    };
}

/* ---------------------------------------------------
   LOAD / SAVE
--------------------------------------------------- */

function loadFS() {
    try {
        const raw = localStorage.getItem(FS_KEY);
        if (!raw) return defaultFS();
        return JSON.parse(raw);
    } catch {
        return defaultFS();
    }
}

function saveFS() {
    localStorage.setItem(FS_KEY, JSON.stringify(fsRoot));
}

/* ---------------------------------------------------
   PATH PARSER
--------------------------------------------------- */

function resolvePath(path) {
    if (!path.startsWith("/")) path = "/" + path;

    const parts = path.split("/").filter(Boolean);
    let node = fsRoot;

    for (const part of parts) {
        if (!node || node.type !== "folder") return null;
        node = node.children[part];
    }

    return node || null;
}

function resolveParent(path) {
    const parts = path.split("/").filter(Boolean);
    const name = parts.pop();
    const parentPath = "/" + parts.join("/");

    return { parent: resolvePath(parentPath), name };
}

/* ---------------------------------------------------
   CREATE FILE
--------------------------------------------------- */

function createFile(path, content = "") {
    const { parent, name } = resolveParent(path);

    if (!parent || parent.type !== "folder") {
        throw new Error("Invalid path");
    }

    parent.children[name] = {
        type: "file",
        content,
        modified: Date.now()
    };

    parent.modified = Date.now();
    saveFS();
}

/* ---------------------------------------------------
   CREATE FOLDER
--------------------------------------------------- */

function createFolder(path) {
    const { parent, name } = resolveParent(path);

    if (!parent || parent.type !== "folder") {
        throw new Error("Invalid path");
    }

    parent.children[name] = {
        type: "folder",
        children: {},
        modified: Date.now()
    };

    parent.modified = Date.now();
    saveFS();
}

/* ---------------------------------------------------
   READ / WRITE FILE
--------------------------------------------------- */

function readFile(path) {
    const file = resolvePath(path);

    if (!file || file.type !== "file") return null;
    return file.content;
}

function writeFile(path, content) {
    const file = resolvePath(path);

    if (!file || file.type !== "file") throw new Error("No such file");

    file.content = content;
    file.modified = Date.now();
    saveFS();
}

/* ---------------------------------------------------
   DELETE (Sends to Trash)
--------------------------------------------------- */

function deleteFS(path) {
    const { parent, name } = resolveParent(path);
    if (!parent || !parent.children[name]) return;

    const item = parent.children[name];
    delete parent.children[name];

    // Send to trash
    fsRoot.Trash.children[name] = item;
    fsRoot.Trash.modified = Date.now();

    parent.modified = Date.now();
    saveFS();
}

/* ---------------------------------------------------
   RESTORE
--------------------------------------------------- */

function restoreFS(name) {
    const item = fsRoot.Trash.children[name];
    if (!item) return;

    // Put it on Desktop
    fsRoot.Desktop.children[name] = item;

    delete fsRoot.Trash.children[name];
    saveFS();
}

/* ---------------------------------------------------
   RENAME
--------------------------------------------------- */

function renameFS(path, newName) {
    const { parent, name } = resolveParent(path);

    if (!parent || !parent.children[name]) return false;

    parent.children[newName] = parent.children[name];
    delete parent.children[name];
    saveFS();
    return true;
}

/* ---------------------------------------------------
   MOVE (Drag and drop)
--------------------------------------------------- */

function moveFS(src, destFolder) {
    const { parent, name } = resolveParent(src);
    const dest = resolvePath(destFolder);

    if (!parent || !parent.children[name]) return false;
    if (!dest || dest.type !== "folder") return false;

    dest.children[name] = parent.children[name];
    delete parent.children[name];

    dest.modified = Date.now();
    parent.modified = Date.now();
    saveFS();

    return true;
}

/* ---------------------------------------------------
   UTILITIES
--------------------------------------------------- */

function listFS(path) {
    const node = resolvePath(path);
    if (!node || node.type !== "folder") return [];
    return Object.keys(node.children).map(name => ({
        name,
        ...node.children[name]
    }));
}

/* ---------------------------------------------------
   EXPORT API
--------------------------------------------------- */

window.fs = {
    resolvePath,
    readFile,
    writeFile,
    createFile,
    createFolder,
    delete: deleteFS,
    restore: restoreFS,
    rename: renameFS,
    move: moveFS,
    list: listFS,
    root: fsRoot
};
