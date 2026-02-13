// Content script for extracting question details from various coding platforms

// Platform-specific extractors
const extractors = {
    leetcode: () => {
        // Title
        const title = document.querySelector('a[class*="text-title"]')?.textContent?.trim() ||
            document.querySelector('[data-cy="question-title"]')?.textContent?.trim() ||
            document.querySelector('.text-title-large')?.textContent?.trim() ||
            document.title.split('-')[0].trim();

        // Tags: Aggressive selection strategy
        // Modern LeetCode uses specific classes like 'topic-tag' but sometimes they are hidden behind 'Show related topics'
        // We try to find common tag structures
        const tagElements = document.querySelectorAll('a[href*="/tag/"], [class*="topic-tag"]');

        const tags = Array.from(tagElements)
            .map(tag => tag.textContent.trim())
            .filter(t => t && !t.includes('+') && t.length < 30 && !t.includes('Show')); // Filter valid tags

        const uniqueTags = [...new Set(tags)];

        // Difficulty
        const difficulty = document.querySelector('div[class*="text-difficulty"]')?.textContent?.trim() ||
            document.querySelector('.text-difficulty-easy')?.textContent?.trim() ||
            document.querySelector('.text-difficulty-medium')?.textContent?.trim() ||
            document.querySelector('.text-difficulty-hard')?.textContent?.trim() ||
            'Medium';

        return { platform: 'LeetCode', title, tags: uniqueTags, difficulty };
    },

    codeforces: () => {
        const title = document.querySelector('.problem-statement .title')?.textContent?.trim() ||
            document.querySelector('.header .title')?.textContent?.trim();

        const tags = Array.from(document.querySelectorAll('.tag-box'))
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        const rating = document.querySelector('.ProblemInfo')?.textContent?.match(/\*(\d+)/)?.[1];
        const difficulty = rating ?
            (rating >= 2000 ? 'Hard' : rating >= 1400 ? 'Medium' : 'Easy') : null;

        return { platform: 'CodeForces', title, tags, difficulty };
    },

    hackerrank: () => {
        const title = document.querySelector('.challengecard-title')?.textContent?.trim() ||
            document.querySelector('h1.page-label')?.textContent?.trim() ||
            document.querySelector('.challenge-page-title')?.textContent?.trim();

        const domain = document.querySelector('.breadcrumb-item.active')?.textContent?.trim();
        const tags = domain ? [domain] : [];

        const difficulty = document.querySelector('.difficulty')?.textContent?.trim();

        return { platform: 'HackerRank', title, tags, difficulty };
    },

    geeksforgeeks: () => {
        const title = document.querySelector('.problem-title')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('.article-title')?.textContent?.trim();

        const tags = Array.from(document.querySelectorAll('.problem-tags a, .article-tags a'))
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        const difficulty = document.querySelector('.problem-difficulty')?.textContent?.trim() ||
            document.querySelector('[class*="difficulty"]')?.textContent?.trim();

        return { platform: 'GeeksforGeeks', title, tags, difficulty };
    },

    codechef: () => {
        const title = document.querySelector('.problem-title')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim();

        const tags = Array.from(document.querySelectorAll('.tag'))
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        const difficulty = document.querySelector('.difficulty')?.textContent?.trim();

        return { platform: 'CodeChef', title, tags, difficulty };
    }
};

// Detect platform
function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('leetcode.com')) return 'leetcode';
    if (hostname.includes('codeforces.com')) return 'codeforces';
    if (hostname.includes('hackerrank.com')) return 'hackerrank';
    if (hostname.includes('geeksforgeeks.org')) return 'geeksforgeeks';
    if (hostname.includes('codechef.com')) return 'codechef';

    return null;
}

// Extract question details
function extractQuestionDetails() {
    const platform = detectPlatform();

    if (platform && extractors[platform]) {
        try {
            const data = extractors[platform]();

            // Clean up title (remove problem codes, extra whitespace)
            if (data.title) {
                data.title = data.title
                    .replace(/^[A-Z]\d*[\.\-\s]+/, '') // Remove "A. " or "1234. " prefixes
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            return {
                success: true,
                data: {
                    platform: data.platform,
                    title: data.title || document.title,
                    tags: data.tags || [],
                    difficulty: data.difficulty || null
                }
            };
        } catch (error) {
            console.error('Error extracting from platform:', error);
        }
    }

    // Fallback: use page title
    return {
        success: false,
        data: {
            platform: 'Unknown',
            title: document.title,
            tags: [],
            difficulty: null
        }
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getQuestionDetails') {
        const details = extractQuestionDetails();
        sendResponse(details);
    }
    return true; // Keep channel open for async response
});
