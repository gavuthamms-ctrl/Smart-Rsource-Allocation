/**
 * Profile Page Logic
 * Pure Vanilla JavaScript
 */

const API_BASE_URL = 'http://localhost:5000/api';

// --- STATE ---
let currentProfile = {};

// --- INITIALIZATION ---
window.onload = async function() {
    if (!checkAuth()) return;
    
    initSidebar();
    await fetchProfileData();
    
    setupEventListeners();
};

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function initSidebar() {
    const user = JSON.parse(localStorage.getItem('user'));
    const volunteer = JSON.parse(localStorage.getItem('volunteer') || '{}');
    
    // Populate Sidebar
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();
    
    if (user.role === 'volunteer' && volunteer.match_score) {
        document.getElementById('sidebarMatchBadge').style.display = 'block';
        document.getElementById('sidebarMatchVal').textContent = volunteer.match_score;
    }
    
    // Navbar
    document.getElementById('navbarUserName').textContent = user.name;
    document.getElementById('navbarUserRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('navbarAvatar').textContent = user.name.charAt(0).toUpperCase();
}

// --- DATA FETCHING ---
async function fetchProfileData() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentProfile = data.data;
            populateUI(currentProfile);
            
            // Sync LocalStorage
            localStorage.setItem('user', JSON.stringify({
                id: currentProfile.user_id,
                name: currentProfile.name,
                email: currentProfile.email,
                role: currentProfile.role
            }));
            
            if (currentProfile.role === 'volunteer') {
                localStorage.setItem('volunteer', JSON.stringify(currentProfile));
            }
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showToast('Failed to load profile data', 'error');
    }
}

// --- UI POPULATION ---
function populateUI(profile) {
    // Large Avatar
    const avatar = document.getElementById('profileLargeAvatar');
    const initials = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
    avatar.textContent = initials;
    avatar.style.backgroundColor = generateColor(profile.name);
    
    // Text Labels
    document.getElementById('profileFullName').textContent = profile.name;
    document.getElementById('profileRoleBadge').textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
    
    // Form Inputs
    document.getElementById('inputName').value = profile.name || '';
    document.getElementById('inputEmail').value = profile.email || '';
    document.getElementById('inputPhone').value = profile.phone_number || '';
    document.getElementById('inputLocation').value = profile.location || '';
    document.getElementById('inputSkills').value = profile.skills || '';
    
    // Match Score
    const score = profile.match_score || 0;
    updateCircularProgress(score);
    
    // Status Toggle
    const status = profile.availability || 'Available';
    updateStatusUI(status);
    
    // Stats
    document.getElementById('statTasksDone').textContent = profile.tasks_completed || 0;
    document.getElementById('statHours').textContent = profile.hours_volunteered || 0;
    document.getElementById('statPeople').textContent = profile.people_helped || 0;
}

function updateCircularProgress(percent) {
    const circle = document.getElementById('scoreCirclePath');
    const text = document.getElementById('scoreText');
    
    circle.style.strokeDasharray = `${percent}, 100`;
    text.textContent = `${percent}%`;
}

function updateStatusUI(status) {
    const btns = document.querySelectorAll('.status-btn');
    btns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    
    const dot = document.getElementById('profileStatusDot');
    if (status === 'Available') dot.style.backgroundColor = '#4caf50';
    else if (status === 'Busy') dot.style.backgroundColor = '#ff9800';
    else dot.style.backgroundColor = '#f44336';
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    const form = document.getElementById('profileForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Handle status toggle buttons
    const statusBtns = document.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newStatus = btn.dataset.status;
            updateStatus(newStatus);
        });
    });
}

async function updateStatus(newStatus) {
    // Optimistic update
    const previousStatus = currentProfile.availability;
    currentProfile.availability = newStatus;
    updateStatusUI(newStatus);
    
    const success = await saveProfileChange({ availability: newStatus });
    if (!success) {
        // Rollback
        currentProfile.availability = previousStatus;
        updateStatusUI(previousStatus);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const updatedData = {
        name: document.getElementById('inputName').value,
        phone_number: document.getElementById('inputPhone').value,
        location: document.getElementById('inputLocation').value,
        skills: document.getElementById('inputSkills').value
    };
    
    const success = await saveProfileChange(updatedData);
    
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    
    if (success) {
        // Update header and local state
        document.getElementById('profileFullName').textContent = updatedData.name;
        document.getElementById('navbarUserName').textContent = updatedData.name;
        document.getElementById('sidebarUserName').textContent = updatedData.name;
        
        // Regenerate avatar color if name changed
        document.getElementById('profileLargeAvatar').style.backgroundColor = generateColor(updatedData.name);
    }
}

async function saveProfileChange(payload) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile/me`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Profile updated successfully!', 'success');
            // Update local state and storage
            Object.assign(currentProfile, data.data);
            
            localStorage.setItem('user', JSON.stringify({
                id: currentProfile.user_id,
                name: currentProfile.name,
                email: currentProfile.email,
                role: currentProfile.role
            }));
            
            if (currentProfile.role === 'volunteer') {
                localStorage.setItem('volunteer', JSON.stringify(currentProfile));
            }
            
            return true;
        } else {
            showToast(data.message || 'Update failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Server error during update', 'error');
        return false;
    }
}

// --- HELPERS ---
function generateColor(str) {
    if (!str) return '#1a237e';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 60%, 40%)`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
