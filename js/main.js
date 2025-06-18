// js/main.js

import { initNavigation, showSection, updateAuthUI } from './ui.js';
import { initPlanner } from './planner.js';
import { initMood } from './mood.js';
import { initChallenge } from './challenge.js';
import { initFocus } from './focus.js';
import { initTheme } from './theme.js';
import { initNotes } from './notes.js';

function onReady() {
    initTheme();
    initNavigation();
    initMood();
    initFocus();
    showSection('planner');

    firebase.auth().onAuthStateChanged(user => {
        updateAuthUI(user); 
        initPlanner(user);
        initNotes(user);
        initChallenge(user);
    });
}

document.addEventListener('DOMContentLoaded', onReady);