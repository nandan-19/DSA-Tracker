// Dashboard JavaScript - Load and display questions from chrome.storage

// appData will be loaded from chrome.storage
let appData = [];
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    refreshData();

    // Navigation Listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Handle Sidebar Navigation
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // Dashboard Search
    const dashboardSearch = document.getElementById('dashboardSearch');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderDashboard();
        });
    }

    // Archive Search
    const archiveSearch = document.getElementById('archiveSearch');
    if (archiveSearch) {
        archiveSearch.addEventListener('input', renderArchive);
    }

    // Modal Actions
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeModal);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', executeDelete);

    // Global Event Delegation for Delete (CSP Safe)
    document.body.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            if (id) promptDelete(id);
        }
    });

    // Settings Actions
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('nukeBtn')?.addEventListener('click', confirmNuke);
    document.getElementById('importBtn')?.addEventListener('click', () => alert('Import feature coming soon in v2.0'));
});

function refreshData() {
    chrome.storage.sync.get(['questions'], (result) => {
        appData = result.questions || [];
        // Sort by timestamp desc
        appData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Initial Render
        renderDashboard();
        renderAnalytics(); // Pre-render
        renderArchive();   // Pre-render

        // Update Session ID (Fake but cool)
        document.getElementById('session-id').innerText = generateSessionId();
    });
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(Math.random() * 9999);
}

// --- NAVIGATION ---
function switchView(viewName) {
    if (!viewName) return;

    // Update Menu Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');

    // Update View Visibility
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active');

    // Update Title
    const titles = {
        'dashboard': 'DASHBOARD',
        'analytics': 'ANALYTICS',
        'archive': 'LOG ARCHIVE',
        'settings': 'SYSTEM SETTINGS'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = titles[viewName];
}

// --- DASHBOARD RENDERER ---
function renderDashboard() {
    // 1. Stats
    const total = appData.length;
    document.getElementById('totalQuestions').innerText = total;

    const hardCount = appData.filter(q => (q.difficulty || 'Medium') === 'Hard').length;
    document.getElementById('hardCount').innerText = hardCount;

    // Weekly Count
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = appData.filter(q => (q.timestamp || 0) > oneWeekAgo).length;
    document.getElementById('weeklyCount').innerText = weekly;

    // Streak Calculation
    document.getElementById('currentStreak').innerText = calculateStreak();

    // Top Tag
    const allTags = appData.flatMap(q => q.tags || []);
    if (allTags.length > 0) {
        const freq = {};
        let maxTag = "--";
        let maxCount = 0;
        allTags.forEach(t => {
            freq[t] = (freq[t] || 0) + 1;
            if (freq[t] > maxCount) { maxCount = freq[t]; maxTag = t; }
        });
        document.getElementById('topTag').innerText = maxTag;
    } else {
        document.getElementById('topTag').innerText = "N/A";
    }

    // 2. Recent Feed - Grouped by Date
    const container = document.getElementById('recentFeed');
    container.innerHTML = '';

    if (appData.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); padding:1rem;">No data received. Awaiting input...</div>';
    } else {
        // Filter by search query
        let filteredData = appData;
        if (searchQuery) {
            filteredData = appData.filter(q => {
                const titleMatch = (q.title || '').toLowerCase().includes(searchQuery);
                const tagMatch = (q.tags || []).some(t => t.toLowerCase().includes(searchQuery));
                const platformMatch = (q.platform || '').toLowerCase().includes(searchQuery);
                return titleMatch || tagMatch || platformMatch;
            });
        }

        if (filteredData.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); padding:1rem;">No results found.</div>';
            return;
        }

        // Group questions by date
        const grouped = {};
        filteredData.slice(0, 10).forEach(q => {
            const dateObj = new Date(q.timestamp || Date.now());
            const dateKey = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(q);
        });

        // Render each date group
        Object.entries(grouped).forEach(([dateStr, questions]) => {
            container.innerHTML += `
                <div class="date-group" style="margin-bottom: 2rem;">
                    <div class="date-header" style="
                        font-family: var(--font-code);
                        font-size: 0.75rem;
                        color: var(--neon-secondary);
                        letter-spacing: 2px;
                        margin-bottom: 1rem;
                        padding-bottom: 0.5rem;
                        border-bottom: 1px solid var(--border-subtle);
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <span class="material-symbols-rounded" style="font-size: 16px;">calendar_today</span>
                        ${dateStr}
                    </div>
                    <div class="date-questions" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${questions.map(q => createLogEntry(q)).join('')}
                    </div>
                </div>`;
        });
    }

    // 3. Heatmap
    renderHeatmap();
}

function calculateStreak() {
    if (appData.length === 0) return 0;

    // Get unique dates sorted desc
    const uniqueDates = [...new Set(appData.map(q => new Date(q.timestamp || 0).toDateString()))];
    // We need to compare actual date objects to check continuity
    // But simplified: check if today/yesterday exists, then count backwards

    const dates = uniqueDates.map(d => new Date(d));
    // Sort descending
    dates.sort((a, b) => b - a);

    if (dates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let streak = 0;

    // Check if most recent is today or yesterday
    const lastActive = dates[0];
    lastActive.setHours(0, 0, 0, 0);

    if (lastActive.getTime() !== today.getTime() && lastActive.getTime() !== yesterday.getTime()) {
        return 0; // Streak broken
    }

    // Count matches
    const dateStrings = new Set(uniqueDates);

    // Start checking from last active date
    let checkDate = new Date(lastActive);

    while (true) {
        if (dateStrings.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function createLogEntry(q) {
    let diffClass = 'diff-med';
    const d = (q.difficulty || 'Medium');
    if (d === 'Hard') diffClass = 'diff-hard';
    if (d === 'Easy') diffClass = 'diff-easy';

    let platformIcon = getPlatformIcon(q.platform);

    return `
    <div class="log-entry" style="
        background: var(--bg-panel);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 1.25rem;
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 1.5rem;
        transition: all 0.2s;
    " onmouseover="this.style.borderColor='var(--border-glow)'" 
       onmouseout="this.style.borderColor='var(--border-subtle)'">
        <div class="log-content" style="min-width: 0;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis;" title="${q.title}">
                <a href="${q.url}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px dotted rgba(255,255,255,0.3); transition: border-color 0.2s;">
                    ${q.title}
                </a>
            </h3>
            <div style="display:flex; gap: 0.5rem; flex-wrap: wrap;">
                ${(q.tags || []).slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('')}
            </div>
        </div>
        <div class="log-meta" style="display:flex; align-items:center; gap:0.75rem;">
            <span class="difficulty ${diffClass}">${d}</span>
            <div style="display:flex; align-items:center; width: 24px; height: 24px;">
                 ${platformIcon}
            </div>
        </div>
        <div class="delete-action">
            <button class="btn-neon btn-danger" style="padding: 6px 10px;" data-action="delete" data-id="${q.id}">
                <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
            </button>
        </div>
    </div>`;
}

function getPlatformIcon(platform) {
    if (!platform) return '';
    const p = platform.toLowerCase();

    let src = '';
    if (p.includes('leetcode')) src = '../icons/leetcode.png';
    else if (p.includes('codeforces')) src = '../icons/codeforces.png';
    else if (p.includes('geeks')) src = '../icons/geeksforgeeks.png';
    else src = '../icons/icon.png';

    return `<img src="${src}" style="width:16px; height:16px; object-fit:contain; opacity:0.8;">`;
}

function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const monthsContainer = document.getElementById('heatmapMonths');
    if (!grid || !monthsContainer) return;

    grid.innerHTML = '';
    monthsContainer.innerHTML = '';

    // Data Map
    const activityMap = {};
    appData.forEach(q => {
        const dateStr = new Date(q.timestamp || 0).toDateString();
        activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    // Trailing Year Configuration (Last 365 Days)
    const endDate = new Date(); // Today
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 365);

    // Calculate start padding to align with Sunday (Row 1)
    // 0 = Sunday, 1 = Monday...
    const startPadding = startDate.getDay();

    // Fill empty cells for days before startDate in the first week
    for (let i = 0; i < startPadding; i++) {
        const placeholder = document.createElement('div');
        placeholder.style.width = '12px';
        placeholder.style.height = '12px';
        grid.appendChild(placeholder);
    }

    // Iterate through all days from startDate to endDate
    let currentDate = new Date(startDate);

    // Track cells to calculate column index for labels
    let cellCount = startPadding;
    let previouslyLabeledMonth = -1;

    // Use fragment for performance
    const gridFragment = document.createDocumentFragment();
    const monthsFragment = document.createDocumentFragment();

    while (currentDate <= endDate) {
        const dateStr = currentDate.toDateString();
        const count = activityMap[dateStr] || 0;
        const month = currentDate.getMonth();

        // Month Labels Logic
        if (month !== previouslyLabeledMonth) {
            // Calculate column index (approximate)
            const colIndex = Math.floor(cellCount / 7);

            const label = document.createElement('div');
            label.className = 'month-label';
            label.innerText = currentDate.toLocaleDateString('en-US', { month: 'short' });
            // 15px = 12px cell + 3px gap
            label.style.left = `${colIndex * 15}px`;
            monthsFragment.appendChild(label);

            previouslyLabeledMonth = month;
        }

        // Create Cell
        const div = document.createElement('div');
        div.className = 'heat-cell';
        div.title = `${dateStr}: ${count} contributions`;

        if (count > 0) {
            if (count === 1) div.classList.add('heat-l1');
            else if (count === 2) div.classList.add('heat-l2');
            else if (count === 3) div.classList.add('heat-l3');
            else div.classList.add('heat-l4');
        }

        gridFragment.appendChild(div);

        // Increment
        currentDate.setDate(currentDate.getDate() + 1);
        cellCount++;
    }

    grid.appendChild(gridFragment);
    monthsContainer.appendChild(monthsFragment);

    // --- RENDER YEARLY STATS ---
    const statsContainer = document.getElementById('heatmapStats');
    if (statsContainer) {
        // Calculate Stats for the rendered period
        let totalContribs = 0;
        let activeDays = 0;
        let maxStreak = 0;
        let currentStreak = 0;
        let maxSingleDay = 0;

        // Re-iterate from startDate to endDate to ensure correct stats for the view
        let iterDate = new Date(startDate);
        while (iterDate <= endDate) {
            const dStr = iterDate.toDateString();
            const count = activityMap[dStr] || 0;

            if (count > 0) {
                totalContribs += count;
                activeDays++;
                currentStreak++;
                if (count > maxSingleDay) maxSingleDay = count;
            } else {
                if (currentStreak > maxStreak) maxStreak = currentStreak;
                currentStreak = 0;
            }
            iterDate.setDate(iterDate.getDate() + 1);
        }
        // Check last streak
        if (currentStreak > maxStreak) maxStreak = currentStreak;

        statsContainer.innerHTML = `
            <div class="year-stat">
                <span class="label">Total</span>
                <span class="value" style="color: var(--neon-success);">${totalContribs}</span>
            </div>
            <div class="year-stat">
                <span class="label">Max/Day</span>
                <span class="value">${maxSingleDay}</span>
            </div>
            <div class="year-stat">
                <span class="label">Lng. Streak</span>
                <span class="value" style="color: var(--neon-secondary);">${maxStreak} <span style="font-size:10px; color:var(--text-muted)">days</span></span>
            </div>
             <div class="year-stat">
                <span class="label">Consistency</span>
                <span class="value">${Math.round((activeDays / 365) * 100)}%</span>
            </div>
        `;
    }
}

// --- ANALYTICS RENDERER ---
function renderAnalytics() {
    // Difficulty
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

    // Platform
    const platforms = {};
    appData.forEach(q => {
        const p = q.platform || 'Other';
        platforms[p] = (platforms[p] || 0) + 1;
    });

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

// --- ARCHIVE RENDERER ---
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

// --- DELETE LOGIC ---
let itemToDelete = null;

function promptDelete(id) {
    itemToDelete = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeModal() {
    document.getElementById('deleteModal').classList.remove('active');
    itemToDelete = null;
};

function executeDelete() {
    if (itemToDelete) {
        // Remove from local
        appData = appData.filter(q => q.id !== itemToDelete);

        // Update Storage
        chrome.storage.sync.set({ questions: appData }, () => {
            // Re-render
            renderDashboard();
            renderAnalytics();
            renderArchive();
            closeModal();
        });
    }
};

// --- SETTINGS LOGIC ---
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibecoded-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};

function confirmNuke() {
    if (confirm("WARNING: NUCLEAR LAUNCH DETECTED.\nThis will wipe all data. Are you sure?")) {
        appData = [];
        chrome.storage.sync.set({ questions: [] }, () => {
            renderDashboard();
            renderAnalytics();
            renderArchive();
            alert("System purged.");
        });
    }
};
