// js/challenge.js

// --- DOM Elements ---
const startChallengeView = document.getElementById('start-challenge-view');
const activeChallengeView = document.getElementById('active-challenge-view');
const startChallengeForm = document.getElementById('start-challenge-form');
const challengeGoalInput = document.getElementById('challenge-goal-input');
const challengeGoalDisplay = document.getElementById('challenge-goal-display');
const challengeProgressBar = document.getElementById('challenge-progress-bar');
const challengeDaysGrid = document.getElementById('challenge-days-grid');
const resetChallengeBtn = document.getElementById('reset-challenge-btn');

// --- State & Firestore ---
let user = null;
let challengeDocRef;

// --- Core Functions ---

function renderDaysGrid(daysData, startDate) {
    challengeDaysGrid.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 22; i++) {
        const dayKey = `day${i}`;
        const isChecked = daysData[dayKey] || false;
        
        const dayDate = new Date(startDate.getTime());
        dayDate.setDate(dayDate.getDate() + i - 1);

        const isDisabled = dayDate > today;

        const dayEl = document.createElement('label');
        dayEl.className = `flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`;
        dayEl.innerHTML = `
            <input type="checkbox" data-day="${dayKey}" class="form-checkbox h-5 w-5 rounded text-blue-600" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
            <span class="text-gray-700 dark:text-gray-300">Day ${i}</span>
        `;
        challengeDaysGrid.appendChild(dayEl);
    }
}

function calculateProgress(daysData) {
    const completedDays = Object.values(daysData).filter(Boolean).length;
    const progress = Math.round((completedDays / 22) * 100);
    challengeProgressBar.style.width = `${progress}%`;
    challengeProgressBar.textContent = `${progress}%`;
}

function renderChallenge(challengeData) {
    if (challengeData && challengeData.goal) {
        // Active challenge view
        startChallengeView.classList.add('hidden');
        activeChallengeView.classList.remove('hidden');

        challengeGoalDisplay.textContent = challengeData.goal;
        calculateProgress(challengeData.days);
        renderDaysGrid(challengeData.days, challengeData.startDate.toDate());
    } else {
        // No challenge view
        startChallengeView.classList.remove('hidden');
        activeChallengeView.classList.add('hidden');
    }
}

async function handleStartChallenge(e) {
    e.preventDefault();
    const goal = challengeGoalInput.value.trim();
    if (goal && user) {
        const days = {};
        for (let i = 1; i <= 22; i++) {
            days[`day${i}`] = false;
        }
        const newChallenge = {
            goal: goal,
            startDate: firebase.firestore.Timestamp.now(),
            days: days
        };
        await challengeDocRef.set(newChallenge);
        challengeGoalInput.value = '';
    }
}

async function handleDayCheckboxChange(e) {
    if (e.target.type === 'checkbox' && user) {
        const dayKey = e.target.dataset.day;
        const isChecked = e.target.checked;
        // Use dot notation to update a field within a map
        await challengeDocRef.update({
            [`days.${dayKey}`]: isChecked
        });
    }
}

async function handleResetChallenge() {
    if (user && confirm("Are you sure you want to reset your challenge? All progress will be lost.")) {
        await challengeDocRef.delete();
    }
}

function fetchChallenge() {
    if (!challengeDocRef) return;
    challengeDocRef.onSnapshot(doc => {
        if (doc.exists) {
            renderChallenge(doc.data());
        } else {
            renderChallenge(null);
        }
    });
}

// --- Initialization ---

export function initChallenge(currentUser) {
    user = currentUser;
    if (user) {
        // We use a document with a fixed ID 'current' to store the user's single challenge
        challengeDocRef = firebase.firestore().collection('users').doc(user.uid).collection('challenge').doc('current');
        fetchChallenge();
    } else {
        renderChallenge(null); // Clear view on logout
    }

    if (!startChallengeForm.dataset.initialized) {
        startChallengeForm.addEventListener('submit', handleStartChallenge);
        challengeDaysGrid.addEventListener('change', handleDayCheckboxChange);
        resetChallengeBtn.addEventListener('click', handleResetChallenge);
        startChallengeForm.dataset.initialized = 'true';
    }
}