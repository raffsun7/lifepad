// js/notes.js

// --- DOM Elements ---
const addNoteForm = document.getElementById('add-note-form');
const noteTextarea = document.getElementById('note-textarea');
const notesList = document.getElementById('notes-list');
const notesFilterBar = document.getElementById('notes-filter-bar');
const noteTagsContainer = document.getElementById('note-tags'); // The container for tag buttons

// --- State ---
let user = null;
let notesCollection;
let allNotes = []; // Local cache of all notes

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
    notesList.innerHTML = ''; // Clear the list
    if (notesToRender.length === 0) {
        notesList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No notes found for this category.</p>`;
        return;
    }
    notesToRender.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
        const date = note.createdAt ? note.createdAt.toDate().toLocaleDateString() : 'Just now';
        
        noteEl.innerHTML = `
            <p class="text-gray-800 dark:text-gray-300 mb-3 whitespace-pre-wrap">${note.textContent}</p>
            <div class="flex justify-between items-center">
                <div>
                    <span class="tag ${getTagColor(note.tag)} text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${note.tag}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${date}</span>
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
        const currentFilter = document.querySelector('.filter-btn.active-filter').dataset.tag;
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
        noteTextarea.value = ''; // Clear textarea
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
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active-filter', 'bg-blue-600', 'text-white');
        if (btn.dataset.tag === tag) {
            btn.classList.add('active-filter', 'bg-blue-600', 'text-white');
        }
    });

    if (tag === 'All') {
        renderNotes(allNotes);
    } else {
        const filteredNotes = allNotes.filter(note => note.tag === tag);
        renderNotes(filteredNotes);
    }
}

// ** NEW FUNCTION TO HANDLE TAG SELECTION UI **
function handleTagSelectionUI(e) {
    const targetSpan = e.target.closest('span');
    if (!targetSpan || !e.currentTarget.contains(targetSpan)) return;

    // Visually update all tags
    noteTagsContainer.querySelectorAll('span').forEach(span => {
        span.classList.remove('bg-blue-500', 'text-white');
        span.classList.add('bg-gray-200', 'dark:bg-gray-700');
    });

    // Visually update the selected tag
    targetSpan.classList.add('bg-blue-500', 'text-white');
    targetSpan.classList.remove('bg-gray-200', 'dark:bg-gray-700');
}


// --- Initialization ---
export function initNotes(currentUser) {
    user = currentUser;
    if (user) {
        notesCollection = firebase.firestore().collection('users').doc(user.uid).collection('notes');
        fetchNotes();
    } else {
        allNotes = [];
        renderNotes([]); // Clear notes on logout
    }

    if (!addNoteForm.dataset.initialized) {
        addNoteForm.addEventListener('submit', handleSaveNote);
        notesList.addEventListener('click', handleDeleteNote);
        notesFilterBar.addEventListener('click', (e) => {
            if(e.target.classList.contains('filter-btn')) {
                handleFilterNotes(e.target.dataset.tag);
            }
        });
        // ** ADDED EVENT LISTENER FOR TAGS **
        noteTagsContainer.addEventListener('click', handleTagSelectionUI);
        addNoteForm.dataset.initialized = 'true';
    }
}