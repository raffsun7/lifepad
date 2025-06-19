// js/theme.js

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-toggle-sun-icon');
const moonIcon = document.getElementById('theme-toggle-moon-icon');

// This function applies the theme by adding/removing the 'dark' class
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

// This function toggles the theme and saves the preference
function toggleTheme() {
    // Get the current theme from localStorage, or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

// This is the main initialization function
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine the initial theme
    let initialTheme;
    if (savedTheme) {
        // 1. Use saved theme if it exists
        initialTheme = savedTheme;
    } else if (systemPrefersDark) {
        // 2. Otherwise, use system preference
        initialTheme = 'dark';
    } else {
        // 3. Default to light
        initialTheme = 'light';
    }
    
    applyTheme(initialTheme);

    // Add click listener to the toggle button
    themeToggleBtn.addEventListener('click', toggleTheme);
}