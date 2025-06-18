// js/planner.js

// This state will be passed from main.js
let user = null;
let tasksCollection;

const addTaskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');

function renderTasks(tasks) {
    taskList.innerHTML = ''; // Clear existing list
    if (tasks.length === 0) {
        taskList.innerHTML = `<p class="text-gray-500">No tasks for today. Add one above!</p>`;
        return;
    }
    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-card bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex justify-between items-center mb-2';
        taskEl.innerHTML = `
            <span>${task.text}</span>
            <button data-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-700">Delete</button>
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
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        taskInput.value = '';
    } else if (!user) {
        alert("Please log in to save tasks.");
    }
}

async function handleDeleteTask(e) {
    if (e.target.classList.contains('delete-task-btn') && user) {
        const taskId = e.target.dataset.id;
        await tasksCollection.doc(taskId).delete();
    }
}

export function initPlanner(currentUser) {
    user = currentUser;
    if (user) {
        tasksCollection = firebase.firestore().collection('users').doc(user.uid).collection('tasks');
        fetchTasks();
    } else {
        renderTasks([]); // Clear tasks on logout
    }
    
    // Add event listeners only once
    if (!addTaskForm.dataset.initialized) {
        addTaskForm.addEventListener('submit', handleAddTask);
        taskList.addEventListener('click', handleDeleteTask);
        addTaskForm.dataset.initialized = 'true';
    }
}