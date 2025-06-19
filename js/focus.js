// js/focus.js

// DOM Elements
const timerLabel = document.getElementById('timer-label');
const timerDisplay = document.getElementById('timer-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionsList = document.getElementById('sessions-list');
const totalFocusTimeDisplay = document.getElementById('total-focus-time');

// New DOM elements for customizable durations
const workDurationInput = document.getElementById('work-duration-input');
const shortBreakInput = document.getElementById('short-break-input');
const longBreakInput = document.getElementById('long-break-input');

// Timer State
let user = null;
let focusSessionsCollection;
let timerId = null;
let isPaused = true;

// Pomodoro settings (in seconds) - will be loaded from localStorage
let workDuration;
let shortBreakDuration;
let longBreakDuration;

// Pomodoro state machine
let state = {
    mode: 'work', // 'work', 'shortBreak', 'longBreak'
    timeRemaining: 25 * 60, // Default before settings load
    cycle: 1, // Current work cycle (1-4)
};

let allSessions = [];

// --- Settings Persistence ---
function loadSettings() {
    const savedWork = localStorage.getItem('workDuration') || 25;
    const savedShort = localStorage.getItem('shortBreakDuration') || 5;
    const savedLong = localStorage.getItem('longBreakDuration') || 15;

    workDurationInput.value = savedWork;
    shortBreakInput.value = savedShort;
    longBreakInput.value = savedLong;

    workDuration = parseInt(savedWork, 10) * 60;
    shortBreakDuration = parseInt(savedShort, 10) * 60;
    longBreakDuration = parseInt(savedLong, 10) * 60;

    // If the timer is in its default state, update it with loaded settings
    if (isPaused && state.mode === 'work' && state.timeRemaining === 25 * 60) {
        resetTimer();
    }
}

function saveSettings() {
    localStorage.setItem('workDuration', workDurationInput.value);
    localStorage.setItem('shortBreakDuration', shortBreakInput.value);
    localStorage.setItem('longBreakDuration', longBreakInput.value);
    loadSettings(); // Reload settings into the app
    resetTimer(); // Reset the timer to apply new settings immediately
    alert("Timer settings saved and timer has been reset.");
}

// --- Firestore Functions ---
function fetchSessions() {
    if (!focusSessionsCollection) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    focusSessionsCollection.where("completedAt", ">", yesterday).orderBy("completedAt", "desc").onSnapshot(snapshot => {
        allSessions = snapshot.docs.map(doc => doc.data());
        renderHistory();
    }, err => {
        console.error("Error fetching focus sessions: ", err);
    });
}

async function saveCompletedSession() {
    if (!user || !focusSessionsCollection) return;
    const session = {
        duration: workDuration / 60, // save in minutes
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await focusSessionsCollection.add(session);
    } catch (error) {
        console.error("Error saving focus session:", error);
    }
}

function renderHistory() {
    sessionsList.innerHTML = '';
    let totalMinutes = 0;
    if (allSessions.length === 0) {
        sessionsList.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Completed focus sessions will appear here.</p>';
    } else {
        allSessions.forEach(session => {
            const el = document.createElement('div');
            el.className = 'bg-sky-100/60 dark:bg-sky-900/40 p-2 rounded-md flex justify-between items-center text-sm';
            const completedDate = session.completedAt ? session.completedAt.toDate() : new Date();
            el.innerHTML = `
                <span>Focus Session (${session.duration} min)</span>
                <span class="font-semibold">${completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            sessionsList.appendChild(el);
            totalMinutes += session.duration;
        });
    }
    totalFocusTimeDisplay.textContent = `${totalMinutes} minutes`;
}


// --- Core Timer Functions ---
function updateDisplay() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function transitionState() {
    isPaused = true;
    startPauseBtn.textContent = 'Start';
    clearInterval(timerId);
    timerId = null;

    if (state.mode === 'work') {
        saveCompletedSession();
        if (state.cycle < 4) {
            state.mode = 'shortBreak';
            state.timeRemaining = shortBreakDuration;
            timerLabel.textContent = `Short Break (${state.cycle}/4)`;
            state.cycle++;
        } else {
            state.mode = 'longBreak';
            state.timeRemaining = longBreakDuration;
            timerLabel.textContent = 'Long Break! You earned it!';
            state.cycle = 1;
        }
    } else {
        state.mode = 'work';
        state.timeRemaining = workDuration;
        timerLabel.textContent = `Time to Focus! (${state.cycle}/4)`;
    }
    updateDisplay();
}

function tick() {
    if (isPaused) return;
    state.timeRemaining--;
    updateDisplay();

    if (state.timeRemaining < 0) {
        // Add a sound notification here if desired
        transitionState();
    }
}

function startPauseTimer() {
    isPaused = !isPaused;
    if (!isPaused) {
        startPauseBtn.textContent = 'Pause';
        if (timerId === null) {
            timerId = setInterval(tick, 1000);
        }
    } else {
        startPauseBtn.textContent = 'Resume';
        clearInterval(timerId);
        timerId = null;
    }
}

function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    isPaused = true;
    
    state = {
        mode: 'work',
        timeRemaining: workDuration, // Reset to the current work duration
        cycle: 1,
    };
    
    updateDisplay();
    startPauseBtn.textContent = 'Start';
    timerLabel.textContent = 'Time to Focus! (1/4)';
}

// --- Initialization ---
export function initFocus(currentUser) {
    user = currentUser;
    loadSettings(); // Load user settings or defaults

    if (user) {
        focusSessionsCollection = firebase.firestore().collection('users').doc(user.uid).collection('focusSessions');
        fetchSessions();
    } else {
        allSessions = [];
        renderHistory();
    }

    if (!startPauseBtn.dataset.initialized) {
        startPauseBtn.addEventListener('click', startPauseTimer);
        resetBtn.addEventListener('click', resetTimer);
        
        // Add event listeners for settings inputs
        workDurationInput.addEventListener('change', saveSettings);
        shortBreakInput.addEventListener('change', saveSettings);
        longBreakInput.addEventListener('change', saveSettings);

        startPauseBtn.dataset.initialized = 'true';
    }
    
    // Always update display on init
    resetTimer(); // Reset to apply loaded settings
}