/* ---------------------------------------------------
   Vox OS – Global Search Index
   Package 8
--------------------------------------------------- */

/*
   Every searchable item must include:

   {
       id: "unique-id",
       label: "Display Name",
       type: "app" | "widget" | "setting" | "command",
       icon: "icons/...png",
       action: function() {...}
   }
*/

window.SEARCH_INDEX = [

    /* ---------------------------------------------------
       APPS
    --------------------------------------------------- */

    {
        id: "fileexplorer",
        label: "File Explorer",
        type: "app",
        icon: "icons/folder.png",
        action: () => {
            openWindow("fileexplorer", "File Explorer", `<div id="file-explorer"></div>`);
            loadFileExplorer();
        }
    },

    {
        id: "chat",
        label: "Chat",
        type: "app",
        icon: "icons/chat.png",
        action: () => {
            launchChatApp();
        }
    },

    {
        id: "memory",
        label: "Memory Console",
        type: "app",
        icon: "icons/memory.png",
        action: () => {
            launchMemoryConsole();
        }
    },

    /* ---------------------------------------------------
       WIDGETS
    --------------------------------------------------- */

    {
        id: "widget-clock",
        label: "Clock Widget",
        type: "widget",
        icon: "icons/widgets/clock.png",
        action: () => {
            createWidget("clock");
        }
    },
    {
        id: "widget-weather",
        label: "Weather Widget",
        type: "widget",
        icon: "icons/widgets/weather.png",
        action: () => {
            createWidget("weather");
        }
    },
    {
        id: "widget-stats",
        label: "System Stats Widget",
        type: "widget",
        icon: "icons/widgets/stats.png",
        action: () => {
            createWidget("stats");
        }
    },
    {
        id: "widget-notes",
        label: "Sticky Notes",
        type: "widget",
        icon: "icons/widgets/notes.png",
        action: () => {
            createWidget("notes");
        }
    },
    {
        id: "widget-quote",
        label: "Quote of the Day",
        type: "widget",
        icon: "icons/widgets/quote.png",
        action: () => {
            createWidget("quote");
        }
    },

    /* ---------------------------------------------------
       SETTINGS SHORTCUTS
    --------------------------------------------------- */

    {
        id: "settings-theme",
        label: "Theme Settings",
        type: "setting",
        icon: "icons/settings/theme.png",
        action: () => {
            toggleQuickPanel();
            notify("Hint", "Use Quick Settings to change themes.");
        }
    },
    {
        id: "settings-wallpaper",
        label: "Wallpaper Settings",
        type: "setting",
        icon: "icons/settings/wallpaper.png",
        action: () => {
            toggleQuickPanel();
            notify("Hint", "Upload a wallpaper inside Quick Settings.");
        }
    },
    {
        id: "settings-widgets",
        label: "Widget Settings",
        type: "setting",
        icon: "icons/settings/widgets.png",
        action: () => {
            toggleQuickPanel();
            notify("Hint", "Toggle widgets in Quick Settings.");
        }
    },
    {
        id: "settings-notifications",
        label: "Notification Settings",
        type: "setting",
        icon: "icons/settings/bell.png",
        action: () => {
            toggleNotificationCenter();
        }
    },

    /* ---------------------------------------------------
       SYSTEM COMMANDS
    --------------------------------------------------- */

    {
        id: "cmd-restart-os",
        label: "Restart Vox OS",
        type: "command",
        icon: "icons/commands/restart.png",
        action: () => {
            location.reload();
        }
    },

    {
        id: "cmd-toggle-theme",
        label: "Toggle Theme",
        type: "command",
        icon: "icons/commands/theme.png",
        action: () => {
            toggleTheme();
        }
    },

    {
        id: "cmd-dark-mode",
        label: "Dark Mode",
        type: "command",
        icon: "icons/commands/dark.png",
        action: () => {
            applyTheme("dark");
        }
    },

    {
        id: "cmd-light-mode",
        label: "Light Mode",
        type: "command",
        icon: "icons/commands/light.png",
        action: () => {
            applyTheme("light");
        }
    },

    {
        id: "cmd-open-launcher",
        label: "Open App Launcher",
        type: "command",
        icon: "icons/commands/launcher.png",
        action: () => {
            toggleLauncher();
        }
    },

    {
        id: "cmd-open-quick",
        label: "Open Quick Settings",
        type: "command",
        icon: "icons/commands/settings.png",
        action: () => {
            toggleQuickPanel();
        }
    },

    {
        id: "cmd-open-notifications",
        label: "Open Notifications",
        type: "command",
        icon: "icons/commands/notify.png",
        action: () => {
            toggleNotificationCenter();
        }
    },

    {
        id: "cmd-open-clock",
        label: "Open Clock Panel",
        type: "command",
        icon: "icons/commands/clock.png",
        action: () => {
            toggleClockPanel();
        }
    }
];
