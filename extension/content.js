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

        // Extract rating from various possible locations
        const ratingElement = document.querySelector('.ProblemInfo') ||
            document.querySelector('span[title*="fficulty"]') ||
            document.querySelector('.sidebar .property-title:contains("Difficulty")');

        let difficulty = null;
        if (ratingElement) {
            const ratingMatch = ratingElement.textContent?.match(/\*?(\d{3,4})/);
            if (ratingMatch) {
                difficulty = ratingMatch[1]; // Return rating as-is (e.g., "1400", "2000")
            }
        }

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
        console.log('🔍 GFG Extractor Started');

        // Title extraction - multiple fallbacks
        const title = document.querySelector('.problems_problem_content__title__L2cB2')?.textContent?.trim() ||
            document.querySelector('[class*="problem_content__title"]')?.textContent?.trim() ||
            document.querySelector('.problem-title')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('.article-title')?.textContent?.trim();

        console.log('📋 Title found:', title);

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

        console.log('🏷️ Tags found:', tags);

        // Difficulty extraction - enhanced with more selectors
        let difficulty = null;

        // Log all elements that might contain difficulty
        console.log('🔍 Searching for difficulty...');
        console.log('All elements with "difficulty" in class:',
            Array.from(document.querySelectorAll('[class*="difficulty"]')).map(el => ({
                tag: el.tagName,
                className: el.className,
                text: el.textContent?.trim()
            }))
        );

        // Try multiple strategies
        const strategies = [
            // Strategy 0: Look for <strong> tag near "Difficulty:" text (most common current structure)
            () => {
                console.log('Strategy 0: Looking for <strong> near "Difficulty:" text...');
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
                            console.log('Strategy 0: Found via <strong> tag:', strong.textContent?.trim());
                            return strong.textContent?.trim();
                        }
                        // Also check siblings
                        const nextSibling = parent?.nextElementSibling;
                        if (nextSibling?.tagName === 'STRONG') {
                            console.log('Strategy 0: Found via sibling <strong>:', nextSibling.textContent?.trim());
                            return nextSibling.textContent?.trim();
                        }
                    }
                }
                return null;
            },

            // Strategy 1: Direct class selectors (current UI)
            () => {
                const el = document.querySelector('.problems_difficulty_text__Yh3c6');
                console.log('Strategy 1a (.problems_difficulty_text__Yh3c6):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },
            () => {
                const el = document.querySelector('[class*="difficulty_text"]');
                console.log('Strategy 1b ([class*="difficulty_text"]):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },

            // Strategy 2: Look for difficulty badges/spans
            () => {
                const el = document.querySelector('.problemDifficulty');
                console.log('Strategy 2a (.problemDifficulty):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },
            () => {
                const el = document.querySelector('[class*="Difficulty"]');
                console.log('Strategy 2b ([class*="Difficulty"]):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },

            // Strategy 3: Search within problem info/header sections
            () => {
                const parent = document.querySelector('.problems_header_content__title__uKWIJ')?.parentElement;
                const el = parent?.querySelector('[class*="difficulty"]');
                console.log('Strategy 3a (header parent):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },
            () => {
                const el = document.querySelector('.problem-header')?.querySelector('[class*="difficulty"]');
                console.log('Strategy 3b (.problem-header):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },

            // Strategy 4: Look for div containing "Difficulty" text
            () => {
                console.log('Strategy 4: Content-based search...');
                const allDivs = Array.from(document.querySelectorAll('div[class*="difficulty"], span[class*="difficulty"]'));
                for (const div of allDivs) {
                    const text = div.textContent?.trim();
                    if (text && (text.includes('Easy') || text.includes('Medium') || text.includes('Hard') || text.includes('Basic') || text.includes('School'))) {
                        console.log('Strategy 4: Found via content search:', text);
                        return text;
                    }
                }
                return null;
            },

            // Strategy 5: Generic difficulty selector
            () => {
                const el = document.querySelector('.problem-difficulty');
                console.log('Strategy 5a (.problem-difficulty):', el?.textContent?.trim());
                return el?.textContent?.trim();
            },
            () => {
                const el = document.querySelector('[class*="difficulty"]');
                console.log('Strategy 5b ([class*="difficulty"]):', el?.textContent?.trim());
                return el?.textContent?.trim();
            }
        ];

        // Try each strategy until we get a result
        for (let i = 0; i < strategies.length; i++) {
            try {
                const result = strategies[i]();
                if (result) {
                    difficulty = result;
                    console.log(`✅ Difficulty found using strategy ${i + 1}:`, difficulty);
                    break;
                }
            } catch (e) {
                console.error(`❌ Strategy ${i + 1} error:`, e);
                continue;
            }
        }

        // Clean up difficulty text (GFG often includes extra text)
        if (difficulty) {
            const original = difficulty;
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

            console.log('🧹 Cleaned difficulty:', original, '→', difficulty);
        } else {
            console.warn('⚠️ No difficulty found!');
        }

        console.log('📊 Final result:', { platform: 'GeeksforGeeks', title, tags, difficulty });
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
