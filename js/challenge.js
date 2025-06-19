// js/challenge.js

// --- DOM Elements ---
const addChallengeBtn = document.getElementById('add-challenge-btn');
const addChallengeModal = document.getElementById('add-challenge-modal');
const closeChallengeModalBtn = document.getElementById('close-challenge-modal-btn');
const addChallengeForm = document.getElementById('add-challenge-form');
const challengeGoalInput = document.getElementById('challenge-goal-input');
const challengeDaysInput = document.getElementById('challenge-days-input');
const challengeList = document.getElementById('challenge-list');

// --- State & Firestore ---
let user = null;
let challengesCollection;
let allChallenges = [];

// --- Modal Control ---
function openChallengeModal() {
    addChallengeModal.classList.remove('hidden');
}

function closeChallengeModal() {
    addChallengeModal.classList.add('hidden');
    addChallengeForm.reset();
    challengeDaysInput.value = 22; // Reset to default
}

// --- Core Functions ---
function renderChallenges() {
    challengeList.innerHTML = '';
    if (!user) {
        challengeList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">Please log in to manage your challenges.</p>`;
        return;
    }
     if (allChallenges.length === 0) {
        challengeList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No active challenges. Click the '+' button to start one!</p>`;
        return;
    }

    allChallenges.forEach(challenge => {
        const completedDays = Object.values(challenge.days).filter(Boolean).length;
        const totalDays = challenge.totalDays;
        const progress = Math.round((completedDays / totalDays) * 100);

        const challengeEl = document.createElement('div');
        challengeEl.className = 'challenge-item bg-white/50 dark:bg-slate-800/50 rounded-lg shadow-md overflow-hidden';
        challengeEl.dataset.id = challenge.id;
        challengeEl.setAttribute('aria-expanded', 'false');

        challengeEl.innerHTML = `
            <div class="challenge-header p-4 cursor-pointer">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${challenge.goal}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${completedDays} / ${totalDays} days completed</p>
                    </div>
                    <button class="delete-challenge-btn text-red-500 hover:text-red-700 p-1 z-10"><ion-icon name="trash-outline" class="text-xl"></ion-icon></button>
                </div>
                <div class="w-full bg-gray-200 rounded-full dark:bg-gray-700 mt-3">
                    <div class="bg-green-500 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style="width: ${progress}%">${progress}%</div>
                </div>
            </div>
            <div class="challenge-content hidden p-4 border-t border-gray-200 dark:border-slate-700">
                <div class="challenge-days-grid grid grid-cols-4 sm:grid-cols-7 gap-3">
                    </div>
            </div>
        `;
        
        const daysGrid = challengeEl.querySelector('.challenge-days-grid');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = challenge.startDate.toDate();

        for (let i = 1; i <= totalDays; i++) {
            const dayKey = `day${i}`;
            const isChecked = challenge.days[dayKey] || false;
            
            const dayDate = new Date(startDate.getTime());
            dayDate.setDate(dayDate.getDate() + i - 1);
            const isDisabled = dayDate > today;

            const dayEl = document.createElement('label');
            dayEl.className = `flex items-center space-x-2 p-2 rounded-lg ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700'}`;
            dayEl.innerHTML = `
                <input type="checkbox" data-day="${dayKey}" class="form-checkbox h-5 w-5 rounded text-sky-600" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                <span class="text-gray-700 dark:text-gray-300">Day ${i}</span>
            `;
            daysGrid.appendChild(dayEl);
        }
        challengeList.appendChild(challengeEl);
    });
}

async function handleAddChallenge(e) {
    e.preventDefault();
    const goal = challengeGoalInput.value.trim();
    const totalDays = parseInt(challengeDaysInput.value, 10);

    if (goal && totalDays > 0 && user) {
        const days = {};
        for (let i = 1; i <= totalDays; i++) {
            days[`day${i}`] = false;
        }
        const newChallenge = {
            goal,
            totalDays,
            startDate: firebase.firestore.Timestamp.now(),
            days
        };
        try {
            await challengesCollection.add(newChallenge);
            closeChallengeModal();
        } catch (error) {
            console.error("Error adding challenge: ", error);
            alert("Could not start the challenge. Please try again.");
        }
    }
}

async function handleDeleteChallenge(challengeId) {
    if (user && confirm("Are you sure you want to delete this challenge? This cannot be undone.")) {
        try {
            await challengesCollection.doc(challengeId).delete();
        } catch (error)            {
            console.error("Error deleting challenge: ", error);
            alert("Could not delete the challenge. Please try again.");
        }
    }
}

async function handleDayCheckboxChange(e, challengeId) {
    if (e.target.type === 'checkbox' && user) {
        const dayKey = e.target.dataset.day;
        const isChecked = e.target.checked;
        try {
            const challengeRef = challengesCollection.doc(challengeId);
            await challengeRef.update({
                [`days.${dayKey}`]: isChecked
            });
        } catch (error) {
            console.error("Error updating challenge day: ", error);
            // Revert checkbox on failure
            e.target.checked = !isChecked;
            alert("Could not update progress. Please check your connection.");
        }
    }
}

function handleChallengeClick(e) {
    const challengeItem = e.target.closest('.challenge-item');
    if (!challengeItem) return;

    const challengeId = challengeItem.dataset.id;

    if (e.target.closest('.delete-challenge-btn')) {
        handleDeleteChallenge(challengeId);
        return;
    }
    
    if (e.target.closest('.challenge-days-grid')) {
        handleDayCheckboxChange(e, challengeId);
        return;
    }
    
    // Accordion toggle logic
    if (e.target.closest('.challenge-header')) {
        const content = challengeItem.querySelector('.challenge-content');
        const isExpanded = challengeItem.getAttribute('aria-expanded') === 'true';
        challengeItem.setAttribute('aria-expanded', !isExpanded);
        content.classList.toggle('hidden');
    }
}


function fetchChallenges() {
    if (!challengesCollection) return;
    challengesCollection.orderBy("startDate", "desc").onSnapshot(snapshot => {
        allChallenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChallenges();
    }, error => {
        console.error("Error fetching challenges: ", error);
        challengeList.innerHTML = `<p class="text-center text-red-500">Could not load challenges.</p>`;
    });
}

// --- Initialization ---
export function initChallenge(currentUser) {
    user = currentUser;
    if (user) {
        challengesCollection = firebase.firestore().collection('users').doc(user.uid).collection('challenges');
        fetchChallenges();
    } else {
        allChallenges = [];
        renderChallenges();
    }

    if (!addChallengeForm.dataset.initialized) {
        addChallengeBtn.addEventListener('click', openChallengeModal);
        closeChallengeModalBtn.addEventListener('click', closeChallengeModal);
        addChallengeModal.addEventListener('click', (e) => {
            if (e.target === addChallengeModal) closeChallengeModal();
        });
        
        addChallengeForm.addEventListener('submit', handleAddChallenge);
        challengeList.addEventListener('click', handleChallengeClick);
        
        addChallengeForm.dataset.initialized = 'true';
    }
}