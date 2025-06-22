// js/mood.js --- FINAL UNIFIED VERSION

// --- State & Firestore ---
let user = null;
let moodHistoryCollection;
let unsubscribeMoodHistory = null; // ADDED: For performance and stability

// --- Modal Control ---
function openHistoryModal(item) {
    const historyDetailModal = document.getElementById('history-detail-modal');
    const historyModalDate = document.getElementById('history-modal-date');
    const historyModalUserQuery = document.getElementById('history-modal-user-query');
    const historyModalAiResponse = document.getElementById('history-modal-ai-response');

    historyModalDate.textContent = item.createdAt
        ? new Date(item.createdAt.seconds * 1000).toLocaleString(undefined, {
              month: 'long', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
          })
        : '';
    historyModalUserQuery.textContent = `"${item.userQuery}"`;
    historyModalAiResponse.textContent = item.aiResponse;
    historyDetailModal.classList.remove('hidden');
}

function closeHistoryModal() {
    document.getElementById('history-detail-modal').classList.add('hidden');
}

// --- AI Interaction via /api/mood ---
async function handleGetAIResponse(e) {
    e.preventDefault();
    const moodInput = document.getElementById('mood-input');
    const userInput = moodInput.value.trim();

    if (!userInput) {
        alert('Please write something to share how you are feeling.');
        return;
    }
    if (!user) {
        alert('Please log in to talk with Sarah.');
        return;
    }

    const aiResponseArea = document.getElementById('ai-response-area');
    const aiResponseContent = document.getElementById('ai-response-content');
    const aiLoadingSpinner = document.getElementById('ai-loading-spinner');

    aiResponseArea.classList.remove('hidden');
    aiResponseContent.classList.add('hidden');
    aiLoadingSpinner.classList.remove('hidden');

    try {
        const response = await fetch('/api/mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: userInput }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        aiResponseContent.textContent = aiText;
        await saveConversation(userInput, aiText);
    } catch (error) {
        console.error('AI Fetch Error:', error);
        aiResponseContent.textContent =
            "I'm sorry, I couldn't connect with my thoughts right now. Please try again in a moment.";
    } finally {
        aiLoadingSpinner.classList.add('hidden');
        aiResponseContent.classList.remove('hidden');
        moodInput.value = '';
    }
}

// --- Firestore & History ---
async function saveConversation(userInput, aiResponse) {
    if (!moodHistoryCollection) return;
    try {
        await moodHistoryCollection.add({
            userQuery: userInput,
            aiResponse: aiResponse,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

function renderHistory(historyItems) {
    const pastChatsList = document.getElementById('past-chats-list');
    const loader = document.getElementById('mood-history-loader');
    if (loader) {
        loader.style.display = 'none';
    }

    pastChatsList.innerHTML = '';
    if (historyItems.length === 0) {
        pastChatsList.innerHTML = `<p class="text-center text-xs text-slate-500 dark:text-slate-400">Your saved chats will appear here.</p>`;
        return;
    }
    historyItems.forEach((item) => {
        const historyEl = document.createElement('div');
        historyEl.className =
            'history-item flex items-center justify-between w-full text-left bg-black/5 dark:bg-black/20 p-2 rounded-lg animate-fade-in-down';

        const clickableArea = document.createElement('div');
        clickableArea.className = 'history-item-btn flex-grow cursor-pointer pr-2 min-w-0';
        clickableArea.dataset.historyItem = JSON.stringify(item);
        
        const query = item.userQuery;
        const truncatedQuery = query.length > 35 ? query.substring(0, 35) + '...' : query;
        
        clickableArea.innerHTML = `<p class="font-medium text-slate-700 dark:text-slate-300 text-sm whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none">${truncatedQuery}</p>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-history-btn flex-shrink-0 p-1 text-red-500 hover:text-red-700 rounded-full';
        deleteBtn.dataset.id = item.id;
        deleteBtn.innerHTML = `<ion-icon name="trash-outline" class="text-lg pointer-events-none"></ion-icon>`;

        historyEl.appendChild(clickableArea);
        historyEl.appendChild(deleteBtn);
        pastChatsList.appendChild(historyEl);
    });
}

function fetchHistory() {
    if (!moodHistoryCollection) return;
    // ADDED: Unsubscribe from old listener to prevent memory leaks
    if (unsubscribeMoodHistory) unsubscribeMoodHistory();

    unsubscribeMoodHistory = moodHistoryCollection.orderBy('createdAt', 'desc').limit(20).onSnapshot((snapshot) => {
        const history = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        renderHistory(history);
    });
}

function handleHistoryClick(e) {
    const deleteBtn = e.target.closest('.delete-history-btn');
    const openBtn = e.target.closest('.history-item-btn');

    if (deleteBtn) {
        if (confirm('Are you sure you want to delete this conversation?')) {
            moodHistoryCollection.doc(deleteBtn.dataset.id).delete();
        }
    } else if (openBtn) {
        const itemData = JSON.parse(openBtn.dataset.historyItem);
        openHistoryModal(itemData);
    }
}

async function handleClearAllHistory() {
    if (!user || !moodHistoryCollection) return;
    if (!confirm('Are you sure you want to delete ALL of your conversations? This cannot be undone.')) return;
    
    const snapshot = await moodHistoryCollection.get();
    if (snapshot.empty) return;

    const batch = firebase.firestore().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}

// --- Initialization ---
export function initMood(currentUser) {
    user = currentUser;

    // --- ADDED: Personalized Greeting Logic ---
    const mainHeading = document.getElementById('mood-main-heading');
    const subHeading = document.getElementById('mood-sub-heading');
    const aiMoodForm = document.getElementById('ai-mood-form');
    const moodInput = document.getElementById('mood-input');

    if (user && mainHeading && subHeading) {
        const userName = user.displayName || 'friend';
        mainHeading.innerHTML = `Hey <span class="mood-user-name">${userName}</span>`;
        subHeading.innerHTML = `Your friend <span class="mood-ai-name">Sarah</span> is here. What's on your mind?`;
        moodInput.disabled = false;
        aiMoodForm.querySelector('button').disabled = false;
    } else if (mainHeading && subHeading) {
        mainHeading.textContent = "Your Friend (Sarah)";
        subHeading.textContent = "Log in to chat with your friend.";
        moodInput.disabled = true;
        aiMoodForm.querySelector('button').disabled = true;
    }
    // --- END OF GREETING LOGIC ---


    if (user) {
        moodHistoryCollection = firebase.firestore().collection('users').doc(user.uid).collection('moodHistory');
        fetchHistory();
    } else {
        if (unsubscribeMoodHistory) unsubscribeMoodHistory();
        renderHistory([]);
    }

    if (aiMoodForm && !aiMoodForm.dataset.initialized) {
        const pastChatsList = document.getElementById('past-chats-list');
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        const historyDetailModal = document.getElementById('history-detail-modal');
        const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');

        aiMoodForm.addEventListener('submit', handleGetAIResponse);
        closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
        historyDetailModal.addEventListener('click', (e) => {
            if (e.target === historyDetailModal) closeHistoryModal();
        });
        pastChatsList.addEventListener('click', handleHistoryClick);
        clearHistoryBtn.addEventListener('click', handleClearAllHistory);
        aiMoodForm.dataset.initialized = 'true';
    }
}