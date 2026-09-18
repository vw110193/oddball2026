// Race display and data loading functionality

const JSON_URL = "races.json";

let allRaces = []; // Store all races for filtering

// Track error state
let hasError = false;

function createRaceGrid(race) {
    // a bad race object must not crash the entire render; skip it silently instead
    if (!race.results || !Array.isArray(race.results)) {
        console.warn(`Race ${race.heat ?? '?'} has no results array — skipping`);
        return '';
    }

    // Sort results by lane
    let sortedResults = [...race.results];
    sortedResults.sort((a, b) => a.lane - b.lane);

    let html = `
        <table class="race-table">`;

    if (race.resultsPending) {
        html += `
            <tr class="results-pending-row">
                <td colspan="4">RESULTS PENDING</td>
            </tr>`;
    }

    if (race.updatedTime) {
        html += `
            <tr class="updated-time-row">
                <td colspan="4">Updated: ${race.updatedTime}</td>
            </tr>`;
    }

    html += `
            <tr>
                <th class="race-header">Race</th>
                <th class="race-header">${race.heat}</th>
                <th class="race-title">${race.heatDescription}</th>
                <th class="color-indicator">${race.color}</th>
            </tr>
            <tr>
                <th class="subheader lane-col">Lane</th>
                <th class="subheader place-col">${'Place'}</th>
                <th class="subheader">${race.scheduledTime}</th>
                <th class="subheader time-col">${'Time'}</th>
            </tr>`;

    sortedResults.forEach(result => {
        html += `
            <tr>
                <td class="lane-col">${result.lane}</td>
                <td class="place-col">${result.place ? result.place : ''}</td>
                <td class="team-col">${(result.teamName && result.teamName !== "#N/A") ? result.teamName : ''}</td>
                <td class="time-col">${result.totalTime ? result.totalTime : ''}</td>
            </tr>`;
    });

    if (race.advancementWording) {
        html += `
            <tr class="advancement-row">
                <td colspan="4">${race.advancementWording || ""}</td>
            </tr>`;
    }

    if (race.penaltyWording) {
        html += `
            <tr class="penalty-row">
                <td colspan="4">⚠️ ${race.penaltyWording}</td>
            </tr>`;
    }

    html += `</table>`;
    return html;
}

function updateResultsSummary(racesCount, isFiltered) {
    const summary = document.getElementById('resultsSummary');
    
    if (isFiltered && racesCount > 0) {
        summary.textContent = `Showing ${racesCount} race${racesCount === 1 ? '' : 's'} matching your search`;
        summary.style.display = 'block';
    } else if (isFiltered && racesCount === 0) {
        summary.style.display = 'none';
    } else {
        summary.textContent = `Showing all ${racesCount} race${racesCount === 1 ? '' : 's'}`;
        summary.style.display = 'block';
    }
}

function checkForErrorState(racesJson) {
    // Check if Google Sheet has set error flag
    return racesJson.showError === true;
}

function showErrorView() {
    const errorView = document.getElementById(`errorView`);
    const loading = document.getElementById(`loading`);
    const container = document.getElementById(`raceContainer`);
    const noResults = document.getElementById(`noResults`);
    const noMatches = document.getElementById(`noMatches`);
    
    errorView.style.display = 'block';
    loading.style.display = 'none';
    container.innerHTML = '';
    noResults.style.display = 'none';
    noMatches.style.display = 'none';
    
    // Set error state
    hasError = true;
    
    document.getElementById('resultsSummary').style.display = 'none';
    // Hide filter container when error is shown 
    document.querySelector('.filter-container').style.display = 'none';
}

function hideErrorView() {
    document.getElementById(`errorView`).style.display = 'none';
    hasError = false;
    
    // Show filter container when error is cleared
    document.querySelector('.filter-container').style.display = 'block';
}

function renderRaces(races) {
    // Don't render if is in error state
    if (hasError) {
        return;
    }
    
    const container = document.getElementById(`raceContainer`);
    const loading = document.getElementById(`loading`);
    const noResults = document.getElementById(`noResults`);
    const noMatches = document.getElementById(`noMatches`);
    const teamFilter = document.getElementById('teamFilter').value.trim();
    const isFiltered = teamFilter;
    const currentRaces = getAllRaces();

    hideErrorView();
    loading.style.display = 'none';

    if (!currentRaces || currentRaces.length === 0) {
        // No races loaded at all
        noResults.style.display = 'block';
        noMatches.style.display = 'none';
        container.innerHTML = '';
        updateResultsSummary(0, false);
        return;
    }

    if (races.length === 0 && isFiltered) {
        // Filtered but no matches
        noResults.style.display = 'none';
        noMatches.style.display = 'block';
        container.innerHTML = '';
        updateResultsSummary(0, true);
        return;
    }

    // Show races
    noResults.style.display = 'none';
    noMatches.style.display = 'none';

    const newHTML = races.map(race => createRaceGrid(race)).join('');
    const savedY = storage.get('raceApp.scrollTop');

    if (savedY !== null) {
        // Page load: restore saved scroll position after content is in the DOM
        storage.set('raceApp.scrollTop', null);
        container.innerHTML = newHTML;
        window.scrollTo(0, parseInt(savedY, 10));
    } else if (container.innerHTML !== newHTML) {
        // Live poll: content changed, preserve current scroll position
        const scrollY = window.scrollY;
        container.innerHTML = newHTML;
        window.scrollTo(0, scrollY);
    }

    updateResultsSummary(races.length, isFiltered);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadRaces(maxRetries = 3) {
    const jsonUrl = JSON_URL;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(jsonUrl, {cache: "no-cache"});
            const racesJson = await response.json();

            // Check if error state should be shown
            if (checkForErrorState(racesJson)) {
                showErrorView();
                return; // Exit early, don't proceed with normal rendering
            }

            // Clear error state since we have valid data
            hasError = false;

            // Store races
            allRaces = racesJson.races || [];

            filterRaces();

            return; // Success, exit the funciton
        } catch (err) {
            console.error(`Failed to load races (attempt ${attempt + 1}/${maxRetries}):`, err);

            const isLastAttempt = attempt === maxRetries - 1;
            if (isLastAttempt) {
                showErrorView();
            } else {
                await delay(Math.pow(2, attempt) * 1000);
            }
        }
    }
}
