document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusIndicator = document.getElementById('status-indicator');
  const badge = document.getElementById('platform-badge');
  const titleEl = document.getElementById('problem-title');
  const tagsContainer = document.getElementById('tags-container');
  const trackBtn = document.getElementById('track-btn');
  const messageEl = document.getElementById('message');

  // State
  let currentProblem = null;

  // 1. Get Current Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Check Connection & Content
  try {
    // Attempt to talk to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getQuestionDetails' });

    if (response && response.success) {
      handleSuccess(response.data, tab);
    } else {
      handleFallback(tab);
    }
  } catch (e) {
    console.log("Context script not ready or not applicable", e);
    handleFallback(tab);
  }

  // Handlers
  function handleSuccess(data, tab) {
    statusIndicator.className = 'status online';
    statusIndicator.title = "Systems Online";

    // CRITICAL: Add URL from tab to the data
    currentProblem = {
      ...data,
      url: tab.url
    };

    // Update UI
    badge.innerText = data.platform || "UNKNOWN CLASSIFICATION";
    titleEl.innerText = data.title || "Unknown Problem";

    // Tags
    tagsContainer.innerHTML = '';
    (data.tags || []).slice(0, 5).forEach(tag => {
      const t = document.createElement('span');
      t.className = 'tag';
      t.innerText = tag;
      tagsContainer.appendChild(t);
    });

    // Enable Button
    trackBtn.disabled = false;

    // Check if already saved? (Optional optimization)
  }

  function handleFallback(tab) {
    // Basic URL detection if content script fails
    statusIndicator.className = 'status offline';
    statusIndicator.title = "Offline / Manual Mode";

    const url = tab.url;
    let platform = "UNKNOWN";
    if (url.includes('leetcode')) platform = "LEETCODE";
    else if (url.includes('codeforces')) platform = "CODEFORCES";
    else if (url.includes('geeksforgeeks')) platform = "GEEKSFORGEEKS";
    else if (url.includes('hackerrank')) platform = "HACKERRANK";

    badge.innerText = platform;

    if (platform !== "UNKNOWN") {
      // It's a coding site but maybe content script failed or page loading
      titleEl.innerText = tab.title.replace(' - LeetCode', '').split('|')[0].trim();
      trackBtn.disabled = false;

      currentProblem = {
        url: tab.url,
        title: titleEl.innerText,
        platform: platform,
        tags: [],
        difficulty: 'Medium' // Default
      };
    } else {
      titleEl.innerText = "No Signal Detected";
      trackBtn.disabled = true;
    }
  }

  // 3. Track Action
  trackBtn.addEventListener('click', async () => {
    if (!currentProblem) return;

    trackBtn.disabled = true;
    trackBtn.innerHTML = '<span class="material-symbols-rounded">sync</span> PROCESSING...';

    try {
      // Add Timestamp and ID
      const newEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...currentProblem
      };

      // Save
      const result = await chrome.storage.sync.get(['questions']);
      const questions = result.questions || [];

      // Check if already exists (by URL)
      const existingIndex = questions.findIndex(q => q.url === newEntry.url);

      if (existingIndex !== -1) {
        // Update existing
        questions[existingIndex] = newEntry;
        showMessage("ENTRY UPDATED", "success");
      } else {
        // Add new
        questions.push(newEntry);
        showMessage("DATA ENCRYPTED & STORED", "success");
      }

      await chrome.storage.sync.set({ questions });

      // Success UI
      trackBtn.innerHTML = '<span class="material-symbols-rounded">check</span> TRACKING ACTIVE';
      trackBtn.style.color = 'var(--neon-success)';
      trackBtn.style.borderColor = 'var(--neon-success)';


    } catch (err) {
      console.error(err);
      showMessage("SYSTEM FAILURE", "error");
      resetBtn();
    }
  });

  function resetBtn() {
    setTimeout(() => {
      trackBtn.disabled = false;
      trackBtn.innerHTML = '<span class="material-symbols-rounded">radar</span> TRACK PROGRESS';
      trackBtn.style.color = '';
      trackBtn.style.borderColor = '';
    }, 2000);
  }

  function showMessage(msg, type) {
    messageEl.innerText = msg;
    messageEl.className = `message ${type === 'error' ? 'error' : ''}`;
    messageEl.classList.remove('hidden');
    setTimeout(() => messageEl.classList.add('hidden'), 3000);
  }

  // 4. Dashboard Action
  document.getElementById('dashboard-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
  });
});
