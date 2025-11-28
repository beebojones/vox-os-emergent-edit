/* ---------------------------------------------------
   Vox OS – Application Definitions (App Registry Wiring)
   Package 12 (FULL FILE)
--------------------------------------------------- */

/*
    This file registers all built-in Vox OS apps
    using the App Registry from apps_registry.js.
*/

/* ---------------------------------------------------
   CHAT APP
--------------------------------------------------- */

registerApp({
    id: "chat",
    name: "Chat",
    icon: "icons/apps/chat.png",
    category: "System",
    description: "Talk with the Vox Assistant.",
    launch: () => {
        openWindow(
            "chat",
            "Chat",
            `<iframe src="chat.html" style="width:100%; height:100%; border:none;"></iframe>`,
            "icons/apps/chat.png"
        );
    },
    permissions: ["system_info"]
});

/* ---------------------------------------------------
   MEMORY CONSOLE
--------------------------------------------------- */

registerApp({
    id: "memory",
    name: "Memory Console",
    icon: "icons/apps/memory.png",
    category: "System",
    description: "View and inspect stored Vox memories.",
    launch: () => {
        openWindow(
            "memory",
            "Memory Console",
            `<iframe src="memory.html" style="width:100%; height:100%; border:none;"></iframe>`,
            "icons/apps/memory.png"
        );
    },
    permissions: ["system_info", "fs_read"]
});

/* ---------------------------------------------------
   FILE EXPLORER
--------------------------------------------------- */

registerApp({
    id: "fileexplorer",
    name: "File Explorer",
    icon: "icons/apps/fileexplorer.png",
    category: "System",
    description: "Browse and manage your files.",
    launch: () => {
        const win = openWindow(
            "fileexplorer",
            "File Explorer",
            `<div id="file-explorer"></div>`,
            "icons/apps/fileexplorer.png"
        );
        loadFileExplorer();
    },
    permissions: ["fs_read", "fs_write"]
});

/* ---------------------------------------------------
   TEXT PAD
--------------------------------------------------- */

registerApp({
    id: "textpad",
    name: "Text Pad",
    icon: "icons/apps/textpad.png",
    category: "Utilities",
    description: "A simple text editor.",
    launch: () => {
        openWindow(
            "textpad",
            "Text Pad",
            `
                <textarea style="
                    width:100%;
                    height:100%;
                    background:transparent;
                    border:none;
                    color:var(--os-text);
                    padding:12px;
                    font-size:14px;
                    outline:none;
                    resize:none;
                "></textarea>
            `,
            "icons/apps/textpad.png"
        );
    },
    permissions: ["fs_read", "fs_write"]
});

/* ---------------------------------------------------
   IMAGE VIEWER
--------------------------------------------------- */

registerApp({
    id: "imageviewer",
    name: "Image Viewer",
    icon: "icons/apps/imageviewer.png",
    category: "Utilities",
    description: "View images inside Vox OS.",
    launch: () => {
        openWindow(
            "imageviewer",
            "Image Viewer",
            `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--os-text); opacity:0.6;">
                No image loaded.
            </div>`,
            "icons/apps/imageviewer.png"
        );
    },
    permissions: ["fs_read"]
});

/* ---------------------------------------------------
   SETTINGS APP
--------------------------------------------------- */

registerApp({
    id: "settings",
    name: "Settings",
    icon: "icons/apps/settings.png",
    category: "System",
    description: "Customize Vox OS preferences.",
    launch: () => {
        openWindow(
            "settings",
            "Settings",
            `<div style="padding:20px; color:var(--os-text);">
                <h2>Vox OS Settings</h2>
                <p>Settings panel coming soon.</p>
            </div>`,
            "icons/apps/settings.png"
        );
    },
    permissions: ["system_info"]
});

/* ---------------------------------------------------
   ABOUT VOX OS
--------------------------------------------------- */

registerApp({
    id: "about",
    name: "About Vox OS",
    icon: "icons/apps/about.png",
    category: "System",
    description: "Information about this operating system.",
    launch: () => {
        openWindow(
            "about",
            "About Vox OS",
            `<div style="padding:20px; color:var(--os-text); line-height:1.6;">
                <h2>Vox OS</h2>
                <p>A lightweight desktop environment built directly inside your Vox Assistant project.</p>
                <p>Developed by John.</p>
                <p>Engine: HTML, CSS, JS.</p>
                <p>Modules include:</p>
                <ul style="padding-left:20px;">
                    <li>Window Manager 2.0</li>
                    <li>Snap Engine</li>
                    <li>Application Launcher</li>
                    <li>Spotlight Universal Search</li>
                    <li>File System Engine</li>
                    <li>Taskbar</li>
                </ul>
            </div>`,
            "icons/apps/about.png"
        );
    },
    permissions: []
});
