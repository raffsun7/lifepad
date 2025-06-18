// js/main.js

import { initNavigation, showSection, updateAuthUI } from './ui.js';
import { initPlanner } from './planner.js';
import { initMood } from './mood.js';
import { initChallenge } from './challenge.js';
import { initFocus } from './focus.js';
import { initTheme } from './theme.js';
import { initNotes } from './notes.js';

function onReady() {
    // --- Initialize all modules that DON'T depend on the user ---
    initTheme();
    initNavigation();
    initFocus();
    showSection('planner'); // Show the planner by default

    // --- Listen for auth changes and initialize all modules that DO depend on the user ---
    firebase.auth().onAuthStateChanged(user => {
        updateAuthUI(user); 
        
        // Initialize all user-dependent modules here
        initPlanner(user);
        initNotes(user);
        initChallenge(user);
        initMood(user); // MOVED HERE - This is the correct location
    });
}

document.addEventListener('DOMContentLoaded', onReady);