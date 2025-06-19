// js/theme.js
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-toggle-sun-icon');
const moonIcon = document.getElementById('theme-toggle-moon-icon');

// Define CSS variables for smooth transitions
function setThemeVariables(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.setProperty('--color-bg', '#0a0a0a');
    root.style.setProperty('--color-text', '#d4d4d4');
    root.style.setProperty('--color-card', '#1a1a1a');
    root.style.setProperty('--color-border', 'rgba(255, 255, 255, 0.1)');
  } else {
    root.style.setProperty('--color-bg', '#ffffff');
    root.style.setProperty('--color-text', '#1a1a1a');
    root.style.setProperty('--color-card', 'rgba(255, 255, 255, 0.6)');
    root.style.setProperty('--color-border', 'rgba(0, 0, 0, 0.1)');
  }
}

function applyTheme(theme) {
  // Start transition
  document.documentElement.style.transition = `
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease
  `;
  
  setThemeVariables(theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    moonIcon.classList.remove('hidden');
    sunIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
  
  // Remove transition after it's done to avoid performance issues
  setTimeout(() => {
    document.documentElement.style.transition = 'none';
  }, 300);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
}

export function initTheme() {
  // Set initial variables without transition
  setThemeVariables(
    localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
  
  // Then apply theme with transition
  setTimeout(() => {
    applyTheme(
      localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  }, 10);
  
  themeToggleBtn.addEventListener('click', toggleTheme);
}