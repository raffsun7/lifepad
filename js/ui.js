// js/ui.js

const sections = document.querySelectorAll('.app-section');
const mainNav = document.getElementById('main-nav');

export function showSection(targetId) {
    // Hide all sections
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show the target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Update active link style
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link');
        if (link.dataset.target === targetId) {
            link.classList.add('active-link');
        }
    });
}

export function initNavigation() {
    mainNav.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('nav-link')) {
            showSection(e.target.dataset.target);
        }
    });
}

export function updateAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (user) {
        // User is signed in
        authContainer.innerHTML = `
            <img src="${user.photoURL}" alt="User Avatar" class="w-10 h-10 rounded-full border-2 border-gray-300">
            <button id="logout-btn" class="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
    } else {
        // User is signed out
        authContainer.innerHTML = `
            <button id="login-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                Login with Google
            </button>
        `;
        document.getElementById('login-btn').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider);
        });
    }
}