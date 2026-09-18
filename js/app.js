// Main application initialization and coordination

// ── Safe localStorage wrapper ────────────────────────────
// localStorage throws a SecurityError in iOS Safari private browsing.
// All storage access goes through these helpers so one failure can't
// crash init or scroll restore.
const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* silent */ }
    }
};

// ── Scroll position ──────────────────────────────────────
window.addEventListener('beforeunload', () => {
    storage.set('raceApp.scrollTop', window.scrollY);
});

// Extra safety for iOS as it fires more consistently
window.addEventListener('pagehide', () => {
    storage.set('raceApp.scrollTop', window.scrollY);
});

// ── Race results polling ─────────────────────────────────
let updateInterval = null;

function startUpdates() {
    if (updateInterval !== null) return;
    updateInterval = setInterval(loadRaces, 60000);
}

function stopUpdates() {
    clearInterval(updateInterval);
    updateInterval = null;
}

// ── Visibility change — pause/resume both pollers independently ──
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        stopUpdates();
        stopMarshallingUpdates();
        storage.set('raceApp.scrollTop', window.scrollY);
    } else {
        // Resume both independently — each has its own error state,
        // so a failure in one does not affect the other
        loadRaces();
        startUpdates();
        startMarshallingUpdates();
    }
});

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    loadRaces();
    startUpdates();
    startMarshallingUpdates();
});
