// Archive Page JavaScript
// Handles archive table rendering and search

// This function is called by shared.js when data is loaded
function onDataLoaded() {
    renderArchive();
}

// Setup page-specific listeners
document.addEventListener('DOMContentLoaded', () => {
    // Archive Search
    const archiveSearch = document.getElementById('archiveSearch');
    if (archiveSearch) {
        archiveSearch.addEventListener('input', renderArchive);
    }
});

// Helper function to get color based on rating (for Codeforces)
function getRatingColor(difficulty, platform) {
    // Only apply custom colors for Codeforces numeric ratings
    if (platform && platform.toLowerCase().includes('codeforces') && difficulty && !isNaN(difficulty)) {
        const rating = parseInt(difficulty);
        if (rating < 1200) return '#808080'; // Gray - Newbie
        if (rating < 1400) return '#00a550'; // Green - Pupil
        if (rating < 1600) return '#03a89e'; // Cyan - Specialist
        if (rating < 1900) return '#0000ff'; // Blue - Expert
        if (rating < 2100) return '#a0a'; // Violet - Candidate Master
        if (rating < 2400) return '#ff8c00'; // Orange - Master/IM
        return '#ff0000'; // Red - Grandmaster+
    }
    return null; // Use default CSS classes for other platforms
}

function renderArchive() {
    const tbody = document.getElementById('archiveTableBody');
    const filterInput = document.getElementById('archiveSearch');
    const filter = filterInput ? filterInput.value.toLowerCase() : '';

    if (!tbody) return;
    tbody.innerHTML = '';

    appData.filter(q => {
        const titleMatch = (q.title || '').toLowerCase().includes(filter);
        const tagMatch = (q.tags || []).some(t => t.toLowerCase().includes(filter));
        return titleMatch || tagMatch;
    }).forEach(q => {
        // Check for custom rating color first
        const customColor = getRatingColor(q.difficulty, q.platform);
        let diffColor = customColor;

        if (!customColor) {
            // Use default colors for non-numeric difficulties
            diffColor = 'var(--neon-secondary)'; // Med
            if (q.difficulty === 'Hard') diffColor = 'var(--neon-danger)';
            if (q.difficulty === 'Easy') diffColor = 'var(--neon-success)';
        }

        const dateStr = new Date(q.timestamp || 0).toLocaleDateString();

        tbody.innerHTML += `
        <tr>
            <td>${dateStr}</td>
            <td style="font-weight: 600;">
                <a href="${q.url}" target="_blank" style="color: white; text-decoration: none; border-bottom: 1px dotted rgba(255,255,255,0.3); transition: border-color 0.2s;">${q.title}</a>
            </td>
            <td>${q.platform}</td>
            <td style="color: ${diffColor}">${q.difficulty}</td>
            <td>
                <button class="btn-neon btn-danger" style="padding: 4px;" data-action="delete" data-id="${q.id}">
                    <span class="material-symbols-rounded" style="font-size: 14px;">delete</span>
                </button>
            </td>
        </tr>`;
    });
}
