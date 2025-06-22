// js/notes.js --- FINAL VERSION

// --- DOM Elements ---
const addNoteBtn = document.getElementById('add-note-btn');
const addNoteModal = document.getElementById('add-note-modal');
const closeNoteModalBtn = document.getElementById('close-note-modal-btn');
const addNoteForm = document.getElementById('add-note-form');
const noteTitleInput = document.getElementById('note-title-input');
const notesList = document.getElementById('notes-list');
const notesFilterBar = document.getElementById('notes-filter-bar');
const noteTagsContainer = document.getElementById('note-tags');
const noteSearchInput = document.getElementById('note-search-input');

// Delete Confirmation Modal Elements
const deleteNoteModal = document.getElementById('delete-note-modal');
const confirmDeleteNoteBtn = document.getElementById('confirm-delete-note-btn');
const cancelDeleteNoteBtn = document.getElementById('cancel-delete-note-btn');


// --- State ---
let user = null;
let notesCollection;
let quill; // For the rich text editor
let allNotes = [];
let currentFilter = 'All';
let currentSearchQuery = '';
let unsubscribeNotes = null; // To manage Firestore listener
let noteToDeleteId = null; // To hold the ID of the note being deleted

// --- Modal Control Functions ---
function openNoteModal() {
    addNoteModal.classList.remove('hidden');
    if (!quill) {
        quill = new Quill('#note-editor', {
            theme: 'snow',
            modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] },
            placeholder: 'Write freely...',
        });
    }
}

function closeNoteModal() {
    addNoteModal.classList.add('hidden');
    if (quill) quill.setContents([]);
    addNoteForm.reset();
}

function openDeleteConfirmModal(noteId) {
    noteToDeleteId = noteId;
    deleteNoteModal.classList.remove('hidden');
}

function closeDeleteConfirmModal() {
    noteToDeleteId = null;
    deleteNoteModal.classList.add('hidden');
}


// --- Utility to get the tag color ---
const getTagColor = (tag) => {
    switch (tag) {
        case 'Gratitude': return 'bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300';
        case 'Du\'a': return 'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
        case 'Stress': return 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300';
        case 'Thought':
        default: return 'bg-gray-200 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300';
    }
};

// --- Core Functions ---
function renderNotes(notesToRender) {
    const loader = document.getElementById('notes-loader');
    if (loader) loader.style.display = 'none';

    notesList.innerHTML = '';
    if (notesToRender.length === 0) {
        notesList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No notes found.</p>`;
        return;
    }
    notesToRender.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-card bg-white/60 dark:bg-slate-800/60 rounded-lg shadow overflow-hidden animate-fade-in-down';
        noteEl.setAttribute('aria-expanded', 'false');

        const date = note.createdAt ? note.createdAt.toDate().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now';
        
        // Security: Sanitize user-generated HTML content before rendering
        const cleanContent = DOMPurify.sanitize(note.textContent);

        noteEl.innerHTML = `
            <div class="note-header flex items-center justify-between p-4 cursor-pointer">
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-lg text-gray-800 dark:text-gray-200">${note.title}</h4>
                    <div class="flex items-center mt-1">
                        <span class="tag ${getTagColor(note.tag)} text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${note.tag}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">${date}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button data-id="${note.id}" class="delete-note-btn text-red-500 hover:text-red-700 p-2 z-10 font-semibold text-sm">Delete</button>
                    <ion-icon name="chevron-down-outline" class="accordion-toggle-icon text-2xl text-gray-500 dark:text-gray-400"></ion-icon>
                </div>
            </div>
            <div class="note-content hidden p-4 border-t border-gray-200 dark:border-slate-700">
                <div class="prose dark:prose-invert max-w-none">${cleanContent}</div>
            </div>
        `;
        notesList.appendChild(noteEl);
    });
}


function handleNoteClick(e) {
    const noteCard = e.target.closest('.note-card');
    if (!noteCard) return;

    const deleteBtn = e.target.closest('.delete-note-btn');
    if (deleteBtn) {
        e.stopPropagation();
        openDeleteConfirmModal(deleteBtn.dataset.id);
        return;
    }

    const header = e.target.closest('.note-header');
    if (header) {
        const content = noteCard.querySelector('.note-content');
        const isExpanded = noteCard.getAttribute('aria-expanded') === 'true';
        noteCard.setAttribute('aria-expanded', !isExpanded);
        content.classList.toggle('hidden');
    }
}

function fetchNotes() {
    if (!notesCollection) return;

    if (unsubscribeNotes) unsubscribeNotes();

    unsubscribeNotes = notesCollection.orderBy("createdAt", "desc").onSnapshot(snapshot => {
        allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRenderNotes();
    }, error => {
        console.error("Error fetching notes:", error);
    });
}

function filterAndRenderNotes() {
    const tagFiltered = (currentFilter === 'All') 
        ? allNotes 
        : allNotes.filter(note => note.tag === currentFilter);

    const searchFiltered = tagFiltered.filter(note => {
        if (!currentSearchQuery) return true;
        const query = currentSearchQuery.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(query);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.textContent;
        const contentText = tempDiv.textContent || tempDiv.innerText || "";
        const contentMatch = contentText.toLowerCase().includes(query);
        return titleMatch || contentMatch;
    });

    renderNotes(searchFiltered);
}

async function handleSaveNote(e) {
    e.preventDefault();
    const title = noteTitleInput.value.trim();
    const textContent = quill.root.innerHTML;

    if (quill.getLength() <= 1) {
        alert("Please write some content for your note.");
        return;
    }
    const checkedRadio = document.querySelector('input[name="note-tag"]:checked');
    if (!checkedRadio) {
        alert("Please select a tag for your note.");
        return;
    }
    const selectedTag = checkedRadio.value;

    if (title && textContent && selectedTag && user) {
        try {
            await notesCollection.add({
                title: title,
                textContent: textContent,
                tag: selectedTag,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if ('vibrate' in navigator) navigator.vibrate(50);
            closeNoteModal();
        } catch (error) {
            console.error("Error saving note: ", error);
            alert("Could not save the note. Please try again.");
        }
    } else if (!user) {
        alert("Please log in to save notes.");
    }
}

async function executeDeleteNote() {
    if (!noteToDeleteId || !user) return;
    try {
        await notesCollection.doc(noteToDeleteId).delete();
        if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (error) {
        console.error("Error deleting note: ", error);
        alert("Could not delete the note. Please try again.");
    } finally {
        closeDeleteConfirmModal();
    }
}

function handleFilterClick(e) {
    const filterBtn = e.target.closest('.filter-btn');
    if (!filterBtn) return;

    currentFilter = filterBtn.dataset.tag;
    const baseClasses = "filter-btn text-sm font-semibold rounded-full px-4 py-2 transition-all duration-200 backdrop-blur-sm";
    const activeClasses = `${baseClasses} bg-sky-500/80 dark:bg-sky-500/70 border-transparent text-white ring-2 ring-sky-300 dark:ring-sky-400`;
    const inactiveClasses = `${baseClasses} bg-black/5 dark:bg-white/10 border border-gray-300/50 dark:border-dark-border/50 text-gray-700 dark:text-gray-300`;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = (btn.dataset.tag === currentFilter) ? activeClasses : inactiveClasses;
    });

    filterAndRenderNotes();
}

function handleTagSelectionUI(e) {
    const targetLabel = e.target.closest('.tag-label');
    if (!targetLabel) return;

    const radioInput = targetLabel.querySelector('input[type="radio"]');
    if (radioInput) {
        radioInput.checked = true;
    }

    const baseClasses = "inline-block cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 backdrop-blur-sm";
    const activeClasses = `${baseClasses} bg-sky-500/80 dark:bg-sky-500/70 border-transparent text-white ring-2 ring-sky-300 dark:ring-sky-400`;
    const inactiveClasses = `${baseClasses} bg-black/5 dark:bg-white/10 border border-gray-300/50 dark:border-dark-border/50 text-gray-700 dark:text-gray-300`;

    noteTagsContainer.querySelectorAll('.tag-label').forEach(label => {
        const span = label.querySelector('span');
        const input = label.querySelector('input[type="radio"]');
        if (span && input) {
            span.className = input.checked ? activeClasses : inactiveClasses;
        }
    });
}

function handleSearchInput() {
    currentSearchQuery = noteSearchInput.value;
    filterAndRenderNotes();
}


// --- Initialization ---
export function initNotes(currentUser) {
    user = currentUser;
    if (user) {
        notesCollection = firebase.firestore().collection('users').doc(user.uid).collection('notes');
        fetchNotes();
    } else {
        if (unsubscribeNotes) unsubscribeNotes();
        allNotes = [];
        renderNotes([]);
    }

    if (!addNoteForm.dataset.initialized) {
        addNoteBtn.addEventListener('click', openNoteModal);
        closeNoteModalBtn.addEventListener('click', closeNoteModal);
        addNoteModal.addEventListener('click', (e) => {
            if (e.target === addNoteModal) closeNoteModal();
        });
        addNoteForm.addEventListener('submit', handleSaveNote);

        notesList.addEventListener('click', handleNoteClick);
        
        notesFilterBar.addEventListener('click', handleFilterClick);
        noteTagsContainer.addEventListener('click', handleTagSelectionUI);
        noteSearchInput.addEventListener('input', handleSearchInput);

        confirmDeleteNoteBtn.addEventListener('click', executeDeleteNote);
        cancelDeleteNoteBtn.addEventListener('click', closeDeleteConfirmModal);
        deleteNoteModal.addEventListener('click', (e) => {
            if (e.target === deleteNoteModal) closeDeleteConfirmModal();
        });

        addNoteForm.dataset.initialized = 'true';
    }
}
