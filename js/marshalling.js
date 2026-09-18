// Marshalling status — fetches from Cloudflare Worker with retry + backoff

const MARSHALLING_WORKER_URL = "https://marshalling-api.adayyli03.workers.dev";
const MARSHALLING_MAX_RETRIES = 3;
const MARSHALLING_RETRY_DELAY_MS = 2000; // doubles each attempt: 2s, 4s, 8s (~14s total)
const MARSHALLING_FETCH_TIMEOUT_MS = 8000; // give up on a single fetch after 8s
const MARSHALLING_SESSION = "oddball";

// Abort controller for cancelling in-flight fetches and backoff delays when
// the user leaves the marshalling tab mid-retry
let marshallingStopController = new AbortController();

function marshallingDelay(ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        marshallingStopController.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
}

// Wraps fetch with an AbortController timeout so a stalled connection
// fails fast rather than hanging until the browser gives up (~2 min).
async function fetchWithTimeout(url, options = {}) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), MARSHALLING_FETCH_TIMEOUT_MS);

    // Combine the timeout signal with the stop signal so either one aborts the fetch
    const signal = anyAbortSignal(timeoutController.signal, marshallingStopController.signal);

    try {
        return await fetch(url, { ...options, signal });
    } finally {
        clearTimeout(timer);
    }
}

// Returns a signal that aborts when any of the given signals abort.
// AbortSignal.any() is not yet universally supported on older mobile browsers.
function anyAbortSignal(...signals) {
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted) { controller.abort(); break; }
        signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return controller.signal;
}

async function fetchMarshallingWithRetry(retries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetchWithTimeout(
                `${MARSHALLING_WORKER_URL}/status?session=${MARSHALLING_SESSION}`,
                { cache: "no-store" }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            // If we were stopped intentionally, propagate immediately — don't retry
            if (e.name === "AbortError") throw e;
            if (attempt === retries) throw e;
            await marshallingDelay(MARSHALLING_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        }
    }
}

// Prevent concurrent fetches from overlapping and confusing the loading state
let marshallingFetchInFlight = false;

async function loadMarshallingStatus() {
    if (marshallingFetchInFlight) return;
    marshallingFetchInFlight = true;

    const elCards      = document.getElementById("marshalling-cards");
    const elLoading    = document.getElementById("marshalling-loading");
    const elError      = document.getElementById("marshalling-error");
    const elNotStarted = document.getElementById("marshalling-not-started");
    const elRetry      = document.getElementById("marshalling-retry");

    // Reset error/retry state before each fetch, but don't hide content
    // that's already visible — hiding it now causes a flash (fix for not-started flash)
    elError.style.display = "none";
    elRetry.style.display = "none";

    // Only show the spinner if no content is already on screen
    const hasContentVisible = elCards.style.display === "block"
                           || elNotStarted.style.display === "block";
    if (!hasContentVisible) {
        elLoading.style.display = "block";
    }

    try {
        const data = await fetchMarshallingWithRetry(MARSHALLING_MAX_RETRIES);

        elLoading.style.display = "none";

        if (!data.initialised) {
            // KV has no data — race day hasn't been set up yet
            elCards.style.display      = "none";
            elNotStarted.style.display = "block";
            return;
        }

        // We have real data — now safe to hide the not-started view if it was showing
        elNotStarted.style.display = "none";

        document.getElementById("marshalling-num").textContent    = data.marshalling;
        document.getElementById("premarshalling-num").textContent = data.premarshalling ?? "None";

        if (data.updatedAt) {
            const d = new Date(data.updatedAt);
            document.getElementById("marshalling-updated").textContent =
                "Last updated: " + d.toLocaleTimeString();
        }

        elCards.style.display = "block";

    } catch (e) {
        // Silently swallow intentional aborts — user left the tab, no need to show an error
        if (e.name === "AbortError") return;

        // All retries exhausted — show friendly error with a retry button
        elLoading.style.display = "none";
        // Keep showing stale cards if we already had data — better than a blank error
        if (elCards.style.display !== "block") {
            elCards.style.display = "none";
            elError.style.display = "block";
        }
        elRetry.style.display = "block";
    } finally {
        marshallingFetchInFlight = false;
    }
}

let marshallingInterval = null;

function startMarshallingUpdates() {
    // Guard: don't create a second interval if one is already running
    if (marshallingInterval !== null) return;
    // Fresh stop controller for this polling session
    marshallingStopController = new AbortController();
    loadMarshallingStatus();
    marshallingInterval = setInterval(loadMarshallingStatus, 60000);
}

function stopMarshallingUpdates() {
    // Cancel any in-flight fetch or backoff delay immediately
    marshallingStopController.abort();
    clearInterval(marshallingInterval);
    marshallingInterval = null;
}

// call startMarshallingUpdates so the interval is restarted if it
// was stopped (e.g. user left the tab mid-retry then tapped retry manually)
function retryMarshallingNow() {
    startMarshallingUpdates();
}
