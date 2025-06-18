// js/mood.js

const moodSelector = document.getElementById('mood-selector');
const moodContentDisplay = document.getElementById('mood-content-display');
const moodQuote = document.getElementById('mood-quote');

const moodContent = {
    happy: [
        "\"The best of people are those who are most beneficial to people.\" - Prophet Muhammad (ﷺ)",
        "\"Verily, with hardship comes ease.\" - Qur'an 94:6",
        "Alhamdulillah for the blessings you can see and the ones you can't. Smile, it's Sunnah!",
    ],
    neutral: [
        "\"This world is a prison for the believer and a paradise for the disbeliever.\" - Prophet Muhammad (ﷺ)",
        "Take a deep breath. \"Verily, in the remembrance of Allah do hearts find rest.\" - Qur'an 13:28",
        "Reflect on one thing you can do today to please Allah.",
    ],
    sad: [
        "\"Do not be sad, indeed Allah is with us.\" - Qur'an 9:40",
        "\"Allah does not burden a soul beyond that it can bear.\" - Qur'an 2:286",
        "Talk to Allah, for He is the turner of hearts and the healer of pain. Making Du'a is a form of worship.",
    ],
    stressed: [
        "\"And seek help through patience and prayer...\" - Qur'an 2:45",
        "Delegate your affairs to Allah. Trust His plan, for He is the best of planners.",
        "Take a 5-minute break. Close your eyes and say 'La hawla wa la quwwata illa billah.' (There is no power nor strength except with Allah).",
    ],
    grateful: [
        "\"If you are grateful, I will surely increase you [in favor].\" - Qur'an 14:7",
        "\"And whatever of blessings and good things you have, it is from Allah.\" - Qur'an 16:53",
        "List three things you are grateful for right now. The simple act of gratitude can change your entire day.",
    ]
};

function handleMoodSelection(e) {
    const button = e.target.closest('.mood-emoji');
    if (!button) return;

    const mood = button.dataset.mood;
    
    document.querySelectorAll('.mood-emoji').forEach(btn => {
        btn.style.opacity = '0.5';
    });
    button.style.opacity = '1';
    button.style.transform = 'scale(1.25)';

    const contentArray = moodContent[mood] || ["Have a blessed day."];
    const randomIndex = Math.floor(Math.random() * contentArray.length);
    moodQuote.textContent = contentArray[randomIndex];
    moodContentDisplay.classList.remove('hidden');

    saveMoodForToday(mood);
}

function saveMoodForToday(mood) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('lifePadMood', JSON.stringify({ mood: mood, date: today }));
}

function loadMoodForToday() {
    const savedMoodData = JSON.parse(localStorage.getItem('lifePadMood'));
    const today = new Date().toISOString().split('T')[0];

    if (savedMoodData && savedMoodData.date === today) {
        const mood = savedMoodData.mood;
        const button = document.querySelector(`.mood-emoji[data-mood="${mood}"]`);
        if (button) {
            button.click();
        }
    }
}

export function initMood() {
    moodSelector.addEventListener('click', handleMoodSelection);
    loadMoodForToday();
}