// js/main.js

import { initNavigation, showSection, updateAuthUI } from './ui.js';
import { initMood } from './mood.js';
import { initPlanner } from './planner.js';
import { initChallenge } from './challenge.js';
import { initFocus } from './focus.js';
import { initTheme } from './theme.js';
import { initNotes } from './notes.js';

function onReady() {
    // --- Initialize all modules that DON'T depend on the user ---
    initTheme();
    initNavigation();
    showSection('mood'); // Show the planner by default

    firebase.auth().onAuthStateChanged(user => {
        updateAuthUI(user); 
        
        // Initialize all user-dependent modules here
        initPlanner(user);
        initNotes(user);
        initChallenge(user);
        initMood(user);
        initFocus(user); // MOVED HERE - Now depends on user for history
    });
}

document.addEventListener('DOMContentLoaded', onReady);