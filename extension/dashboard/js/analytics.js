// Analytics Page JavaScript
// Handles difficulty and platform distribution charts

// This function is called by shared.js when data is loaded
function onDataLoaded() {
    renderAnalytics();
}

function renderAnalytics() {
    renderDifficultyChart();
    renderPlatformChart();
}

function renderDifficultyChart() {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    appData.forEach(q => {
        const d = q.difficulty || 'Medium';
        if (counts[d] !== undefined) counts[d]++;
        else counts['Medium']++; // Fallback
    });
    const total = appData.length || 1;

    const diffChart = document.getElementById('difficultyChart');
    if (diffChart) {
        diffChart.innerHTML = `
            ${createBar(counts.Easy, total, 'Easy', '#00FF94')}
            ${createBar(counts.Medium, total, 'Medium', '#00FFFF')}
            ${createBar(counts.Hard, total, 'Hard', '#FF0055')}
        `;
    }
}

function renderPlatformChart() {
    const platforms = {};
    appData.forEach(q => {
        const p = q.platform || 'Other';
        platforms[p] = (platforms[p] || 0) + 1;
    });
    const total = appData.length || 1;

    const platChart = document.getElementById('platformChart');
    if (platChart) {
        platChart.innerHTML = Object.keys(platforms).map(p =>
            createBar(platforms[p], total, p, '#7000FF')
        ).join('');
    }
}

function createBar(val, total, label, color) {
    const pct = Math.round((val / total) * 100);
    const height = val === 0 ? 0 : Math.max(5, pct);
    return `
    <div class="bar-group">
        <div class="bar-label">${val}</div>
        <div class="bar" style="height: ${height}%; background: ${color}; opacity: 0.8; box-shadow: 0 0 10px ${color}40;"></div>
        <div class="bar-label">${label.substring(0, 8)}</div>
    </div>`;
}
