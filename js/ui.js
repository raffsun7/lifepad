// js/ui.js --- FINAL VERSION with Google Icon in Login Button

const sections = document.querySelectorAll('.app-section');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');

// Combined function to update both desktop and mobile nav links
function updateNavLinks(targetId) {
    const allLinks = document.querySelectorAll('.nav-link, .nav-link-mobile');
    allLinks.forEach(link => {
        if (link.dataset.target === targetId) {
            link.classList.add('active-link');
        } else {
            link.classList.remove('active-link');
        }
    });
}

export function showSection(targetId) {
    sections.forEach(section => {
        if (section.id !== targetId) {
            section.classList.add('hidden');
        }
    });

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    updateNavLinks(targetId);
}

function handleNavClick(e) {
    e.preventDefault();
    const targetLink = e.target.closest('[data-target]');
    if (targetLink) {
        const sectionId = targetLink.dataset.target;
        showSection(sectionId);
    }
}

export function initNavigation() {
    mainNav.addEventListener('click', handleNavClick);
    mobileNav.addEventListener('click', handleNavClick);
}

export function updateAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (user) {
        // User is logged in, show their avatar and a logout button
        authContainer.innerHTML = `
            <div class="flex items-center space-x-3">
                <img src="${user.photoURL || 'files/default-avatar.png'}" alt="Avatar" class="w-10 h-10 rounded-full border-2 border-white/50">
                <button id="logout-btn" class="text-sm font-medium text-slate-600 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400">Logout</button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => firebase.auth().signOut());
    } else {
        // --- UPDATED: Added ion-icon to the button and flexbox classes ---
        authContainer.innerHTML = `
            <button id="login-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2">
                <ion-icon name="logo-google" class="text-xl"></ion-icon>
                <span>Sign in with Google</span>
            </button>
        `;
        // The button now triggers the Google popup directly
        document.getElementById('login-btn').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).catch(error => {
                console.error("Authentication Error:", error);
                alert(`Error signing in: ${error.message}`);
            });
        });
    }
}