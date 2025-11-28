/* ---------------------------------------------------
   Vox OS – Widget Presets
   Package 7
--------------------------------------------------- */

window.WIDGET_PRESETS = {

    /* ---------------------------------------------------
       CLOCK WIDGET
    --------------------------------------------------- */
    clock: {
        id: "clock",
        name: "Clock",
        width: 180,
        height: 100,
        defaultX: 40,
        defaultY: 160,
        template: () => `
            <div class="widget-title">Clock</div>
            <div class="widget-content">
                <div class="widget-clock-time" id="clock-widget-time"></div>
                <div class="widget-clock-date" id="clock-widget-date"></div>
            </div>
        `
    },

    /* ---------------------------------------------------
       WEATHER WIDGET
       (mocked data for now)
    --------------------------------------------------- */
    weather: {
        id: "weather",
        name: "Weather",
        width: 210,
        height: 140,
        defaultX: 250,
        defaultY: 160,
        template: () => `
            <div class="widget-title">Weather</div>
            <div class="widget-content">
                <div class="weather-top">
                    <img class="weather-icon" src="icons/weather/sun.png">
                    <div>
                        <div class="weather-temp" id="weather-temp">72°</div>
                        <div class="weather-desc" id="weather-desc">Sunny</div>
                    </div>
                </div>
                <div style="font-size:12px; opacity:0.7;">Fort Worth, TX</div>
            </div>
        `
    },

    /* ---------------------------------------------------
       SYSTEM STATS (FAKE ANIMATED)
    --------------------------------------------------- */
    stats: {
        id: "stats",
        name: "System Stats",
        width: 220,
        height: 150,
        defaultX: 480,
        defaultY: 160,
        template: () => `
            <div class="widget-title">System Stats</div>
            <div class="widget-content">
                <div class="stats-item">
                    <div class="stats-name">CPU</div>
                    <div class="stats-bar">
                        <div class="stats-bar-fill" id="cpu-fill" style="width:30%;"></div>
                    </div>
                </div>
                <div class="stats-item">
                    <div class="stats-name">RAM</div>
                    <div class="stats-bar">
                        <div class="stats-bar-fill" id="ram-fill" style="width:45%;"></div>
                    </div>
                </div>
                <div class="stats-item">
                    <div class="stats-name">GPU</div>
                    <div class="stats-bar">
                        <div class="stats-bar-fill" id="gpu-fill" style="width:20%;"></div>
                    </div>
                </div>
            </div>
        `
    },

    /* ---------------------------------------------------
       STICKY NOTES
    --------------------------------------------------- */
    notes: {
        id: "notes",
        name: "Sticky Notes",
        width: 200,
        height: 160,
        defaultX: 720,
        defaultY: 160,
        template: () => `
            <div class="widget-title">Notes</div>
            <div class="widget-content">
                <textarea id="notes-text" placeholder="Write something..."></textarea>
            </div>
        `
    },

    /* ---------------------------------------------------
       QUOTE OF THE DAY
    --------------------------------------------------- */
    quote: {
        id: "quote",
        name: "Quote of the Day",
        width: 240,
        height: 120,
        defaultX: 960,
        defaultY: 160,
        template: () => `
            <div class="widget-title">Quote</div>
            <div class="widget-content">
                <div class="quote-text" id="quote-text">
                    “Be yourself; everyone else is already taken.”
                </div>
                <div class="quote-author" id="quote-author">– Oscar Wilde</div>
            </div>
        `
    }
};
