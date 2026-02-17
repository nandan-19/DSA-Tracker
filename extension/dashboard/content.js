// Content script for extracting question details from various coding platforms

// Platform-specific extractors
const extractors = {
    leetcode: () => {
        // Title selectors
        const title = document.querySelector('a[class*="text-title"]')?.textContent?.trim() ||
            document.querySelector('[data-cy="question-title"]')?.textContent?.trim() ||
            document.querySelector('div[class*="question-title"]')?.textContent?.trim() ||
            document.querySelector('.text-title-large')?.textContent?.trim();

        // Tag selectors - updated for current LeetCode UI
        const tagElements = document.querySelectorAll('a[class*="topic-tag"], a.topic-tag, div[class*="TopicTags"] a, a[href*="/tag/"]');
        const tags = Array.from(tagElements)
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        // Difficulty selectors
        const difficulty = document.querySelector('div[class*="text-difficulty"]')?.textContent?.trim() ||
            document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard')?.textContent?.trim() ||
            document.querySelector('[diff]')?.getAttribute('diff');

        console.log('LeetCode extraction:', { title, tags, difficulty });
        return { platform: 'LeetCode', title, tags, difficulty };
    },

    codeforces: () => {
        const title = document.querySelector('.problem-statement .title')?.textContent?.trim() ||
            document.querySelector('.header .title')?.textContent?.trim();

        const tags = Array.from(document.querySelectorAll('.tag-box'))
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        const rating = document.querySelector('.ProblemInfo')?.textContent?.match(/\*(\d+)/)?.[1];
        const difficulty = rating || null;

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
        // Title extraction - multiple fallbacks
        const title = document.querySelector('.problems_problem_content__title__L2cB2')?.textContent?.trim() ||
            document.querySelector('[class*="problem_content__title"]')?.textContent?.trim() ||
            document.querySelector('.problem-title')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('.article-title')?.textContent?.trim();

        // Tags extraction - multiple fallbacks for GFG's dynamic structure
        const tagElements = document.querySelectorAll(
            '.problems_tag_container__kWANg a, ' +
            '[class*="tag_container"] a, ' +
            '.problem-tags a, ' +
            '.article-tags a, ' +
            'a[href*="/explore?category"]'
        );

        const tags = Array.from(tagElements)
            .map(tag => tag.textContent.trim())
            .filter(Boolean);

        // Difficulty extraction - enhanced with more selectors
        let difficulty = null;

        // Try multiple strategies
        const strategies = [
            // Strategy 0: Look for <strong> tag near "Difficulty:" text (most common current structure)
            () => {
                // Find all text nodes containing "Difficulty:"
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null
                );

                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent?.includes('Difficulty:')) {
                        // Check if the parent or nearby element has a <strong> tag
                        const parent = node.parentElement;
                        const strong = parent?.querySelector('strong');
                        if (strong) {
                            return strong.textContent?.trim();
                        }
                        // Also check siblings
                        const nextSibling = parent?.nextElementSibling;
                        if (nextSibling?.tagName === 'STRONG') {
                            return nextSibling.textContent?.trim();
                        }
                    }
                }
                return null;
            },

            // Strategy 1: Direct class selectors (current UI)
            () => document.querySelector('.problems_difficulty_text__Yh3c6')?.textContent?.trim(),
            () => document.querySelector('[class*="difficulty_text"]')?.textContent?.trim(),

            // Strategy 2: Look for difficulty badges/spans
            () => document.querySelector('.problemDifficulty')?.textContent?.trim(),
            () => document.querySelector('[class*="Difficulty"]')?.textContent?.trim(),

            // Strategy 3: Search within problem info/header sections
            () => document.querySelector('.problems_header_content__title__uKWIJ')?.parentElement
                ?.querySelector('[class*="difficulty"]')?.textContent?.trim(),
            () => document.querySelector('.problem-header')?.querySelector('[class*="difficulty"]')?.textContent?.trim(),

            // Strategy 4: Look for div containing "Difficulty" text
            () => {
                const allDivs = Array.from(document.querySelectorAll('div[class*="difficulty"], span[class*="difficulty"]'));
                for (const div of allDivs) {
                    const text = div.textContent?.trim();
                    if (text && (text.includes('Easy') || text.includes('Medium') || text.includes('Hard') || text.includes('Basic') || text.includes('School'))) {
                        return text;
                    }
                }
                return null;
            },

            // Strategy 5: Generic difficulty selector
            () => document.querySelector('.problem-difficulty')?.textContent?.trim(),
            () => document.querySelector('[class*="difficulty"]')?.textContent?.trim()
        ];

        // Try each strategy until we get a result
        for (const strategy of strategies) {
            try {
                const result = strategy();
                if (result) {
                    difficulty = result;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // Clean up difficulty text (GFG often includes extra text)
        if (difficulty) {
            difficulty = difficulty
                .replace(/Difficulty\s*:\s*/i, '')
                .replace(/Level\s*:\s*/i, '')
                .trim();

            // Normalize GFG specific difficulty levels
            if (difficulty.toLowerCase().includes('school')) difficulty = 'School';
            else if (difficulty.toLowerCase().includes('basic')) difficulty = 'Basic';
            else if (difficulty.toLowerCase().includes('easy')) difficulty = 'Easy';
            else if (difficulty.toLowerCase().includes('medium')) difficulty = 'Medium';
            else if (difficulty.toLowerCase().includes('hard')) difficulty = 'Hard';
        }

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
