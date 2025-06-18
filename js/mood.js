// js/mood.js - Final Corrected Version

// --- API Key ---
const GROQ_API_KEY = "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";

// --- DOM Elements ---
// --- DOM Elements ---
const aiMoodForm = document.getElementById('ai-mood-form');
const moodInput = document.getElementById('mood-input');
const aiResponseArea = document.getElementById('ai-response-area');
const aiLoadingSpinner = document.getElementById('ai-loading-spinner');
const aiResponseContent = document.getElementById('ai-response-content');
const pastChatsList = document.getElementById('past-chats-list'); // Correct selector
const clearHistoryBtn = document.getElementById('clear-history-btn');
// Modal Selectors
const historyDetailModal = document.getElementById('history-detail-modal');
const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
const historyModalDate = document.getElementById('history-modal-date');
const historyModalUserQuery = document.getElementById('history-modal-user-query');
const historyModalAiResponse = document.getElementById('history-modal-ai-response');


// --- State & Firestore ---
let user = null;
let moodHistoryCollection;

// --- Modal Control ---
function openHistoryModal(item) {
    historyModalDate.textContent = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    historyModalUserQuery.textContent = `"${item.userQuery}"`;
    historyModalAiResponse.textContent = item.aiResponse;
    historyDetailModal.classList.remove('hidden');
}

function closeHistoryModal() {
    historyDetailModal.classList.add('hidden');
}

// --- AI Interaction ---
async function handleGetAIResponse(e) {
    e.preventDefault();
    const userInput = moodInput.value.trim();
    if (!userInput || !user) {
        alert("Please write something and ensure you are logged in.");
        return;
    }
    if (GROQ_API_KEY === "PASTE_YOUR_NEW_GROQ_API_KEY_HERE") {
        alert("Please create and paste your free Groq API Key into the js/mood.js file.");
        return;
    }
    aiResponseArea.classList.remove('hidden');
    aiResponseContent.classList.add('hidden');
    aiLoadingSpinner.classList.remove('hidden');
    const prompt = `You are a wise, poetic, and emotionally supportive Islamic guide named 'Yaqeen' — which means Certainty. You are not just a guide — you are the user's best friend, always here to listen, understand, and support them without judgment. A user is sharing their current feelings with you. User's feelings: "${userInput}" Your job is to respond in a way that feels caring, personal, and uplifting. You must always include these three parts in your reply: 1. Begin with ONE relevant Quranic verse or Hadith that reflects or helps with the user's emotion. Keep it short and clear. Add the proper label: - "Allah says in the Holy Quran:" - or "It is said in the Hadith:" 2. Then, respond with a personal and empathetic message — speak to the user like their closest friend would. Acknowledge what they feel, offer warmth, and let them feel heard. Your tone should be gentle, kind, and emotionally intelligent. 3. End with a small, practical and positive action they can take right now — something simple and encouraging that fits their mood (like making a short dua, stepping outside, writing down a feeling, drinking water, etc.). IMPORTANT: - Use very simple, friendly, everyday English. - Avoid complex words or formal language. - Make your response feel heartfelt, natural, and easy to connect with. - Do NOT use markdown symbols like *asterisks* or #hashtags. - Use line breaks between each section for clarity. You are not a therapist. You are a best friend who brings Islamic light and love into the user’s day. You do not give fatwas or legal opinions — only heartfelt spiritual and emotional support.`;
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ "messages": [{ "role": "system", "content": prompt }], "model": "llama3-8b-8192" })
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const data = await response.json();
        const aiText = data.choices[0].message.content;
        
        aiResponseContent.textContent = aiText;
        
        // ** THE MISSING LINE IS NOW ADDED BACK **
        await saveConversation(userInput, aiText);

    } catch (error) {
        console.error("AI Fetch Error:", error);
        aiResponseContent.textContent = "I'm sorry, I couldn't connect with my thoughts right now. Please try again in a moment.";
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) { console.error("Error saving conversation:", error); }
}

function renderHistory(historyItems) {
    pastChatsList.innerHTML = '';
    if (historyItems.length === 0) {
        pastChatsList.innerHTML = `<p class="text-center text-xs text-slate-500 dark:text-slate-400">Your saved chats will appear here.</p>`;
        return;
    }
    historyItems.forEach(item => {
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item flex items-center justify-between w-full text-left bg-black/5 dark:bg-black/20 p-2 rounded-lg';
        
        const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '';

        const clickableArea = document.createElement('div');
        clickableArea.className = 'history-item-btn flex-grow cursor-pointer pr-2';
        clickableArea.dataset.historyItem = JSON.stringify(item);
        clickableArea.innerHTML = `<p class="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">${item.userQuery}</p>`;

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
    moodHistoryCollection.orderBy("createdAt", "desc").limit(20).onSnapshot(snapshot => {
        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? { seconds: doc.data().createdAt.seconds, nanoseconds: doc.data().createdAt.nanoseconds } : null
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
        if (itemData.createdAt) {
            itemData.createdAt = new firebase.firestore.Timestamp(itemData.createdAt.seconds, itemData.createdAt.nanoseconds);
        }
        openHistoryModal(itemData);
    }
}

async function handleClearAllHistory() {
    if (!user || !moodHistoryCollection) return;
    if (!confirm("Are you sure you want to delete ALL of your conversations? This cannot be undone.")) return;
    const snapshot = await moodHistoryCollection.get();
    if (snapshot.empty) return;
    const batch = firebase.firestore().batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

// --- Initialization ---
export function initMood(currentUser) {
    user = currentUser;
    if (user) {
        moodHistoryCollection = firebase.firestore().collection('users').doc(user.uid).collection('moodHistory');
        fetchHistory();
    } else {
        renderHistory([]);
    }
    if (!aiMoodForm.dataset.initialized) {
        aiMoodForm.addEventListener('submit', handleGetAIResponse);
        closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
        historyDetailModal.addEventListener('click', (e) => {
            if (e.target === historyDetailModal) closeHistoryModal();
        });
        pastChatsList.addEventListener('click', handleHistoryClick); // Corrected from aiHistoryList
        clearHistoryBtn.addEventListener('click', handleClearAllHistory);
        aiMoodForm.dataset.initialized = 'true';
    }
}