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
        let diffColor = 'var(--neon-secondary)'; // Med
        if (q.difficulty === 'Hard') diffColor = 'var(--neon-danger)';
        if (q.difficulty === 'Easy') diffColor = 'var(--neon-success)';

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
