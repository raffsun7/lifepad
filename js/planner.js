// js/planner.js --- FINAL VERSION

// --- State ---
let user = null;
let tasksCollection;
let editingTaskId = null;
let unsubscribeTasks = null;

// --- Modal Control ---
function openEditModal(task, editTaskInput, editTaskModal) {
    editingTaskId = task.id;
    editTaskInput.value = task.text;
    editTaskModal.classList.remove('hidden');
    editTaskInput.focus();
}

function closeEditModal(editTaskModal) {
    editingTaskId = null;
    editTaskModal.classList.add('hidden');
}

function openAiModal(aiSuggestionModal, aiGoalInput) {
    aiSuggestionModal.classList.remove('hidden');
    aiGoalInput.focus();
}

function closeAiModal(aiSuggestionModal, aiSuggestionForm) {
    aiSuggestionModal.classList.add('hidden');
    aiSuggestionForm.reset();
}


// --- Core Functions ---
function renderTasks(tasks) {
    const taskList = document.getElementById('task-list');
    const loader = document.getElementById('planner-loader');
    if (loader) {
        loader.style.display = 'none';
    }

    taskList.innerHTML = '';
    if (tasks.length === 0) {
        taskList.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No tasks for today. Add one to get started!</p>`;
        return;
    }

    const priorityStyles = { high: 'border-l-red-500', medium: 'border-l-yellow-500', low: 'border-l-green-500' };
    
    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        const isCompleted = task.completed;
        const priorityClass = priorityStyles[task.priority] || 'border-l-gray-400';
        
        taskEl.className = `task-card flex items-start bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg shadow transition-all duration-300 ${isCompleted ? 'opacity-60' : ''} ${priorityClass} border-l-4 animate-fade-in-down`;
        
        taskEl.innerHTML = `
            <input type="checkbox" data-id="${task.id}" class="task-checkbox form-checkbox h-6 w-6 rounded-full text-green-500 bg-gray-300 dark:bg-slate-700 border-none focus:ring-2 focus:ring-green-400 mt-1" ${isCompleted ? 'checked' : ''}>
            <div class="flex-grow mx-4 min-w-0">
                <span class="task-text text-slate-800 dark:text-slate-200">${task.text}</span>
                <div class="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">${task.category || 'General'}</div>
            </div>
            <div class="task-controls flex items-center">
                <button data-task='${JSON.stringify(task)}' class="edit-task-btn text-blue-500 hover:text-blue-700"><ion-icon name="create-outline" class="text-xl"></ion-icon></button>
                <button data-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-700"><ion-icon name="trash-outline" class="text-xl"></ion-icon></button>
            </div>
        `;
        taskList.appendChild(taskEl);
    });
}

function fetchTasks() {
    if (!tasksCollection) return;
    if (unsubscribeTasks) unsubscribeTasks();

    unsubscribeTasks = tasksCollection.orderBy("priority", "desc").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTasks(tasks);
    }, error => {
        console.error("Error fetching tasks: ", error);
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = `<p class="text-center text-red-500">Could not load tasks.</p>`;
    });
}

async function handleAddTask(e) {
    e.preventDefault();
    const taskInput = document.getElementById('task-input');
    const taskPriorityInput = document.getElementById('task-priority-input');
    const taskCategoryInput = document.getElementById('task-category-input');
    const taskText = taskInput.value.trim();

    if (taskText && user) {
        await tasksCollection.add({ text: taskText, completed: false, priority: taskPriorityInput.value, category: taskCategoryInput.value, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        taskInput.value = '';
    } else if (!user) {
        alert("Please log in to save tasks.");
    }
}

async function handleTaskControls(e) {
    const target = e.target.closest('button, input');
    if (!target || !user) return;

    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskInput = document.getElementById('edit-task-input');

    if (target.classList.contains('task-checkbox')) {
        const taskId = target.dataset.id;
        const isCompleted = target.checked;
        await tasksCollection.doc(taskId).update({ completed: isCompleted });
        if (isCompleted && 'vibrate' in navigator) navigator.vibrate(50);
    }

    if (target.classList.contains('delete-task-btn')) {
        if (confirm("Are you sure you want to delete this task?")) {
            const taskId = target.dataset.id;
            await tasksCollection.doc(taskId).delete();
        }
    }

    if (target.classList.contains('edit-task-btn')) {
        const taskData = JSON.parse(target.dataset.task);
        openEditModal(taskData, editTaskInput, editTaskModal);
    }
}

async function handleUpdateTask(e) {
    e.preventDefault();
    const editTaskInput = document.getElementById('edit-task-input');
    const editTaskModal = document.getElementById('edit-task-modal');
    const newText = editTaskInput.value.trim();
    if (newText && editingTaskId && user) {
        await tasksCollection.doc(editingTaskId).update({ text: newText });
        closeEditModal(editTaskModal);
    }
}

async function handleAITaskSuggestion(e) {
    e.preventDefault();
    if (!user) { alert("Please log in to use AI suggestions."); return; }
    
    const aiSuggestionForm = document.getElementById('ai-suggestion-form');
    const aiGoalInput = document.getElementById('ai-goal-input');
    const aiSuggestionModal = document.getElementById('ai-suggestion-modal');
    const goal = aiGoalInput.value.trim();
    if (!goal) return;

    const submitButton = aiSuggestionForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Generating...';
    submitButton.disabled = true;

    try {
        const response = await fetch('/api/suggest-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: goal }) });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const suggestions = await response.json();
        
        if (suggestions && suggestions.length > 0) {
            closeAiModal(aiSuggestionModal, aiSuggestionForm);
            const confirmMessage = `AI suggested the following tasks:\n\n- ${suggestions.join('\n- ')}\n\nWould you like to add them?`;
            if (confirm(confirmMessage)) {
                const batch = firebase.firestore().batch();
                suggestions.forEach(taskText => {
                    const newTaskRef = tasksCollection.doc();
                    batch.set(newTaskRef, { text: taskText, completed: false, priority: 'medium', category: 'General', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                });
                await batch.commit();
            }
        } else {
            alert("The AI couldn't generate suggestions for that goal.");
        }

    } catch (error) {
        console.error('AI Suggestion Error:', error);
        alert("Sorry, we couldn't get AI suggestions at the moment.");
    } finally {
        submitButton.textContent = 'Get Suggestions';
        submitButton.disabled = false;
    }
}


// --- Initialization ---
export function initPlanner(currentUser) {
    user = currentUser;
    if (user) {
        tasksCollection = firebase.firestore().collection('users').doc(user.uid).collection('tasks');
        fetchTasks();
    } else {
        if (unsubscribeTasks) unsubscribeTasks();
        const taskList = document.getElementById('task-list');
        if(taskList) renderTasks([]);
    }
    
    const addTaskForm = document.getElementById('add-task-form');
    if (!addTaskForm || addTaskForm.dataset.initialized) {
        return; 
    }
    
    const taskList = document.getElementById('task-list');
    const editTaskModal = document.getElementById('edit-task-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const editTaskForm = document.getElementById('edit-task-form');
    
    const aiTaskSuggestionBtn = document.getElementById('ai-task-suggestion-btn');
    const aiSuggestionModal = document.getElementById('ai-suggestion-modal');
    const closeAiModalBtn = document.getElementById('close-ai-modal-btn');
    const aiSuggestionForm = document.getElementById('ai-suggestion-form');
    const aiGoalInput = document.getElementById('ai-goal-input');

    addTaskForm.addEventListener('submit', handleAddTask);
    taskList.addEventListener('click', handleTaskControls);
    
    editTaskForm.addEventListener('submit', handleUpdateTask);
    closeEditModalBtn.addEventListener('click', () => closeEditModal(editTaskModal));
    editTaskModal.addEventListener('click', (e) => {
        if (e.target === editTaskModal) closeEditModal(editTaskModal);
    });

    aiTaskSuggestionBtn.addEventListener('click', () => openAiModal(aiSuggestionModal, aiGoalInput));
    aiSuggestionForm.addEventListener('submit', handleAITaskSuggestion);
    closeAiModalBtn.addEventListener('click', () => closeAiModal(aiSuggestionModal, aiSuggestionForm));
    aiSuggestionModal.addEventListener('click', (e) => {
        if (e.target === aiSuggestionModal) closeAiModal(aiSuggestionModal, aiSuggestionForm);
    });

    addTaskForm.dataset.initialized = 'true';
}