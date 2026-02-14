// Settings Page JavaScript
// Handles export, import, and nuke functionality

// Setup page-specific listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('nukeBtn')?.addEventListener('click', confirmNuke);
    document.getElementById('importBtn')?.addEventListener('click', () => alert('Import feature coming soon in v2.0'));
});

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DSA-Tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function confirmNuke() {
    if (confirm("WARNING: NUCLEAR LAUNCH DETECTED.\\nThis will wipe all data. Are you sure?")) {
        appData = [];
        chrome.storage.sync.set({ questions: [] }, () => {
            alert("System purged.");
            // Redirect to dashboard after nuke
            window.location.href = 'dashboard.html';
        });
    }
}
