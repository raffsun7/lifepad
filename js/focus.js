// js/focus.js

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const breakMessage = document.getElementById('break-message');

// Timer State
let timerId = null;
let mode = 'work'; // 'work' or 'break'
let timeRemaining = 25 * 60; // in seconds
let isPaused = true;

const workDuration = 25 * 60;
const breakDuration = 5 * 60;

// --- Core Timer Functions ---

function updateDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function tick() {
    timeRemaining--;
    updateDisplay();

    if (timeRemaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        
        // Play a sound (optional, you would need an audio file)
        // new Audio('path/to/sound.mp3').play();

        if (mode === 'work') {
            mode = 'break';
            timeRemaining = breakDuration;
            breakMessage.classList.remove('hidden'); // Show break message
            startPauseBtn.textContent = 'Start Break';
        } else {
            mode = 'work';
            timeRemaining = workDuration;
            breakMessage.classList.add('hidden'); // Hide break message
            startPauseBtn.textContent = 'Start';
        }
        updateDisplay();
        isPaused = true;
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
        startPauseBtn.textContent = 'Start';
        clearInterval(timerId);
        timerId = null;
    }
}

function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    isPaused = true;
    mode = 'work';
    timeRemaining = workDuration;
    updateDisplay();
    startPauseBtn.textContent = 'Start';
    breakMessage.classList.add('hidden');
}


// --- Initialization ---

export function initFocus() {
    startPauseBtn.addEventListener('click', startPauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    updateDisplay(); // Show initial time
}