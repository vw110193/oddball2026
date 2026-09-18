// Filtering and jump-to-race functionality

function filterRaces() {
    // Don't filter if is in error state
    if (hasError) {
        return;
    }
    
    const teamFilter = document.getElementById('teamFilter').value.toLowerCase().trim();
    
    // Get all races
    const currentRaces = getAllRaces();
    
    if (!teamFilter) {
        // No filter applied, show all races
        renderRaces(currentRaces);
        return;
    }

    const filteredRaces = currentRaces.filter(race => {
        // Filter by team name
        return race.results.some(result =>
            result.teamName != null && result.teamName.toLowerCase().includes(teamFilter)
        );
    });

    renderRaces(filteredRaces);
}

function jumpToRace() {
    // Don't jump if is in error state
    if (hasError) {
        return;
    }
    
    const raceNumber = document.getElementById('jumpToRace').value;
    if (!raceNumber) return;

    // Find the race table with matching race number
    const activeContainer = document.getElementById(`raceContainer`);
    const tables = activeContainer.querySelectorAll('.race-table');
    let targetTable = null;

    tables.forEach(table => {
        const raceHeader = table.querySelector('.race-header:nth-child(2)');
        if (raceHeader && raceHeader.textContent.trim() === raceNumber) {
            targetTable = table;
        }
    });

    if (targetTable) {
        // Scroll to the race with some offset for better visibility
        const offset = 100;
        const elementPosition = targetTable.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        // Clear the jump input
        document.getElementById('jumpToRace').value = '';
        
        // Brief highlight effect
        targetTable.style.boxShadow = '0 0 20px #4CAF50';
        setTimeout(() => {
            targetTable.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }, 2000);
    } else {
        // Race not found - could show a message or just clear the field
        document.getElementById('jumpToRace').value = '';
        // Show a brief message
        const jumpInput = document.getElementById('jumpToRace');
        jumpInput.placeholder = `Not found in grid`;
        jumpInput.style.borderColor = '#f44336';
        setTimeout(() => {
            jumpInput.placeholder = 'Race #';
            jumpInput.style.borderColor = '#ddd';
        }, 2000);
    }
}

// Get all races if available
function getAllRaces() {
    return allRaces || [];
}

// Setup filter event listeners
function setupFilters() {
    const teamFilter = document.getElementById('teamFilter');
    const jumpInput = document.getElementById('jumpToRace');
    const jumpButton = document.getElementById('jumpButton');
    const clearButton = document.getElementById('clearFilters');

    // Add input event listener for real-time filtering
    teamFilter.addEventListener('input', filterRaces);

    // Jump to race functionality
    jumpButton.addEventListener('click', jumpToRace);
    jumpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            jumpToRace();
            // Blur input to collapse keyboard on mobile
            jumpInput.blur();
        }
    });

    // Clear filters button
    clearButton.addEventListener('click', () => {
        teamFilter.value = '';
        jumpInput.value = '';
        filterRaces();
    });

    // Handle Enter key for team filter
    teamFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterRaces();
            // Blur input to collapse keyboard on mobile
            teamFilter.blur();
        }
    });
}
