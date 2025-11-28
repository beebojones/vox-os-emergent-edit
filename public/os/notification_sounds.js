/* ---------------------------------------------------
   Vox OS – Notification Sounds 2.0
   Package 9 (FULL FILE)
--------------------------------------------------- */

/*
   Sounds grouped by notification category.
   Drop your sound files in /sounds/.
*/

const notifSounds = {
    system: new Audio("sounds/system.mp3"),
    app: new Audio("sounds/app.mp3"),
    task: new Audio("sounds/task.mp3"),
    widget: new Audio("sounds/widget.mp3"),
    success: new Audio("sounds/success.mp3"),
    error: new Audio("sounds/error.mp3"),

    // Special strong sound for priority=high or critical
    priority: new Audio("sounds/priority.mp3")
};

/* ---------------------------------------------------
   Play sound based on notification type + priority
--------------------------------------------------- */

function playNotifSound(type = "system", priority = "normal") {
    let snd = null;

    // If critical or high priority, override the sound
    if (priority === "high" || priority === "critical") {
        snd = notifSounds.priority;
    } else {
        snd = notifSounds[type] || notifSounds.system;
    }

    if (!snd) return;

    try {
        snd.currentTime = 0;
        snd.play().catch(() => {
            // Autoplay blocked or no sound file — continue silently
        });
    } catch (err) {
        // Silent fallback
    }
}

window.playNotifSound = playNotifSound;
