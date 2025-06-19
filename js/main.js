// js/main.js

import { initNavigation, showSection, updateAuthUI } from './ui.js';
import { initTheme } from './theme.js';

// A map of section IDs to functions that will dynamically load the corresponding module.
const sectionInitializers = {
    mood: () => import('./mood.js').then(module => module.initMood),
    planner: () => import('./planner.js').then(module => module.initPlanner),
    focus: () => import('./focus.js').then(module => module.initFocus),
    notes: () => import('./notes.js').then(module => module.initNotes),
    challenge: () => import('./challenge.js').then(module => module.initChallenge),
};

// A set to keep track of which sections have already been initialized.
const initializedSections = new Set();
let currentUser = null;

/**
 * Dynamically loads and initializes the JavaScript for a specific section.
 * @param {string} sectionId The ID of the section to initialize.
 */
async function initializeSection(sectionId) {
    // Do nothing if the section is already initialized or doesn't have an initializer.
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
                obs.unobserve(entry.target); // Stop observing the element once it has been loaded.
            }
        });
    }, { 
        rootMargin: '50px', // Start loading when the section is 50px away from the viewport.
    });

    sections.forEach(section => {
        // Only observe sections that haven't been initialized yet.
        if (!initializedSections.has(section.id)) {
            observer.observe(section);
        }
    });
}

/**
 * The main function that runs when the DOM is ready.
 */
function onReady() {
    // --- Initialize modules that DON'T depend on the user ---
    initTheme();
    initNavigation();

    // Listen for changes in authentication state (login/logout).
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user); 
        
        // --- Initialize the default section immediately ---
        const defaultSection = 'mood';
        showSection(defaultSection);
        initializeSection(defaultSection);

        // --- Set up lazy loading for all other sections ---
        setupLazyLoader();
    });
}

// Start the application once the document is fully loaded.
document.addEventListener('DOMContentLoaded', onReady);