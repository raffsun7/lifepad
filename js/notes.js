// js/notes.js

// --- DOM Elements ---
const addNoteBtn = document.getElementById('add-note-btn');
const addNoteModal = document.getElementById('add-note-modal');
const closeNoteModalBtn = document.getElementById('close-note-modal-btn');
const addNoteForm = document.getElementById('add-note-form');
const noteTextarea = document.getElementById('note-textarea');
const notesList = document.getElementById('notes-list');
const notesFilterBar = document.getElementById('notes-filter-bar');
const noteTagsContainer = document.getElementById('note-tags');

// --- State ---
let user = null;
let notesCollection;
let allNotes = [];

// --- Modal Control Functions ---
function openNoteModal() {
    addNoteModal.classList.remove('hidden');
}

function closeNoteModal() {
    addNoteModal.classList.add('hidden');
    noteTextarea.value = ''; // Clear textarea on close
}

// --- Utility to get the tag color ---
const getTagColor = (tag) => {
    switch (tag) {
        case 'Gratitude': return 'bg-green-200 text-green-800';
        case 'Du\'a': return 'bg-blue-200 text-blue-800';
        case 'Stress': return 'bg-red-200 text-red-800';
        case 'Thought':
        default: return 'bg-gray-200 text-gray-800';
    }
};

// --- Core Functions ---
function renderNotes(notesToRender) {
    notesList.innerHTML = '';
    if (notesToRender.length === 0) {
        notesList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No notes found for this category.</p>`;
        return;
    }
    notesToRender.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-card bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg shadow';
        const date = note.createdAt ? note.createdAt.toDate().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now';
        noteEl.innerHTML = `
            <p class="text-gray-800 dark:text-gray-300 mb-3 whitespace-pre-wrap">${note.textContent}</p>
            <div class="flex justify-between items-center">
                <div>
                    <span class="tag ${getTagColor(note.tag)} text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${note.tag}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">${date}</span>
                </div>
                <button data-id="${note.id}" class="delete-note-btn text-red-500 hover:text-red-700 text-sm font-semibold">Delete</button>
            </div>
        `;
        notesList.appendChild(noteEl);
    });
}

function fetchNotes() {
    if (!notesCollection) return;
    notesCollection.orderBy("createdAt", "desc").onSnapshot(snapshot => {
        allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentFilter = notesFilterBar.querySelector('.bg-blue-500\\/80')?.dataset.tag || 'All';
        handleFilterNotes(currentFilter);
    });
}

async function handleSaveNote(e) {
    e.preventDefault();
    const textContent = noteTextarea.value.trim();
    const checkedRadio = document.querySelector('input[name="note-tag"]:checked');

    if (!checkedRadio) {
        alert("Please select a tag for your note.");
        return;
    }
    const selectedTag = checkedRadio.value;

    if (textContent && selectedTag && user) {
        await notesCollection.add({
            textContent: textContent,
            tag: selectedTag,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeNoteModal(); // Close modal after successful save
    } else if (!user) {
        alert("Please log in to save notes.");
    }
}

async function handleDeleteNote(e) {
    if (e.target.classList.contains('delete-note-btn') && user) {
        if (confirm("Are you sure you want to delete this note?")) {
            const noteId = e.target.dataset.id;
            await notesCollection.doc(noteId).delete();
        }
    }
}

function handleFilterNotes(tag) {
    const baseClasses = "filter-btn text-sm font-semibold rounded-full px-4 py-2 transition-all duration-200 backdrop-blur-sm";
    const activeClasses = `${baseClasses} bg-blue-500/80 dark:bg-blue-500/70 border-transparent text-white ring-2 ring-blue-300 dark:ring-blue-400`;
    const inactiveClasses = `${baseClasses} bg-black/5 dark:bg-white/10 border border-slate-300/50 dark:border-slate-600/50 text-slate-700 dark:text-slate-300`;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = (btn.dataset.tag === tag) ? activeClasses : inactiveClasses;
    });

    const filteredNotes = (tag === 'All') ? allNotes : allNotes.filter(note => note.tag === tag);
    renderNotes(filteredNotes);
}

function handleTagSelectionUI(e) {
    const targetSpan = e.target.closest('span');
    if (!targetSpan || !e.currentTarget.contains(targetSpan)) return;

    const baseClasses = "inline-block cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 backdrop-blur-sm";
    const activeClasses = `${baseClasses} bg-blue-500/80 dark:bg-blue-500/70 border-transparent text-white ring-2 ring-blue-300 dark:ring-blue-400`;
    const inactiveClasses = `${baseClasses} bg-black/5 dark:bg-white/10 border border-slate-300/50 dark:border-slate-600/50 text-slate-700 dark:text-slate-300`;

    noteTagsContainer.querySelectorAll('span').forEach(span => {
        span.className = inactiveClasses;
    });
    targetSpan.className = activeClasses;
}

// --- Initialization ---
export function initNotes(currentUser) {
    user = currentUser;
    if (user) {
        notesCollection = firebase.firestore().collection('users').doc(user.uid).collection('notes');
        fetchNotes();
    } else {
        allNotes = [];
        renderNotes([]);
    }

    if (!addNoteForm.dataset.initialized) {
        // Modal and form listeners
        addNoteBtn.addEventListener('click', openNoteModal);
        closeNoteModalBtn.addEventListener('click', closeNoteModal);
        addNoteModal.addEventListener('click', (e) => {
            if (e.target === addNoteModal) { // Close if clicking on the overlay backdrop
                closeNoteModal();
            }
        });
        addNoteForm.addEventListener('submit', handleSaveNote);

        // Other listeners
        notesList.addEventListener('click', handleDeleteNote);
        notesFilterBar.addEventListener('click', (e) => {
            if(e.target.classList.contains('filter-btn')) {
                handleFilterNotes(e.target.dataset.tag);
            }
        });
        noteTagsContainer.addEventListener('click', handleTagSelectionUI);

        addNoteForm.dataset.initialized = 'true';
    }
}