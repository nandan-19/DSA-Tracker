// Background service worker for the extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('CS Question Tracker extension installed!');

    // Initialize storage if needed
    chrome.storage.sync.get(['questions'], (result) => {
        if (!result.questions) {
            chrome.storage.sync.set({ questions: [] });
        }
    });
});

// Optional: Add badge to show number of questions stored today
async function updateBadge() {
    try {
        const result = await chrome.storage.sync.get(['questions']);
        const questions = result.questions || [];

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Count today's questions
        const todayCount = questions.filter(q => q.date === today).length;

        if (todayCount > 0) {
            chrome.action.setBadgeText({ text: todayCount.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.questions) {
        updateBadge();
    }
});

// Update badge on startup
updateBadge();
