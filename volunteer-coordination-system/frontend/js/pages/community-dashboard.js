/**
 * Community Dashboard Logic
 */

let currentUser = null;
let currentCommunity = null;
let nearbyVolunteers = [];
let areaTasks = [];
let map = null;

window.onload = async function () {
    try {
        checkAuth();
        currentUser = JSON.parse(localStorage.getItem('user'));
        currentCommunity = JSON.parse(localStorage.getItem('community'));

        updateUI();
        await loadDashboardStats();
        await loadNearbyVolunteers();
        await loadAreaTasks();
        await loadAnnouncements();
        await loadActivityFeed();

        initMap();
    } catch (err) {
        console.error("Initialization error:", err);
    }
};

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'community') {
        window.location.href = 'login.html';
    }
}

function updateUI() {
    if (!currentUser) return;

    // Basic User Info
    document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();

    // Sidebar Status Badge
    if (currentCommunity) updateStatusBadge();

    // Hero Section
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = `Welcome, ${currentUser.name}! 🌍`;

    if (currentCommunity) {
        const cityEl = document.getElementById('currentCity');
        if (cityEl) cityEl.textContent = currentCommunity.city;

        const previewEl = document.getElementById('needPreview');
        if (previewEl) previewEl.textContent = currentCommunity.needs || "No needs reported yet.";
    }

    // Update active link in sidebar
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

function updateStatusBadge() {
    const badge = document.getElementById('sidebarStatusBadge');
    badge.className = 'status-badge';

    if (currentCommunity.status === 'Resolved') {
        badge.textContent = '✅ Need Resolved';
        badge.classList.add('status-resolved');
    } else if (currentCommunity.priority === 'Critical') {
        badge.textContent = '🔴 Critical Need';
        badge.classList.add('status-critical');
    } else if (currentCommunity.priority === 'High') {
        badge.textContent = '🟠 High Priority';
        badge.classList.add('status-high');
    } else {
        badge.textContent = '🟢 Normal Priority';
        badge.style.background = '#eee';
        badge.style.color = '#555';
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:5000/api/community/dashboard-stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('statNearbyVolunteers').textContent = data.data.nearby_volunteers;
            document.getElementById('statActiveTasks').textContent = data.data.active_area_tasks;
            document.getElementById('statNGOs').textContent = data.data.supporting_ngos;
        }
    } catch (err) {
        console.warn("Stats fetch failed, using fallback:", err);
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            showToast("Server unreachable. Some dashboard data might be outdated.", "error");
        }
    }
}

async function loadNearbyVolunteers() {
    const grid = document.getElementById('nearbyVolunteersGrid');
    grid.innerHTML = '<p>Loading volunteers...</p>';

    try {
        const response = await fetch(`http://localhost:5000/api/community/nearby-volunteers?city=${currentCommunity.city}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (data.success && data.data.volunteers.length > 0) {
            nearbyVolunteers = data.data.volunteers;
            renderVolunteers(nearbyVolunteers);
        } else {
            renderVolunteers(getMockVolunteers());
        }
    } catch (err) {
        renderVolunteers(getMockVolunteers());
    }
}

function renderVolunteers(vols) {
    const grid = document.getElementById('nearbyVolunteersGrid');
    grid.innerHTML = '';

    vols.slice(0, 4).forEach(v => {
        const skillsArray = v.skills.split(',').map(s => s.trim());
        const card = document.createElement('div');
        card.className = `volunteer-card ${v.skill_match ? 'matched' : ''}`;

        card.innerHTML = `
            <div class="vol-avatar" style="background: ${getRandomColor()}">${v.name.charAt(0)}</div>
            <div class="vol-info">
                <span class="vol-name">${v.name}</span>
                <div class="vol-skills">
                    ${skillsArray.map(skill => `<span class="skill-pill">${skill}</span>`).join('')}
                </div>
                <span class="vol-loc">📍 ${v.location}</span>
            </div>
            <div class="vol-status">
                <span class="avail-dot ${v.availability === 'Available' ? 'dot-available' : 'dot-busy'}"></span>
                <span class="avail-text">${v.availability}</span>
                ${v.skill_match ? '<div style="color: var(--community-light); font-size: 10px; font-weight:700; margin-top:4px;">✅ Matches Need</div>' : ''}
            </div>
            <button class="chat-btn-outline" onclick="goToChat(${v.id})">Chat</button>
        `;
        grid.appendChild(card);
    });
}

async function loadAreaTasks() {
    const grid = document.getElementById('areaTasksGrid');
    grid.innerHTML = '<p>Loading tasks...</p>';

    try {
        const response = await fetch(`http://localhost:5000/api/community/area-tasks?city=${currentCommunity.city}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (data.success && data.data.tasks.length > 0) {
            areaTasks = data.data.tasks;
            renderTasks(areaTasks);
        } else {
            renderTasks(getMockTasks());
        }
    } catch (err) {
        renderTasks(getMockTasks());
    }
}

function renderTasks(tasks) {
    const grid = document.getElementById('areaTasksGrid');
    grid.innerHTML = '';

    tasks.slice(0, 3).forEach(t => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.borderTopColor = getPriorityColor(t.priority);

        const progress = getProgressValue(t.status);

        card.innerHTML = `
            <div class="task-header">
                <span class="priority-pill" style="background: ${getPriorityColor(t.priority)}; color: white">${t.priority}</span>
                <span style="font-size: 11px; color: #999">#TASK-${t.id}</span>
            </div>
            <h3 class="task-title">${t.title}</h3>
            <p class="task-desc">${t.description}</p>
            <div class="task-meta">
                <span>📍 ${t.location}</span>
                <span>🔧 ${t.required_skills}</span>
                <span>👥 ${t.people_needed} needed</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%; background: ${getProgressColor(t.status)}"></div>
                </div>
                <div class="progress-label">${t.status} - ${progress}%</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function loadAnnouncements() {
    const list = document.getElementById('announcementList');
    try {
        const response = await fetch('http://localhost:5000/api/community/announcements', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            list.innerHTML = '';
            data.data.announcements.forEach(a => {
                const item = document.createElement('div');
                item.className = 'announcement-item';
                item.innerHTML = `
                    <div class="announce-header">📢 ${a.sender_name}</div>
                    <p class="announce-text">${a.message}</p>
                    <div class="announce-time">${a.time_ago}</div>
                `;
                list.appendChild(item);
            });
        }
    } catch (err) {
        // Fallback or keep empty
    }
}

async function loadActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    if (!currentCommunity) {
        feed.innerHTML = '<p style="font-size: 12px; color: #999; text-align: center;">Update your profile to see status</p>';
        return;
    }

    const status = currentCommunity.status || 'Open';
    const isResolved = status === 'Resolved';
    const isInProgress = status === 'In Progress' || status === 'Assigned';
    const isOpen = status === 'Open';

    // Get date for today in a nice format
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    feed.innerHTML = `
        <div class="time-step ${isOpen || isInProgress || isResolved ? 'completed' : ''}">
            <div class="time-dot"></div>
            <div class="time-label">Need Reported</div>
            <div class="time-date">${today}</div>
        </div>
        <div class="time-step ${isInProgress || isResolved ? 'completed' : isOpen ? 'active' : ''}">
            <div class="time-dot"></div>
            <div class="time-label">NGO Reviewing</div>
            <div class="time-date">${isOpen ? 'Matching with volunteers' : 'Review completed'}</div>
        </div>
        <div class="time-step ${isResolved ? 'completed' : isInProgress ? 'active' : ''}">
            <div class="time-dot"></div>
            <div class="time-label">Volunteer Assigned</div>
            <div class="time-date">${isInProgress ? 'Help is on the way' : ''}</div>
        </div>
        <div class="time-step ${isResolved ? 'completed active' : ''}">
            <div class="time-dot"></div>
            <div class="time-label">Resolved</div>
            <div class="time-date">${isResolved ? 'Issue closed' : ''}</div>
        </div>
    `;
}

function initMap() {
    if (typeof L === 'undefined') return;

    const coords = {
        'Palladam': [10.9913, 77.0554],
        'Ukkadam': [10.9847, 76.9563],
        'Peelamedu': [11.0142, 76.9946]
    };

    const userCoords = coords[currentCommunity.city] || [11.0168, 76.9558];

    map = L.map('areaMap').setView(userCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // User Marker
    L.circleMarker(userCoords, {
        radius: 10,
        fillColor: "#1b5e20",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map).bindPopup("<b>You are here</b><br>" + currentCommunity.city);

    // Add random volunteer markers for visual impact
    nearbyVolunteers.forEach(v => {
        const offset = (Math.random() - 0.5) * 0.02;
        L.marker([userCoords[0] + offset, userCoords[1] + offset]).addTo(map)
            .bindPopup(`<b>Volunteer: ${v.name}</b><br>${v.status || v.availability}`);
    });
}

// Modal Functions
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    if (id === 'urgentNeedModal') {
        document.getElementById('urgentAddress').value = currentCommunity.address;
        document.getElementById('urgentPhone').value = currentCommunity.phone_number;
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function selectUrgency(level, element) {
    const parent = element.parentElement;
    parent.querySelectorAll('.pill-option').forEach(p => p.classList.remove('active'));
    element.classList.add('active');
    element.dataset.value = level;
}

async function submitUrgentNeed() {
    console.log("Submitting urgent need...");
    const desc = document.getElementById('urgentDesc').value;
    const activePill = document.querySelector('#urgencySelector .pill-option.active');
    const level = activePill ? (activePill.dataset.value || activePill.textContent.replace(/[^\w]/g, '')) : 'Critical';

    if (desc.length < 10) {
        showToast("Please provide more detail", "error");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/community/update-need', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                needs: desc,
                priority: level
            })
        });

        const data = await response.json();
        console.log("Response:", data);
        if (data.success) {
            showToast("🚨 Alert sent! Volunteers notified.", "success");
            localStorage.setItem('community', JSON.stringify(data.data.community));
            currentCommunity = data.data.community;
            updateUI();
            loadActivityFeed();
            closeModal('urgentNeedModal');
        } else {
            showToast(data.message || "Failed to send alert", "error");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        if (err.name === 'TypeError') {
            showToast("Failed to connect to server. Please check if the backend is running.", "error");
        } else {
            showToast("An unexpected error occurred", "error");
        }
    }
}

async function submitNeed() {
    console.log("Submitting standard need...");
    const title = document.getElementById('needTitle').value;
    const desc = document.getElementById('needDesc').value;
    const priority = document.getElementById('needPriority').value;

    if (!title || !desc) {
        showToast("Please fill all fields", "error");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/community/update-need', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                needs: desc,
                priority: priority
            })
        });

        const data = await response.json();
        console.log("Response:", data);
        if (data.success) {
            showToast("📋 Need submitted! NGO will review soon.", "success");
            localStorage.setItem('community', JSON.stringify(data.data.community));
            currentCommunity = data.data.community;
            updateUI();
            loadActivityFeed();
            closeModal('submitNeedModal');
        } else {
            showToast(data.message || "Failed to submit need", "error");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        if (err.name === 'TypeError') {
            showToast("Failed to connect to server. Please check if the backend is running.", "error");
        } else {
            showToast("An unexpected error occurred", "error");
        }
    }
}

// Volunteer Request Modal Logic
function openVolunteerRequestModal() {
    openModal('requestVolunteerModal');
    // Pre-fill location
    if (currentCommunity) {
        document.getElementById('reqLocation').value = currentCommunity.address || currentCommunity.city || '';
    }
}

function closeVolunteerRequestModal() {
    closeModal('requestVolunteerModal');
}

async function submitVolunteerRequest(event) {
    if (event) event.preventDefault();
    console.log("Submitting volunteer request...");

    const skill = document.getElementById('reqSkill').value;
    const urgency = document.getElementById('reqUrgency').value;
    const desc = document.getElementById('reqDesc').value;
    const location = document.getElementById('reqLocation').value;

    if (!skill || !desc || !location) {
        showToast("Please fill all required fields", "error");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/community/request-volunteer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                required_skill: skill,
                urgency: urgency,
                need_description: desc,
                location: location
            })
        });

        const data = await response.json();
        console.log("Response:", data);
        if (data.success) {
            showToast('Volunteer request submitted successfully! An NGO will review it shortly.', 'success');
            closeVolunteerRequestModal();
            document.getElementById('volunteerRequestForm').reset();
            loadActivityFeed();
        } else {
            showToast(data.message || "Failed to submit request", "error");
        }
    } catch (err) {
        console.error("Submission error:", err);
        if (err.name === 'TypeError') {
            showToast("Error connecting to server. Please check if the backend is running.", "error");
        } else {
            showToast("An unexpected error occurred", "error");
        }
    }
}

// Helpers
function getPriorityColor(p) {
    switch (p) {
        case 'Critical': return '#c62828';
        case 'High': return '#e65100';
        case 'Medium': return '#1565c0';
        default: return '#757575';
    }
}

function getProgressValue(s) {
    switch (s) {
        case 'Resolved': return 100;
        case 'In Progress': return 60;
        case 'Assigned': return 30;
        default: return 5;
    }
}

function getProgressColor(s) {
    switch (s) {
        case 'Resolved': return '#4caf50';
        case 'In Progress': return '#ff9800';
        case 'Assigned': return '#2196f3';
        default: return '#ccc';
    }
}

function getRandomColor() {
    const colors = ['#1b5e20', '#2e7d32', '#43a047', '#66bb6a', '#81c784'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function showToast(msg, type) {
    const container = document.getElementById('toastWrapper');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function goToChat(volId) {
    window.location.href = `chatbox.html?target=${volId}`;
}

// Mocks
function getMockVolunteers() {
    return [
        { id: 1, name: 'Dharun', skills: 'Doctor, Driving', location: currentCommunity.city, availability: 'Available', skill_match: true },
        { id: 2, name: 'Annamalai', skills: 'Counselling, Electrical', location: currentCommunity.city, availability: 'Busy', skill_match: false },
        { id: 3, name: 'Deenadhayalan', skills: 'Water, Plumbing', location: currentCommunity.city, availability: 'Available', skill_match: false }
    ];
}

function getMockTasks() {
    return [
        { id: 101, title: 'Medical Camp Setup', description: 'Assisting in setting up a local medical camp.', location: currentCommunity.city, priority: 'High', status: 'In Progress', required_skills: 'General Help', people_needed: 5 },
        { id: 102, title: 'Power Restoration', description: 'Emergency electrical work in community hall.', location: currentCommunity.city, priority: 'Critical', status: 'Assigned', required_skills: 'Electrical', people_needed: 2 }
    ];
}
