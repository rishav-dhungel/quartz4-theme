const THEME_STORAGE_KEY = 'blogThemeName';
const MODE_STORAGE_KEY = 'blogThemeMode';
const SAVED_THEMES_KEY = 'blogSavedThemes';
const RANDOM_THEME_NAME = 'Random Palette';

let currentThemeName = localStorage.getItem(THEME_STORAGE_KEY) || 'TokyoNight';
let currentMode = localStorage.getItem(MODE_STORAGE_KEY) || 'darkMode';
let currentArticleId = '1'; // Track current article for navigation
let currentView = 'article'; // 'article', 'palette', or 'saved-themes'
let allThemes = {};
let randomThemeCache = null; // Stores the last generated { lightMode: {...}, darkMode: {...} }
let articles = {};

// --- Core Utility Functions ---

/**
 * Converts HSL to HEX.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string (#RRGGBB)
 */
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a complete, high-contrast, dynamic palette for both light and dark modes.
 * Uses random color harmonies (Triadic/Complementary) for dynamic accents.
 * @returns {{lightMode: Object, darkMode: Object}} A full theme object.
 */
function generateRandomTheme() {
    const hBase = Math.floor(Math.random() * 360);
    const sAccents = 75 + Math.floor(Math.random() * 25); // High saturation for accents (75-100)
    const sNeutrals = 5 + Math.floor(Math.random() * 5); // Low saturation for backgrounds (5-10)

    // Randomly choose a harmony type for the two accents
    const harmonyTypes = ['complementary', 'triadic', 'split-complementary', 'tetradic'];
    const harmony = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];

    let hAccent1, hAccent2;

    switch (harmony) {
        case 'complementary':
            hAccent1 = hBase;
            hAccent2 = (hBase + 180) % 360;
            break;
        case 'triadic':
            hAccent1 = (hBase + 120) % 360;
            hAccent2 = (hBase + 240) % 360;
            break;
        case 'split-complementary':
            hAccent1 = (hBase + 150) % 360;
            hAccent2 = (hBase + 210) % 360;
            break;
        case 'tetradic':
            hAccent1 = (hBase + 90) % 360;
            hAccent2 = (hBase + 180) % 360;
            break;
        default:
            hAccent1 = (hBase + 30) % 360; // Analogous fallback
            hAccent2 = (hBase + 60) % 360;
    }

    // Define Luminosity for Dark Mode (Low L = Dark BG)
    const dLuminosity = {
        bg: 8,     // light (Main BG)
        card: 14,   // lightgray (Card BG)
        code: 4,    // tertiary (Code BG)
        highlight: 25, // highlight (Blockquote BG)
        textL: 85,  // darkgray (Title Text)
        textM: 70,  // dark (Main Text)
        accentL: 60, // secondary/textHighlight
        accentM: 75,
    };

    // Define Luminosity for Light Mode (High L = Light BG)
    const lLuminosity = {
        bg: 96,     // light (Main BG)
        card: 90,   // lightgray (Card BG)
        code: 93,   // tertiary (Code BG)
        highlight: 85, // highlight (Blockquote BG)
        textL: 20,  // darkgray (Title Text)
        textM: 35,  // dark (Main Text)
        accentL: 45, // secondary/textHighlight
        accentM: 35,
    };

    // Generate Dark Mode Palette
    const darkMode = {
        light: hslToHex(hBase, sNeutrals, dLuminosity.bg),
        lightgray: hslToHex(hBase, sNeutrals, dLuminosity.card),
        gray: hslToHex(hBase, 5, 45),
        darkgray: hslToHex(hAccent1, sNeutrals + 10, dLuminosity.textL),
        dark: hslToHex(hBase, sNeutrals + 5, dLuminosity.textM),
        secondary: hslToHex(hAccent1, sAccents, dLuminosity.accentL),
        tertiary: hslToHex(hBase, sNeutrals, dLuminosity.code),
        highlight: hslToHex(hBase, 15, dLuminosity.highlight),
        textHighlight: hslToHex(hAccent2, sAccents, dLuminosity.accentM),
    };

    // Generate Light Mode Palette
    const lightMode = {
        light: hslToHex(hBase, sNeutrals, lLuminosity.bg),
        lightgray: hslToHex(hBase, sNeutrals, lLuminosity.card),
        gray: hslToHex(hBase, 5, 60),
        darkgray: hslToHex(hAccent1, sNeutrals + 10, lLuminosity.textL),
        dark: hslToHex(hBase, sNeutrals + 5, lLuminosity.textM),
        secondary: hslToHex(hAccent1, sAccents, lLuminosity.accentL),
        tertiary: hslToHex(hBase, sNeutrals, lLuminosity.code),
        highlight: hslToHex(hBase, 10, lLuminosity.highlight),
        textHighlight: hslToHex(hAccent2, sAccents, lLuminosity.accentM),
    };

    return { lightMode, darkMode };
}

// --- Local Storage Management ---

/**
 * Retrieves saved themes from Local Storage.
 * @returns {Array<Object>} List of saved theme objects.
 */
function getSavedThemes() {
    try {
        const stored = localStorage.getItem(SAVED_THEMES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error reading saved themes from storage:", e);
        return [];
    }
}

/**
 * Saves the current active theme to Local Storage.
 * @param {string} themeId A unique identifier (Name or Random ID).
 * @param {Object} themeData The {lightMode, darkMode} structure.
 */
function saveTheme(themeId, themeData) {
    let savedThemes = getSavedThemes();

    // Create a friendly, unique name
    const baseName = themeId.startsWith('Random_') ? 'Custom Palette' : themeId;
    let counter = 1;
    let themeName = baseName;

    // Ensure unique name
    while (savedThemes.some(t => t.name === themeName)) {
        themeName = `${baseName} ${counter++}`;
    }

    const newTheme = {
        id: themeId.startsWith('Random_') ? crypto.randomUUID() : themeId,
        name: themeName,
        themeData: themeData
    };

    savedThemes.unshift(newTheme); // Add to the start

    try {
        localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(savedThemes));
        return themeName;
    } catch (e) {
        console.error("Error saving theme to storage:", e);
        return null;
    }
}

/**
 * Deletes a theme from Local Storage by its unique ID.
 * @param {string} themeId The unique ID of the theme to delete.
 */
function deleteTheme(themeId) {
    let savedThemes = getSavedThemes();
    const filteredThemes = savedThemes.filter(t => t.id !== themeId);

    try {
        localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(filteredThemes));
    } catch (e) {
        console.error("Error deleting theme from storage:", e);
    }
}


// --- Theme Application and View Management ---

/**
 * Applies the selected theme and mode by updating CSS variables.
 * @param {string} themeName
 * @param {string} mode
 * @param {Object|null} explicitThemeData Optional theme data if applying a saved/random theme directly
 */
function applyTheme(themeName, mode, explicitThemeData = null) {
    let themeData = explicitThemeData;

    if (!themeData) {
        if (themeName === RANDOM_THEME_NAME && randomThemeCache) {
            themeData = randomThemeCache;
        } else if (allThemes[themeName]) {
            themeData = allThemes[themeName];
        } else {
            console.error(`Theme not found: ${themeName}`);
            return;
        }
    }

    const palette = themeData[mode];
    if (!palette) {
        console.error(`Mode not found for theme: ${themeName}, ${mode}`);
        return;
    }

    currentThemeName = themeName;

    // If the applied theme is not in the predefined list, cache its data.
    if (!allThemes[themeName]) {
          randomThemeCache = themeData;
    } else {
          randomThemeCache = null;
    }

    const root = document.documentElement;

    // Update CSS variables
    for (const key in palette) {
        root.style.setProperty(`--c-${key}`, palette[key]);
    }

    // Update mode button styles
    const lightBtn = document.getElementById('light-mode-btn');
    const darkBtn = document.getElementById('dark-mode-btn');

    const activeClass = 'bg-gray-400 text-black shadow-inner';
    const themedClass = 'themed-button';

    // Ensure buttons have the right base class for transitions before changing state
    [lightBtn, darkBtn].forEach(btn => {
        btn.classList.remove(themedClass, ...activeClass.split(' '));
        btn.classList.add(themedClass);
    });

    if (mode === 'lightMode') {
        lightBtn.classList.remove(themedClass);
        lightBtn.classList.add(...activeClass.split(' '));
    } else {
        darkBtn.classList.remove(themedClass);
        darkBtn.classList.add(...activeClass.split(' '));
    }

    // If the palette view is currently active, re-render it to show the new colors
    if (currentView === 'palette') {
        renderPaletteView();
    } else if (currentView === 'saved-themes') {
        renderSavedThemesView();
    }

    // Update dropdown to match theme name (or default if random)
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.value = allThemes[themeName] ? themeName : 'TokyoNight';
}

/**
 * Helper function to format a single mode's palette data into a string with unquoted keys.
 */
function formatMode(modeData, indentLevel = 0) {
    const indent = ' '.repeat(indentLevel);
    const keyIndent = ' '.repeat(indentLevel + 4);

    let modeString = '{\n';

    for (const [key, value] of Object.entries(modeData)) {
        // Key is unquoted, value is quoted (as it's a string)
        modeString += `${keyIndent}${key}: '${value}',\n`;
    }

    modeString = modeString.slice(0, -2) + '\n' + indent + '}';
    return modeString;
}

/**
 * Generates the complete JS object string for the current theme.
 */
function generateJSObjectString(themeName) {
    let themeData = (themeName === RANDOM_THEME_NAME && randomThemeCache) ? randomThemeCache : allThemes[themeName];

    if (!themeData && randomThemeCache) themeData = randomThemeCache; // Use cache if not found in list but exists
    if (!themeData) return "// Error: Theme data not available.";

    // Indentation for nested objects
    const lightModeString = formatMode(themeData.lightMode, 4);
    const darkModeString = formatMode(themeData.darkMode, 4);

    return `colors: {\n    lightMode: ${lightModeString},\n    darkMode: ${darkModeString}\n}`;
}

/**
 * Renders the Palette Details View in the main article container.
 */
function renderPaletteView() {
    const container = document.getElementById('article-container');
    currentView = 'palette';

    const themeToDisplay = currentThemeName;
    const mode = currentMode;
    let themeData = (themeToDisplay === RANDOM_THEME_NAME && randomThemeCache) ? randomThemeCache : allThemes[themeToDisplay];

    if (!themeData && randomThemeCache) themeData = randomThemeCache; // Fallback to cache if random
    if (!themeData) themeData = allThemes['TokyoNight'];

    const palette = themeData[mode];
    const displayName = themeToDisplay.split(/(?=[A-Z])/).join(' ');

    // Determine if the current theme is saveable (i.e., not a saved theme being viewed)
    const isSaveable = !themeToDisplay.startsWith('Custom Palette');


    // --- HTML Structure for Palette View ---
    let html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b themed-border pb-4">
            <h1 class="text-3xl themed-title font-extrabold mb-2 md:mb-0">${displayName}</h1>
            <div class="flex space-x-3">
                  ${isSaveable ? `
                    <button id="save-palette-btn" class="themed-button text-sm font-semibold py-2 px-3 rounded-lg transition duration-150 flex items-center space-x-2 bg-green-600/50 hover:bg-green-600/80 themed-border">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14a2 2 0 0 0 2-2V8l-5-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zm12-7h-4v4h-2v-4H7v-2h4V7h2v5h4z"/></svg>
                        <span>Save Active Palette</span>
                    </button>` : ''}
                <button id="back-to-articles-btn" class="themed-button text-sm font-semibold py-2 px-3 rounded-lg flex items-center space-x-2">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.293 6.293L7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"/></svg>
                    <span>Back to Articles</span>
                </button>
            </div>
        </div>
        <p class="text-sm themed-subtitle mb-8">Current Mode: ${mode === 'darkMode' ? 'Dark Mode' : 'Light Mode'}</p>

        <h2 class="text-2xl themed-title font-bold mb-4">Color Swatches</h2>
        <div id="palette-swatches" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <!-- Swatches will be injected here -->
        </div>

        <h2 class="text-2xl themed-title font-bold mb-4">Quartz Theme Object Code</h2>
        <p class="text-sm themed-text mb-4">Copy and paste this object into your Quartz configuration file (e.g., \`quartz.config.ts\`).</p>

        <div class="flex justify-end mb-2">
            <button id="copy-code-btn" class="themed-button text-xs font-semibold py-1 px-3 rounded-lg transition duration-150">
                Copy Code Object
            </button>
        </div>
        <pre class="code-block p-4 rounded-lg text-xs overflow-x-auto themed-text">
            <code id="palette-code-output" class="code-line"></code>
        </pre>
    `;

    container.innerHTML = html;

    // Populate Swatches
    const swatchesContainer = document.getElementById('palette-swatches');
    for (const [name, hex] of Object.entries(palette)) {
        const readableName = name.split(/(?=[A-Z])/).join(' ');

        const swatch = document.createElement('div');
        swatch.className = 'themed-card-bg rounded-lg overflow-hidden border themed-border p-3 flex flex-col items-center cursor-pointer hover:shadow-lg transition duration-200';
        swatch.title = `Click to copy: ${hex}`;
        swatch.innerHTML = `
            <div class="w-full h-12 rounded-lg mb-2 border border-gray-500/20" style="background-color: ${hex};"></div>
            <p class="text-xs themed-title font-semibold">${readableName.toUpperCase()}</p>
            <p class="text-xs themed-text opacity-70">${hex.toUpperCase()}</p>
        `;

        // Copy to clipboard logic for single color
        swatch.addEventListener('click', () => copyTextToClipboard(hex, swatch.querySelector('p:last-child'), hex.toUpperCase()));

        swatchesContainer.appendChild(swatch);
    }

    // Populate Code Output
    const jsObjectString = generateJSObjectString(themeToDisplay);
    document.getElementById('palette-code-output').textContent = jsObjectString;

    // Setup Listeners for the Palette View
    document.getElementById('back-to-articles-btn').addEventListener('click', () => loadArticle(currentArticleId));
    document.getElementById('copy-code-btn').addEventListener('click', (e) => copyTextToClipboard(jsObjectString, e.target, 'Copy Code Object'));

    if (isSaveable) {
        document.getElementById('save-palette-btn').addEventListener('click', (e) => {
            const button = e.target;
            const themeId = themeToDisplay === RANDOM_THEME_NAME ? `Random_${crypto.randomUUID()}` : themeToDisplay;
            const themeDataToSave = themeToDisplay === RANDOM_THEME_NAME ? randomThemeCache : allThemes[themeToDisplay];

            const newName = saveTheme(themeId, themeDataToSave);

            if (newName) {
                const originalText = button.querySelector('span').textContent;
                button.querySelector('span').textContent = `Saved as ${newName}!`;
                setTimeout(() => {
                    button.querySelector('span').textContent = originalText;
                }, 2000);
                // Refresh the navigation state to ensure 'saved-themes' is current
                document.querySelector('.sidebar-item[data-view-target="saved-themes"]').classList.remove('active');
            }
        });
    }


    // Clear active article state in sidebar
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    // Set active view in sidebar
    document.querySelector('.sidebar-item[data-view-target="palette"]')?.classList.add('active');
}

/**
  * Renders the Saved Themes View.
  */
function renderSavedThemesView() {
    const container = document.getElementById('article-container');
    currentView = 'saved-themes';
    const savedThemes = getSavedThemes();

    let html = `
        <div class="flex justify-between items-center mb-6 border-b themed-border pb-4">
            <h1 class="text-3xl themed-title font-extrabold">Your Saved Themes</h1>
            <button id="back-to-articles-btn" class="themed-button text-sm font-semibold py-2 px-3 rounded-lg flex items-center space-x-2">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.293 6.293L7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"/></svg>
                <span>Back to Articles</span>
            </button>
        </div>

        <p class="text-sm themed-text mb-6">These are the color palettes you have saved. Click 'Apply' to instantly switch the site theme, or view its details.</p>

        <div id="saved-themes-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${savedThemes.length === 0 ? `<p class="themed-text opacity-70 col-span-full">You haven't saved any themes yet. Try generating a random one and clicking 'Save Active Palette'!</p>` : ''}
            <!-- Saved Theme Cards injected here -->
        </div>
    `;
    container.innerHTML = html;
    document.getElementById('back-to-articles-btn').addEventListener('click', () => loadArticle(currentArticleId));

    const listContainer = document.getElementById('saved-themes-list');

    savedThemes.forEach(theme => {
        const palette = theme.themeData[currentMode];
        const card = document.createElement('div');
        card.className = 'themed-card-bg quartz-shadow p-4 rounded-xl border themed-border flex flex-col space-y-3 transition duration-200 hover:scale-[1.02]';
        card.innerHTML = `
            <h3 class="text-xl themed-title font-bold">${theme.name}</h3>
            <div class="flex space-x-2">
                <div class="w-1/4 h-8 rounded-md" style="background-color: ${palette.light}; border: 1px solid ${palette.dark};"></div>
                <div class="w-1/4 h-8 rounded-md" style="background-color: ${palette.lightgray}; border: 1px solid ${palette.gray};"></div>
                <div class="w-1/4 h-8 rounded-md" style="background-color: ${palette.secondary};"></div>
                <div class="w-1/4 h-8 rounded-md" style="background-color: ${palette.textHighlight};"></div>
            </div>
            <div class="flex space-x-2 mt-2">
                <button data-theme-id="${theme.id}" data-action="apply" class="flex-1 themed-button text-xs font-semibold py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600/80 themed-border">Apply</button>
                <button data-theme-id="${theme.id}" data-action="view" class="flex-1 themed-button text-xs font-semibold py-2 rounded-lg">View Details</button>
                <button data-theme-id="${theme.id}" data-action="delete" class="themed-button text-xs font-semibold py-2 px-3 rounded-lg bg-red-600/50 hover:bg-red-600/80 themed-border">
                      <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3h5v2h-2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8H3V6h4zm1-2v2h8V4H8zM7 8h10v13H7V8zm2 3v7h2v-7H9zm4 0v7h2v-7h-2z"/></svg>
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    listContainer.querySelectorAll('button[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            const themeId = e.target.getAttribute('data-theme-id');
            const action = e.target.getAttribute('data-action');
            const theme = savedThemes.find(t => t.id === themeId);

            if (!theme) return;

            if (action === 'apply') {
                localStorage.setItem(THEME_STORAGE_KEY, theme.name);
                applyTheme(theme.name, currentMode, theme.themeData);
            } else if (action === 'view') {
                localStorage.setItem(THEME_STORAGE_KEY, theme.name);
                randomThemeCache = theme.themeData; // Cache the data to display in detail view
                renderPaletteView();
            } else if (action === 'delete') {
                deleteTheme(themeId);
                renderSavedThemesView(); // Refresh the list
            }
        });
    });


    // Clear active article state in sidebar and set saved-themes active
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.sidebar-item[data-view-target="saved-themes"]').classList.add('active');
}


/**
  * Copies text content to the clipboard and gives visual feedback.
  */
function copyTextToClipboard(text, element, originalContent) {

    if (element.id === 'copy-code-btn') {
          // For the button, store original content in a data attribute
          if (!element.getAttribute('data-original-text')) {
              element.setAttribute('data-original-text', originalContent);
          }
    }

    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();

    let success = false;
    try {
        document.execCommand('copy');
        success = true;
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
    document.body.removeChild(tempInput);

    if (success) {
        element.textContent = 'COPIED!';
        setTimeout(() => {
            element.textContent = originalContent;
        }, 1200);
    } else {
          element.textContent = 'Error!';
        setTimeout(() => {
            element.textContent = originalContent;
        }, 1200);
    }
}

// --- Article Content Definitions (Updated) ---
articles = {
    1: {
        title: "The Compass and the Map",
        content: `
            <h1 class="text-3xl md:text-5xl themed-title font-extrabold mb-4">The Compass and the Map: Ambition as Direction, Competence as Path</h1>
            <p class="text-sm themed-subtitle mb-8">Published on October 1, 2025 by The Mastery Project</p>

            <div class="article-content text-lg">
                <p>In the journey of life, Ambition serves as the compass—it gives us the direction, the "North Star" we aim for. But it is Competence that acts as the map—the detailed knowledge and skill required to actually navigate the terrain and reach that destination.</p>

                <h2>The Danger of Misalignment</h2>
                <p>A grand ambition without the underlying competence leads to frustration and stagnation. Conversely, immense competence without ambition often results in a life of underachievement, where potential is never fully deployed. True fulfillment is found in the relentless alignment of the two.</p>

                <blockquote class="themed-highlight-bg p-4 my-6 rounded-lg border-l-4 themed-border themed-text text-sm md:text-base italic">
                    The greatest ambition is useless if you don't master the small skills required for the first step. Build the path before demanding the horizon.
                </blockquote>

                <h3>Formalizing the Goal Structure</h3>
                <p>We can view this duality through a simple, structured model. Every major life goal requires a clear statement of the desired outcome (Ambition) and a clear list of the prerequisite skills (Competence):</p>

                <pre class="code-block p-4 rounded-lg text-sm overflow-x-auto"><code class="code-line">interface <span style="color:var(--c-textHighlight);">GoalStrategy</span> {</code>
                <code class="code-line">  <span style="color:var(--c-secondary);">ambition</span>: <span style="color:var(--c-darkgray);">string</span>; <span style="color:var(--c-gray);">// The long-term objective (The Compass)</span></code>
                <code class="code-line">  <span style="color:var(--c-secondary);">competence</span>: <span style="color:var(--c-darkgray);">string</span>[]; <span style="color:var(--c-gray);">// The required skills/tools (The Map)</span></code>
                <code class="code-line">}</code>
                </pre>

                <h2>Developing the Path</h2>
                <p>Developing competence is not about talent; it is about deliberate practice and feedback. It means breaking down the ambition into measurable milestones and systematically acquiring the skills needed for each segment of the map. This turns the overwhelming grandeur of the ambition into a series of achievable tasks.</p>
            </div>
        `
    },
    2: {
        title: "The Enemy of Greatness",
        content: `
            <h1 class="text-3xl md:text-5xl themed-title font-extrabold mb-4">Why 'Good Enough' is the Enemy of Greatness in Life</h1>
            <p class="text-sm themed-subtitle mb-8">Published on September 25, 2025 by The Mastery Project</p>

            <div class="article-content text-lg">
                <p>The biggest threat to extraordinary achievement is not spectacular failure, but the seduction of mediocrity. The phrase "good enough" signals the precise moment when effort ceases, curiosity dies, and personal growth plateaus. It’s the comfortable ceiling we place over our potential.</p>

                <h2>The Plateau of Acceptability</h2>
                <p>To strive for greatness—whether in a career, a relationship, or a creative endeavor—requires moving past the point of simple acceptability. Deep competence demands intentional friction, a continuous search for complexity, and a commitment to refining skills long after they have become merely "functional."</p>

                <h3>The Loop of Continuous Improvement</h3>
                <p>Greatness is achieved through a sustained, internal process of refinement. It is about committing to a cycle where the goal is always to exceed your last best effort, not just meet a baseline standard:</p>
                <pre class="code-block p-4 rounded-lg text-sm overflow-x-auto"><code class="code-line"><span style="color:var(--c-secondary);">function</span> <span style="color:var(--c-textHighlight);">striveForGreatness</span>(<span style="color:var(--c-darkgray);">competence</span>) {</code>
                <code class="code-line">  <span style="color:var(--c-secondary);">if</span> (<span style="color:var(--c-darkgray);">competence</span>.isAdequate()) {</code>
                <code class="code-line">    <span style="color:var(--c-gray);">// Danger zone: Good enough is the enemy.</span></code>
                <code class="code-line">    <span style="color:var(--c-textHighlight);">return</span> <span style="color:var(--c-secondary);">refineAndChallenge</span>(<span style="color:var(--c-darkgray);">competence</span>);</code>
                <code class="code-line">  } <span style="color:var(--c-secondary);">else</span> {</code>
                <code class="code-line">    <span style="color:var(--c-textHighlight);">return</span> <span style="color:var(--c-darkgray);">competence</span>.continueBuilding();</code>
                <code class="code-line">  }</code>
                <code class="code-line">}</code>
                </pre>

                <h2>Embracing Discomfort</h2>
                <p>The only way to push beyond 'good enough' is to deliberately seek out challenging projects or uncomfortable learning situations. Discomfort is the signal that you are working at the edge of your current ability, which is precisely where growth occurs. Choose the difficult path, and greatness will follow.</p>
            </div>
        `
    },
    3: {
        title: "The Quiet Power of Effort",
        content: `
            <h1 class="text-3xl md:text-5xl themed-title font-extrabold mb-4">The Quiet Power of Consistent Effort: Building Life's Foundation</h1>
            <p class="text-sm themed-subtitle mb-8">Published on September 18, 2025 by The Mastery Project</p>

            <div class="article-content text-lg">
                <p>While ambition is loud and draws attention, consistent effort is quiet, often invisible, yet infinitely more powerful. It is the principle of compounding interest applied to life—small, daily investments in skill and habit that result in exponential long-term growth.</p>

                <h2>The Compounding Effect</h2>
                <p>We overestimate what we can do in a day and underestimate what we can do in a decade. A 1% improvement in any area of competence, every single day, does not lead to a 365% improvement over a year; the growth compounds dramatically:</p>

                <pre class="code-block p-4 rounded-lg text-sm overflow-x-auto"><code class="code-line"><span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-textHighlight);">dailyImprovementFactor</span> = <span style="color:var(--c-darkgray);">1.01</span>;</code>
                <code class="code-line"><span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-darkgray);">daysInYear</span> = <span style="color:var(--c-textHighlight);">365</span>;</code>
                <code class="code-line"><span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-textHighlight);">totalGrowth</span> = Math.pow(<span style="color:var(--c-darkgray);">dailyImprovementFactor</span>, <span style="color:var(--c-darkgray);">daysInYear</span>);</code>
                <code class="code-line"><span style="color:var(--c-gray);">// Result: ~37.8. A 37x return on investment.</span></code>
                </pre>

                <blockquote class="themed-highlight-bg p-4 my-6 rounded-lg border-l-4 themed-border themed-text text-sm md:text-base italic">
                    Discipline is the bridge between goals and accomplishment. It is the unglamorous, repetitive action that eventually makes the ambitious look inevitable.
                </blockquote>
            </div>
        `
    },
    4: {
        title: "Ambition Meets Meaningful Work",
        content: `
            <h1 class="text-3xl md:text-5xl themed-title font-extrabold mb-4">Redefining Success: When Ambition Meets Meaningful Work</h1>
            <p class="text-sm themed-subtitle mb-8">Published on September 10, 2025 by The Mastery Project</p>

            <div class="article-content text-lg">
                <p>In the modern world, ambition is often narrowly defined by external markers: wealth, title, or status. But true, sustainable success emerges when our drive for achievement (Ambition) is directly coupled with work that aligns with our deepest values (Meaning).</p>

                <h2>The Internal Metric of Fulfillment</h2>
                <p>External validation is a temporary boost; internal fulfillment is the fuel that prevents burnout. When your competence is applied to a task you find meaningful—solving a real problem, helping others, creating genuine value—the motivation becomes intrinsic and enduring.</p>

                <h3>Measuring True Success</h3>
                <p>We must adjust our measurement protocols to favor internal satisfaction over mere external achievement. Success should be weighted not just by public recognition, but by private fulfillment:</p>
                <pre class="code-block p-4 rounded-lg text-sm overflow-x-auto"><code class="code-line"><span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-textHighlight);">calculateSuccess</span> = (<span style="color:var(--c-darkgray);">validationScore</span>, <span style="color:var(--c-darkgray);">fulfillmentScore</span>) <span style="color:var(--c-secondary);">=&gt;</span> {</code>
                <code class="code-line">  <span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-textHighlight);">alignmentFactor</span> = <span style="color:var(--c-darkgray);">fulfillmentScore</span> * <span style="color:var(--c-darkgray);">0.75</span>;</code>
                <code class="code-line">  <span style="color:var(--c-textHighlight);">return</span> <span style="color:var(--c-darkgray);">validationScore</span> * <span style="color:var(--c-darkgray);">0.25</span> + <span style="color:var(--c-darkgray);">alignmentFactor</span>; <span style="color:var(--c-gray);">// Heavily favor fulfillment</span></code>
                <code class="code-line">};</code>
                </pre>
            </div>
        `
    },
    5: {
        title: "The Cycle of Mastery",
        content: `
            <h1 class="text-3xl md:text-5xl themed-title font-extrabold mb-4">The Cycle of Mastery: From Beginner's Mind to Expert Execution</h1>
            <p class="text-sm themed-subtitle mb-8">Published on September 2, 2025 by The Mastery Project</p>

            <div class="article-content text-lg">
                <p>Competence is not a static state but a dynamic process—a continuous cycle of learning, practicing, failing, and refining. True mastery requires not only technical skill but also the psychological humility to maintain the Beginner's Mind (Shoshin), even when operating at an expert level.</p>

                <h2>The Four Stages of Competence</h2>
                <p>The path to mastery is typically charted through four stages, moving from ignorance to effortless execution. The most common trap is settling in the third stage, where skills are competent but still require taxing conscious effort. True ambition pushes us into the fourth, the realm of unconscious competence (flow state).</p>

                <blockquote class="themed-highlight-bg p-4 my-6 rounded-lg border-l-4 themed-border themed-text text-sm md:text-base italic">
                    An expert is a beginner who never quit. The only difference is the scale and complexity of the problems they choose to face.
                </blockquote>

                <h3>Maintaining Shoshin in Execution</h3>
                <p>To avoid stagnation, the expert must consciously adopt the curiosity and humility of a novice. This ensures every project, no matter how routine, becomes an opportunity for refinement. The expert begins by questioning the foundation:</p>
                <pre class="code-block p-4 rounded-lg text-sm overflow-x-auto"><code class="code-line"><span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-textHighlight);">expertExecution</span> = (<span style="color:var(--c-darkgray);">currentProject</span>) <span style="color:var(--c-secondary);">=&gt;</span> {</code>
                <code class="code-line">  <span style="color:var(--c-secondary);">if</span> (<span style="color:var(--c-darkgray);">currentProject</span>.isRoutine) {</code>
                <code class="code-line">    <span style="color:var(--c-secondary);">const</span> <span style="color:var(--c-darkgray);">newApproach</span> = <span style="color:var(--c-textHighlight);">askWhatIfIamWrong</span>(); <span style="color:var(--c-gray);">// Shoshin injection point</span></code>
                <code class="code-line">    <span style="color:var(--c-darkgray);">currentProject</span>.apply(<span style="color:var(--c-darkgray);">newApproach</span>);</code>
                <code class="code-line">  }</code>
                <code class="code-line">  <span style="color:var(--c-textHighlight);">return</span> <span style="color:var(--c-darkgray);">currentProject</span>.executeWithPrecision();</code>
                <code class="code-line">};</code>
                </pre>
            </div>
        `
    }
};

/**
  * Renders the article content and sets up sidebar navigation.
  */
function setupArticles() {
    const listContainer = document.getElementById('article-list');

    // Generate list items for articles
    listContainer.innerHTML = Object.keys(articles).map(id => `
        <li class="sidebar-item" data-article-id="${id}">
            <span class="sidebar-link themed-text">${articles[id].title}</span>
        </li>
    `).join('');


    // Function to load article content
    window.loadArticle = (articleId) => {
        const article = articles[articleId];
        const container = document.getElementById('article-container');

        if (article) {
            currentArticleId = articleId;
            currentView = 'article';
            container.innerHTML = article.content;
            container.setAttribute('data-view', 'article');

            // Update active state in sidebar
            document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
            document.querySelector(`.sidebar-item[data-article-id="${articleId}"]`).classList.add('active');
            document.querySelector('.sidebar-item[data-view-target="saved-themes"]')?.classList.remove('active');
        }
    };

    // Setup listeners for sidebar links
    listContainer.querySelectorAll('.sidebar-item[data-article-id]').forEach(item => {
        item.addEventListener('click', () => {
            const articleId = item.getAttribute('data-article-id');
            loadArticle(articleId);
        });
    });

    // Setup listener for management list (Saved Themes)
    document.querySelector('.sidebar-item[data-view-target="saved-themes"]').addEventListener('click', () => {
        renderSavedThemesView();
    });

    // Load the current article on setup (default 1)
    loadArticle(currentArticleId);
}

/**
  * Sets up the listener for the Random Palette button and the View Active Palette button.
  */
function setupPaletteButtons() {
    // 1. Generate Random Button
    document.getElementById('random-palette-btn').addEventListener('click', () => {
        // 1. Generate new random theme
        randomThemeCache = generateRandomTheme();
        currentThemeName = RANDOM_THEME_NAME;
        localStorage.setItem(THEME_STORAGE_KEY, currentThemeName);

        // 2. Apply the theme
        applyTheme(currentThemeName, currentMode);

        // 3. Switch to palette view
        renderPaletteView();

        // Reset dropdown display
        document.getElementById('theme-dropdown').value = 'TokyoNight';
    });

    // 2. View Active Palette Button
    document.getElementById('view-palette-btn').addEventListener('click', () => {
        // Simply switch to palette view for the currently applied theme
        renderPaletteView();
    });
}

/**
  * Sets up the theme dropdown and mode buttons.
  */
function setupThemePicker() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.innerHTML = '';

    const themeNames = Object.keys(allThemes);
    themeNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.split(/(?=[A-Z])/).join(' ');
        dropdown.appendChild(option);
    });

    dropdown.value = (allThemes[currentThemeName]) ? currentThemeName : 'TokyoNight';

    dropdown.addEventListener('change', (e) => {
        const newThemeName = e.target.value;
        currentThemeName = newThemeName;
        localStorage.setItem(THEME_STORAGE_KEY, currentThemeName);
        randomThemeCache = null; // Clear random cache when switching to predefined
        applyTheme(currentThemeName, currentMode);

        // If the user is currently viewing the palette, update the view
        if (currentView === 'palette') {
            renderPaletteView();
        }
    });

    document.getElementById('light-mode-btn').addEventListener('click', () => setMode('lightMode'));
    document.getElementById('dark-mode-btn').addEventListener('click', () => setMode('darkMode'));
}

/**
  * Switches between lightMode and darkMode.
  * @param {string} mode 'lightMode' or 'darkMode'
  */
function setMode(mode) {
    currentMode = mode;
    localStorage.setItem(MODE_STORAGE_KEY, currentMode);
    // Pass true to indicate mode change, triggering view refresh
    applyTheme(currentThemeName, currentMode);
}

/**
 * Parses the theme data from colors.json and initializes the app.
 */
async function initializeApp() {
    try {
        // Fetch external JSON file instead of reading from <script>
        const response = await fetch('colors-cleaned.json');
        const fullThemeData = await response.json();
        allThemes = fullThemeData.colors;

        setupThemePicker();
        setupArticles();
        setupPaletteButtons();

        // Check if the last loaded theme was a saved theme and load its data
        if (!allThemes[currentThemeName]) {
            const savedThemes = getSavedThemes();
            const lastTheme = savedThemes.find(t => t.name === currentThemeName);
            if (lastTheme) {
                randomThemeCache = lastTheme.themeData;
            } else {
                // Fallback if local storage theme name is corrupt/deleted
                currentThemeName = 'TokyoNight';
                localStorage.setItem(THEME_STORAGE_KEY, currentThemeName);
            }
        }

        applyTheme(currentThemeName, currentMode);

    } catch (e) {
        console.error("Error initializing app or parsing theme data:", e);

        // Fallback theme in case JSON cannot be loaded
        allThemes = {
            "Default": {
                "darkMode": {
                    "light": "#111",
                    "lightgray": "#222",
                    "gray": "#666",
                    "darkgray": "#fff",
                    "dark": "#ccc",
                    "secondary": "#0cf",
                    "tertiary": "#000",
                    "highlight": "#333",
                    "textHighlight": "#f00"
                },
                "lightMode": {
                    "light": "#fff",
                    "lightgray": "#eee",
                    "gray": "#999",
                    "darkgray": "#333",
                    "dark": "#444",
                    "secondary": "#06f",
                    "tertiary": "#f9f9f9",
                    "highlight": "#ddd",
                    "textHighlight": "#009900"
                }
            }
        };
        currentThemeName = 'Default';
        applyTheme(currentThemeName, currentMode);
    }
}


// Start the application
window.onload = initializeApp;
