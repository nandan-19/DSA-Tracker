// Shared JavaScript for all dashboard pages
// This file contains navigation logic, data management, and common utilities

// Global State
let appData = [];
let searchQuery = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load data from storage
    refreshData();

    // Setup navigation
    setupNavigation();

    // Update session ID
    const sessionIdEl = document.getElementById('session-id');
    if (sessionIdEl) {
        sessionIdEl.innerText = generateSessionId();
    }

    // Setup modal listeners (if modal exists)
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (confirmBtn) confirmBtn.addEventListener('click', executeDelete);

    // Global Event Delegation (CSP Safe)
    document.body.addEventListener('click', (e) => {
        // Delete Action
        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            if (id) promptDelete(id);
            return;
        }

        // Toggle Notes Action
        const toggleBtn = e.target.closest('[data-action="toggle-notes"]');
        if (toggleBtn) {
            const id = toggleBtn.getAttribute('data-id');
            if (id) toggleNotes(id);
            return;
        }

        // Save Note Action
        const saveBtn = e.target.closest('[data-action="save-note"]');
        if (saveBtn) {
            const id = saveBtn.getAttribute('data-id');
            if (id) saveNote(id);
            return;
        }
    });
});

// --- DATA MANAGEMENT ---
function refreshData() {
    chrome.storage.sync.get(['questions'], (result) => {
        appData = result.questions || [];
        // Sort by timestamp desc
        appData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Trigger page-specific rendering if function exists
        if (typeof onDataLoaded === 'function') {
            onDataLoaded();
        }
    });
}

// --- NAVIGATION ---
function setupNavigation() {
    const currentPage = window.location.pathname.split('/').pop();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const view = item.getAttribute('data-view');
            navigateToPage(view);
        });

        // Set active state based on current page
        const view = item.getAttribute('data-view');
        if (
            (view === 'dashboard' && currentPage === 'dashboard.html') ||
            (view === 'analytics' && currentPage === 'analytics.html') ||
            (view === 'archive' && currentPage === 'archive.html') ||
            (view === 'settings' && currentPage === 'settings.html')
        ) {
            item.classList.add('active');
        }
    });
}

function navigateToPage(view) {
    const pages = {
        'dashboard': 'dashboard.html',
        'analytics': 'analytics.html',
        'archive': 'archive.html',
        'settings': 'settings.html'
    };

    if (pages[view]) {
        window.location.href = pages[view];
    }
}

// --- UTILITY FUNCTIONS ---
function generateSessionId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(Math.random() * 9999);
}

function getPlatformIcon(platform) {
    if (!platform) return '';
    const p = platform.toLowerCase();

    let src = '';
    if (p.includes('leetcode')) src = '../../icons/leetcode.png';
    else if (p.includes('codeforces')) src = '../../icons/codeforces.png';
    else if (p.includes('geeks')) src = '../../icons/geeksforgeeks.png';
    else src = '../../icons/icon.png';

    return `<img src="${src}" style="width:16px; height:16px; object-fit:contain; opacity:0.8;">`;
}

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


// --- DELETE MODAL LOGIC ---
let itemToDelete = null;

function promptDelete(id) {
    itemToDelete = id;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('active');
    itemToDelete = null;
}

function executeDelete() {
    if (itemToDelete) {
        // Remove from local
        appData = appData.filter(q => q.id !== itemToDelete);

        // Update Storage
        chrome.storage.sync.set({ questions: appData }, () => {
            // Trigger page-specific re-render
            if (typeof onDataLoaded === 'function') {
                onDataLoaded();
            }
            closeModal();
        });
    }
}

// --- NOTES LOGIC ---
function toggleNotes(id) {
    const section = document.getElementById(`notes-${id}`);
    if (section) {
        section.classList.toggle('active');
    }
}

function saveNote(id) {
    const textarea = document.getElementById(`note-text-${id}`);
    const noteContent = textarea ? textarea.value.trim() : '';

    // Update Local Data
    const questionIndex = appData.findIndex(q => q.id === id);
    if (questionIndex > -1) {
        appData[questionIndex].note = noteContent;

        // Persist
        chrome.storage.sync.set({ questions: appData }, () => {
            // Visual Feedback
            const btn = document.querySelector(`#notes-${id} .btn-neon`);
            if (!btn) return;

            const originalText = btn.innerHTML;

            btn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">check</span> SAVED`;
            btn.style.borderColor = 'var(--neon-success)';
            btn.style.color = 'var(--neon-success)';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.borderColor = '';
                btn.style.color = '';

                // Update toggle icon state
                const toggleBtn = document.querySelector(`button[data-action="toggle-notes"][data-id="${id}"]`);
                if (toggleBtn) {
                    if (noteContent) toggleBtn.classList.add('active');
                    else toggleBtn.classList.remove('active');
                }
            }, 1500);
        });
    }
}
