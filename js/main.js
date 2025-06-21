// js/main.js --- FINAL VERSION

import { initNavigation, showSection, updateAuthUI } from './ui.js';
import { initTheme } from './theme.js';

// Global variable to hold the install prompt event
let deferredInstallPrompt = null;

const sectionInitializers = {
    mood: () => import('./mood.js').then(module => module.initMood),
    planner: () => import('./planner.js').then(module => module.initPlanner),
    focus: () => import('./focus.js').then(module => module.initFocus),
    notes: () => import('./notes.js').then(module => module.initNotes),
    challenge: () => import('./challenge.js').then(module => module.initChallenge),
};

const initializedSections = new Set();
let currentUser = null;

/**
 * Dynamically loads and initializes the JavaScript for a specific section.
 * @param {string} sectionId The ID of the section to initialize.
 */
async function initializeSection(sectionId) {
    if (initializedSections.has(sectionId) || !sectionInitializers[sectionId]) {
        return;
    }

    try {
        console.log(`Lazy loading module for: ${sectionId}`);
        const initFn = await sectionInitializers[sectionId]();
        initFn(currentUser); // Call the init function from the loaded module
        initializedSections.add(sectionId); // Mark as initialized
    } catch (error) {
        console.error(`Failed to load module for ${sectionId}:`, error);
    }
}

/**
 * Sets up the Intersection Observer to lazy load sections when they enter the viewport.
 */
function setupLazyLoader() {
    const sections = document.querySelectorAll('.app-section');
    
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                initializeSection(sectionId);
                obs.unobserve(entry.target);
            }
        });
    }, { 
        rootMargin: '50px',
    });

    sections.forEach(section => {
        if (!initializedSections.has(section.id)) {
            observer.observe(section);
        }
    });
}

/**
 * Helper function to show a simple toast notification.
 * Attached to the window object to be globally accessible.
 * @param {string} message The message to display in the toast.
 * @param {string} type 'success' for green, 'error' for red/default.
 */
window.showToast = function(message, type = 'error') {
    const toast = document.createElement('div');
    const toastId = `toast-${Date.now()}`;
    toast.id = toastId;
    toast.className = `fixed bottom-24 md:bottom-5 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg text-white text-center z-50 transition-all duration-300 animate-fade-in-down ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    setTimeout(() => {
        const activeToast = document.getElementById(toastId);
        if (activeToast) {
            activeToast.remove();
        }
    }, 4000);
}

/**
 * The main function that runs when the DOM is ready.
 */
function onReady() {
    initTheme();
    initNavigation();

    // --- PWA Install Prompt Logic (Corrected "Show Once" Logic for Android) ---
    const installPopup = document.getElementById('install-pwa-popup');
    const installBtn = document.getElementById('install-pwa-btn');
    const dismissBtn = document.getElementById('dismiss-pwa-btn');

    if(installPopup && installBtn && dismissBtn) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;

            const hasBeenShown = localStorage.getItem('pwaInstallPromptShown');

            // Only proceed if the prompt has never been shown before.
            if (!hasBeenShown) {
                const isAndroid = /android/i.test(navigator.userAgent);
                
                // Only show the popup if the user is on Android.
                if (isAndroid) {
                    installPopup.classList.remove('hidden');
                    setTimeout(() => installPopup.classList.add('show'), 100);
                    
                    // Set the flag immediately so this block never runs again.
                    localStorage.setItem('pwaInstallPromptShown', 'true');
                }
            }
        });

        installBtn.addEventListener('click', async () => {
            installPopup.classList.remove('show');
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                await deferredInstallPrompt.userChoice;
                deferredInstallPrompt = null;
            }
        });

        dismissBtn.addEventListener('click', () => {
            installPopup.classList.remove('show');
        });
    }

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(err => {
                    console.error('Service Worker registration failed:', err);
                });
        });
    }

    // --- Firebase Auth & App Initialization ---
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user); 
        
        const defaultSection = 'mood';
        showSection(defaultSection);
        initializeSection(defaultSection);

        setupLazyLoader();
    });

    // --- Global Online/Offline Status Listeners ---
    window.addEventListener('offline', () => {
        window.showToast("You're offline. Changes will sync when you're back.");
    });

    window.addEventListener('online', () => {
        window.showToast("You're back online!", 'success');
    });
}

// Start the application once the document is fully loaded.
document.addEventListener('DOMContentLoaded', onReady);