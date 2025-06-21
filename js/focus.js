// js/focus.js --- Updated with Clear All functionality

// --- DOM Elements ---
const timerLabel = document.getElementById('timer-label');
const timerDisplay = document.getElementById('timer-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionsList = document.getElementById('sessions-list');
const totalFocusTimeDisplay = document.getElementById('total-focus-time');
const workDurationInput = document.getElementById('work-duration-input');
const shortBreakInput = document.getElementById('short-break-input');
const longBreakInput = document.getElementById('long-break-input');

// --- ADDED: Audio Elements ---
const tickSound = document.getElementById('tick-sound');
const shortBellSound = document.getElementById('short-bell-sound');
const longBellSound = document.getElementById('long-bell-sound');


// --- Timer State ---
let user = null;
let focusSessionsCollection;
let settingsCollection;
let timerId = null;
let isPaused = true;
let unsubscribeFocus = null;

const DEFAULTS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
let workDuration = DEFAULTS.work;
let shortBreakDuration = DEFAULTS.short;
let longBreakDuration = DEFAULTS.long;

let state = { mode: 'work', timeRemaining: workDuration, cycle: 1 };
let allSessions = [];

// --- Helper function for notifications ---
function showNotification(title, body) {
  if (Notification.permission !== 'granted' || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({
    type: 'SHOW_NOTIFICATION',
    title: title,
    body: body
  });
}

// --- Settings & Firestore Functions ---
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
        } catch (error) { console.error("Error fetching settings, using defaults.", error); }
    }
    workDuration = parseInt(workDurationInput.value, 10) * 60;
    shortBreakDuration = parseInt(shortBreakInput.value, 10) * 60;
    longBreakDuration = parseInt(longBreakInput.value, 10) * 60;
    if (isPaused) resetTimer();
}

async function saveSettings() {
    const newSettings = {
        work: parseInt(workDurationInput.value, 10),
        short: parseInt(shortBreakInput.value, 10),
        long: parseInt(longBreakInput.value, 10)
    };
    workDuration = newSettings.work * 60;
    shortBreakDuration = newSettings.short * 60;
    longBreakDuration = newSettings.long * 60;
    resetTimer();
    if (typeof window.showToast === 'function') {
        window.showToast("Settings saved!", 'success');
    }
    if (user) {
        try { await settingsCollection.doc('timer').set(newSettings, { merge: true }); } 
        catch (error) { console.error("Could not save settings to cloud:", error); }
    }
}

async function saveCompletedSession() {
    if (!user || !focusSessionsCollection) return;
    const session = { duration: workDuration / 60, completedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try { await focusSessionsCollection.add(session); } catch (error) { console.error("Error saving focus session:", error); }
}

function renderHistory() {
    sessionsList.innerHTML = '';
    let totalMinutes = allSessions.reduce((total, session) => total + session.duration, 0);
    if (allSessions.length === 0) {
        sessionsList.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Completed focus sessions will appear here.</p>';
    } else {
        allSessions.forEach(session => {
            const el = document.createElement('div');
            el.className = 'bg-sky-100/60 dark:bg-sky-900/40 p-2 rounded-md flex justify-between items-center text-sm';
            const completedDate = session.completedAt ? session.completedAt.toDate() : new Date();
            el.innerHTML = `<span>Focus Session (${session.duration} min)</span><span class="font-semibold">${completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
            sessionsList.appendChild(el);
        });
    }
    totalFocusTimeDisplay.textContent = `${totalMinutes} minutes`;
}

function fetchSessions() {
    if (!focusSessionsCollection) return;
    if (unsubscribeFocus) unsubscribeFocus();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    unsubscribeFocus = focusSessionsCollection.where("completedAt", ">", yesterday).orderBy("completedAt", "desc").onSnapshot(snapshot => {
        allSessions = snapshot.docs.map(doc => doc.data());
        renderHistory();
    }, err => { console.error("Error fetching focus sessions: ", err); });
}

async function handleClearAllHistory() {
    if (!user || !focusSessionsCollection) {
        alert("You must be logged in to clear history.");
        return;
    }

    if (!confirm("Are you sure you want to delete your entire focus history? This cannot be undone.")) {
        return;
    }

    try {
        const snapshot = await focusSessionsCollection.get();
        if (snapshot.empty) {
            window.showToast("Focus history is already empty.", "success");
            return;
        }

        const batch = firebase.firestore().batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        if (typeof window.showToast === 'function') {
            window.showToast("Focus history cleared!", "success");
        }
    } catch (error) {
        console.error("Error clearing focus history:", error);
        alert("There was an error clearing your history. Please try again.");
    }
}


// --- Core Timer Functions ---
function updateDisplay() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.title = `${timerLabel.textContent} - ${timerDisplay.textContent} | LifePad+`;
}

function transitionState() {
    if (state.mode === 'work') {
        saveCompletedSession();
        if (state.cycle < 4) {
            longBellSound.pause();
            shortBellSound.currentTime = 0;
            shortBellSound.play();
            showNotification('Focus session complete!', `Time for a ${shortBreakDuration / 60}-minute break.`);
            state.mode = 'shortBreak';
            state.timeRemaining = shortBreakDuration;
            timerLabel.textContent = `Short Break (${state.cycle}/4)`;
            state.cycle++;
        } else {
            shortBellSound.pause();
            longBellSound.currentTime = 0;
            longBellSound.play();
            showNotification('Great work! Time for a long break.', `Relax for ${longBreakDuration / 60} minutes. You've earned it!`);
            state.mode = 'longBreak';
            state.timeRemaining = longBreakDuration;
            timerLabel.textContent = 'Long Break!';
            state.cycle = 1;
        }
    } else {
        longBellSound.pause();
        shortBellSound.currentTime = 0;
        shortBellSound.play();
        showNotification('Break is over!', 'Time to get back to focus.');
        state.mode = 'work';
        state.timeRemaining = workDuration;
        timerLabel.textContent = `Time to Focus! (${state.cycle}/4)`;
    }
    updateDisplay();
}

function tick() {
    if (isPaused) return;
    
    if (tickSound) {
        tickSound.currentTime = 0;
        tickSound.play().catch(e => {});
    }

    state.timeRemaining--;
    updateDisplay();

    if (state.timeRemaining < 0) {
        transitionState();
    }
}

async function startPauseTimer() {
    if (Notification.permission === 'default') {
        try { await Notification.requestPermission(); } 
        catch (err) { console.warn("Notification permission denied."); }
    }
    
    isPaused = !isPaused;
    if (!isPaused) {
        startPauseBtn.textContent = 'Pause';
        if (timerId === null) {
            tick();
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
    
    state = { mode: 'work', timeRemaining: workDuration, cycle: 1 };
    
    updateDisplay();
    startPauseBtn.textContent = 'Start';
    document.title = 'LifePad+ | Smart Daily Planner';
}

// --- Initialization ---
export function initFocus(currentUser) {
    user = currentUser;
    if (user) {
        settingsCollection = firebase.firestore().collection('users').doc(user.uid).collection('settings');
        focusSessionsCollection = firebase.firestore().collection('users').doc(user.uid).collection('focusSessions');
        fetchSessions();
        fetchSettings();
    } else {
        if (unsubscribeFocus) unsubscribeFocus();
        allSessions = [];
        renderHistory();
        fetchSettings();
    }

    const startPauseBtn = document.getElementById('start-pause-btn');
    if (!startPauseBtn.dataset.initialized) {
        startPauseBtn.addEventListener('click', startPauseTimer);
        
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', resetTimer);
        
        const workDurationInput = document.getElementById('work-duration-input');
        workDurationInput.addEventListener('change', saveSettings);
        
        const shortBreakInput = document.getElementById('short-break-input');
        shortBreakInput.addEventListener('change', saveSettings);
        
        const longBreakInput = document.getElementById('long-break-input');
        longBreakInput.addEventListener('change', saveSettings);

        const clearFocusHistoryBtn = document.getElementById('clear-focus-history-btn');
        if(clearFocusHistoryBtn) {
            clearFocusHistoryBtn.addEventListener('click', handleClearAllHistory);
        }

        startPauseBtn.dataset.initialized = 'true';
    }
    resetTimer();
}