// js/focus.js

// DOM Elements
const timerLabel = document.getElementById('timer-label');
const timerDisplay = document.getElementById('timer-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionsList = document.getElementById('sessions-list');
const totalFocusTimeDisplay = document.getElementById('total-focus-time');

const workDurationInput = document.getElementById('work-duration-input');
const shortBreakInput = document.getElementById('short-break-input');
const longBreakInput = document.getElementById('long-break-input');

// Timer State
let user = null;
let focusSessionsCollection;
let settingsCollection; // --- Added: For Firestore settings
let timerId = null;
let isPaused = true;
let unsubscribeFocus = null; // --- Added: To manage listener

// Default settings (in seconds)
const DEFAULTS = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
};

// Pomodoro settings (will be loaded from Firestore or defaults)
let workDuration = DEFAULTS.work;
let shortBreakDuration = DEFAULTS.short;
let longBreakDuration = DEFAULTS.long;

let state = {
    mode: 'work', // 'work', 'shortBreak', 'longBreak'
    timeRemaining: workDuration,
    cycle: 1, // Current work cycle (1-4)
};

let allSessions = [];

// --- Updated: Settings now sync with Firestore ---
async function fetchSettings() {
    if (user) {
        try {
            const doc = await settingsCollection.doc('timer').get();
            if (doc.exists) {
                const settings = doc.data();
                workDurationInput.value = settings.work || 25;
                shortBreakInput.value = settings.short || 5;
                longBreakInput.value = settings.long || 15;
            }
        } catch (error) {
            console.error("Error fetching settings, using defaults.", error);
        }
    }
    // Apply the values from the input fields
    workDuration = parseInt(workDurationInput.value, 10) * 60;
    shortBreakDuration = parseInt(shortBreakInput.value, 10) * 60;
    longBreakDuration = parseInt(longBreakInput.value, 10) * 60;
    
    // If timer is in a default state, reset to apply loaded settings
    if (isPaused) {
        resetTimer();
    }
}

async function saveSettings() {
    const newSettings = {
        work: parseInt(workDurationInput.value, 10),
        short: parseInt(shortBreakInput.value, 10),
        long: parseInt(longBreakInput.value, 10)
    };

    // Update local variables immediately for responsiveness
    workDuration = newSettings.work * 60;
    shortBreakDuration = newSettings.short * 60;
    longBreakDuration = newSettings.long * 60;
    resetTimer();
    
    // Use the global toast function defined in main.js
    if (typeof showToast === 'function') {
        showToast("Settings saved!", 'success');
    }

    if (user) {
        try {
            await settingsCollection.doc('timer').set(newSettings, { merge: true });
        } catch (error) {
            console.error("Could not save settings to cloud:", error);
        }
    }
}


// --- Firestore Functions ---
function fetchSessions() {
    if (!focusSessionsCollection) return;
    
    if (unsubscribeFocus) unsubscribeFocus(); // Unsubscribe from previous listener

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    unsubscribeFocus = focusSessionsCollection.where("completedAt", ">", yesterday).orderBy("completedAt", "desc").onSnapshot(snapshot => {
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
    // ... (This function remains the same)
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

// --- Updated: Added haptic feedback ---
function transitionState() {
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]); // Vibrate on session completion

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

    if (state.timeRemaining <= 0) {
        transitionState();
    }
}

// --- Updated: Added haptic feedback ---
function startPauseTimer() {
    isPaused = !isPaused;
    if (!isPaused) {
        if ('vibrate' in navigator) navigator.vibrate(50); // Vibrate on start
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
        timeRemaining: workDuration,
        cycle: 1,
    };
    
    updateDisplay();
    startPauseBtn.textContent = 'Start';
    timerLabel.textContent = 'Time to Focus! (1/4)';
}

// --- Initialization ---
export function initFocus(currentUser) {
    user = currentUser;

    if (user) {
        focusSessionsCollection = firebase.firestore().collection('users').doc(user.uid).collection('focusSessions');
        settingsCollection = firebase.firestore().collection('users').doc(user.uid).collection('settings'); // Init settings collection
        fetchSessions();
        fetchSettings(); // Fetch cloud settings
    } else {
        if (unsubscribeFocus) unsubscribeFocus();
        allSessions = [];
        renderHistory();
        fetchSettings(); // Load default/local settings
    }

    if (!startPauseBtn.dataset.initialized) {
        startPauseBtn.addEventListener('click', startPauseTimer);
        resetBtn.addEventListener('click', resetTimer);
        
        // Settings inputs now trigger save on change
        workDurationInput.addEventListener('change', saveSettings);
        shortBreakInput.addEventListener('change', saveSettings);
        longBreakInput.addEventListener('change', saveSettings);

        startPauseBtn.dataset.initialized = 'true';
    }
}