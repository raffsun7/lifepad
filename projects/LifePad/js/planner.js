// js/planner.js

// --- DOM Elements ---
const addTaskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const editTaskModal = document.getElementById('edit-task-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskInput = document.getElementById('edit-task-input');

// --- State ---
let user = null;
let tasksCollection;
let editingTaskId = null; // To keep track of which task we are editing

// --- Modal Control ---
function openEditModal(task) {
    editingTaskId = task.id;
    editTaskInput.value = task.text;
    editTaskModal.classList.remove('hidden');
    editTaskInput.focus();
}

function closeEditModal() {
    editingTaskId = null;
    editTaskModal.classList.add('hidden');
}

// --- Core Functions ---

function renderTasks(tasks) {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
        taskList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No tasks for today. Add one to get started!</p>`;
        return;
    }
    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        const isCompleted = task.completed;
        taskEl.className = `task-card flex items-center bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg shadow transition-all duration-300 ${isCompleted ? 'opacity-60' : ''}`;
        
        taskEl.innerHTML = `
            <input type="checkbox" data-id="${task.id}" class="task-checkbox form-checkbox h-6 w-6 rounded-full text-green-500 bg-gray-300 dark:bg-slate-700 border-none focus:ring-2 focus:ring-green-400" ${isCompleted ? 'checked' : ''}>
            <span class="task-text flex-grow mx-4 text-slate-800 dark:text-slate-200 ${isCompleted ? 'line-through' : ''}">${task.text}</span>
            <div class="task-controls flex items-center space-x-2">
                <button data-task='${JSON.stringify(task)}' class="edit-task-btn text-blue-500 hover:text-blue-700"><ion-icon name="create-outline" class="text-xl"></ion-icon></button>
                <button data-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-700"><ion-icon name="trash-outline" class="text-xl"></ion-icon></button>
            </div>
        `;
        taskList.appendChild(taskEl);
    });
}

async function fetchTasks() {
    if (!tasksCollection) return;
    tasksCollection.orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTasks(tasks);
    });
}

async function handleAddTask(e) {
    e.preventDefault();
    const taskText = taskInput.value.trim();
    if (taskText && user) {
        await tasksCollection.add({
            text: taskText,
            completed: false, // Add the 'completed' field
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        taskInput.value = '';
    } else if (!user) {
        alert("Please log in to save tasks.");
    }
}

async function handleTaskControls(e) {
    const target = e.target.closest('button, input');
    if (!target || !user) return;

    // Handle Checkbox Toggle
    if (target.classList.contains('task-checkbox')) {
        const taskId = target.dataset.id;
        const isCompleted = target.checked;
        await tasksCollection.doc(taskId).update({ completed: isCompleted });
    }

    // Handle Delete Button
    if (target.classList.contains('delete-task-btn')) {
        if (confirm("Are you sure you want to delete this task?")) {
            const taskId = target.dataset.id;
            await tasksCollection.doc(taskId).delete();
        }
    }

    // Handle Edit Button
    if (target.classList.contains('edit-task-btn')) {
        const taskData = JSON.parse(target.dataset.task);
        openEditModal(taskData);
    }
}

async function handleUpdateTask(e) {
    e.preventDefault();
    const newText = editTaskInput.value.trim();
    if (newText && editingTaskId && user) {
        await tasksCollection.doc(editingTaskId).update({ text: newText });
        closeEditModal();
    }
}

// --- Initialization ---
export function initPlanner(currentUser) {
    user = currentUser;
    if (user) {
        tasksCollection = firebase.firestore().collection('users').doc(user.uid).collection('tasks');
        fetchTasks();
    } else {
        renderTasks([]); // Clear tasks on logout
    }
    
    if (!addTaskForm.dataset.initialized) {
        addTaskForm.addEventListener('submit', handleAddTask);
        taskList.addEventListener('click', handleTaskControls);
        
        // Edit Modal Listeners
        editTaskForm.addEventListener('submit', handleUpdateTask);
        closeEditModalBtn.addEventListener('click', closeEditModal);
        editTaskModal.addEventListener('click', (e) => {
            if (e.target === editTaskModal) closeEditModal();
        });

        addTaskForm.dataset.initialized = 'true';
    }
}