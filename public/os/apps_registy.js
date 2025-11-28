/* ---------------------------------------------------
   Vox OS – Application Registry
   Package 12 (FULL FILE)
--------------------------------------------------- */

window.VOX_APPS = {};  // id → manifest

/* ---------------------------------------------------
   REGISTER APP
--------------------------------------------------- */

function registerApp(manifest) {
    /*
        manifest = {
            id: "fileexplorer",
            name: "File Explorer",
            icon: "icons/apps/fileexplorer.png",
            category: "System",
            description: "Browse your files and folders.",
            launch: () => openFileExplorer(),
            permissions: ["fs_read", "fs_write"]
        }
    */

    if (!manifest.id) {
        console.error("App manifest missing ID:", manifest);
        return;
    }

    VOX_APPS[manifest.id] = manifest;
}

/* ---------------------------------------------------
   LAUNCH APP
--------------------------------------------------- */

function launchAppById(id) {
    const app = VOX_APPS[id];
    if (!app) {
        console.error("Unknown app:", id);
        return;
    }

    try {
        app.launch();
    } catch (err) {
        console.error("Error launching app:", err);
    }
}

/* ---------------------------------------------------
   LIST APPS (used by launcher & spotlight)
--------------------------------------------------- */

function listAllApps() {
    return Object.values(VOX_APPS);
}

function listAppsByCategory(cat) {
    return listAllApps().filter(a => a.category === cat);
}

function searchApps(query) {
    const q = query.toLowerCase();
    return listAllApps().filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
}

/* ---------------------------------------------------
   EXPORT
--------------------------------------------------- */

window.registerApp = registerApp;
window.launchAppById = launchAppById;
window.VOX_APPS = VOX_APPS;
window.listAllApps = listAllApps;
window.listAppsByCategory = listAppsByCategory;
window.searchApps = searchApps;
