/**
 * Smart Resource Allocation - Volunteer Dashboard Logic
 */

let map;
let recommendationTasks = [];
let activeTasks = [];

window.onload = async function() {
    if (!checkAuth()) return;
    
    // UI Initialization
    loadUserInfo();
    loadHeroSection();
    
    // Data Loading
    await Promise.all([
        loadRecommendations(),
        loadMyTasks(),
        initMap()
    ]);
};

/**
 * AUTHENTICATION
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!token || !user || user.role !== 'volunteer') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function getToken() { return localStorage.getItem('token'); }
function getVolunteer() { return JSON.parse(localStorage.getItem('volunteer') || '{}'); }

function getAuthHeaders() {
    return {
        'Authorization': 'Bearer ' + getToken(),
        'Content-Type': 'application/json'
    };
}

/**
 * SIDEBAR & NAVIGATION
 */
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
    
    document.getElementById('sidebarName').textContent = user.name;
    document.getElementById('sidebarAvatar').textContent = initial;
    document.getElementById('navUserName').textContent = user.name;
    document.getElementById('navAvatar').textContent = initial;
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

/**
 * HERO SECTION
 */
function loadHeroSection() {
    const user = JSON.parse(localStorage.getItem('user'));
    const volunteer = getVolunteer();
    
    document.getElementById('heroGreeting').textContent = `Welcome back, ${user.name.split(' ')[0]}! 👋`;
    
    const skills = volunteer.skills || 'Community';
    const location = volunteer.location || 'your area';
    document.getElementById('heroSubtitle').textContent = `Your ${skills} expertise is needed in ${location} today.`;
    
    // Status Toggle
    updateAvailabilityUI(volunteer.availability || 'Available');
    
    loadVolunteerStats();
}

async function loadVolunteerStats() {
    try {
        const res = await fetch('http://localhost:5000/api/volunteers/me/stats', { headers: getAuthHeaders() });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('statTasks').textContent = data.data.tasks_completed || 0;
            document.getElementById('statPeople').textContent = data.data.people_helped || 0;
            document.getElementById('statHours').textContent = `${data.data.hours_volunteered || 0} hrs`;
        }
    } catch (e) {
        console.warn('Stats API not ready, using defaults.');
    }
}

function updateAvailabilityUI(status) {
    const toggle = document.getElementById('availToggle');
    const badge = document.getElementById('onLeaveBadge');
    
    if (status === 'On Leave') {
        toggle.style.display = 'none';
        badge.style.display = 'block';
    } else {
        toggle.style.display = 'flex';
        badge.style.display = 'none';
        toggle.classList.remove('is-available', 'is-busy');
        toggle.classList.add(status === 'Available' ? 'is-available' : 'is-busy');
    }
}

async function toggleAvailability() {
    const volunteer = getVolunteer();
    if (volunteer.availability === 'On Leave') return;
    
    const newStatus = volunteer.availability === 'Available' ? 'Busy' : 'Available';
    
    // Optimistic Update
    updateAvailabilityUI(newStatus);
    
    try {
        const res = await fetch('http://localhost:5000/api/volunteers/availability', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ availability: newStatus })
        });
        
        const data = await res.json();
        if (data.success) {
            volunteer.availability = newStatus;
            localStorage.setItem('volunteer', JSON.stringify(volunteer));
            showToast(`Status updated to ${newStatus}`, 'success');
        } else {
            throw new Error();
        }
    } catch (e) {
        // Revert
        updateAvailabilityUI(volunteer.availability);
        showToast('Could not update status', 'error');
    }
}

/**
 * RECOMMENDATIONS
 */
async function loadRecommendations() {
    const volunteer = getVolunteer();
    const skills = volunteer.skills || '';
    const location = volunteer.location || '';
    const grid = document.getElementById('recommendationsGrid');
    
    try {
        const url = `http://localhost:5000/api/tasks/recommended?skills=${encodeURIComponent(skills)}&location=${encodeURIComponent(location)}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        
        recommendationTasks = (data.success && data.data.tasks.length > 0) ? data.data.tasks : getMockTasks();
    } catch (e) {
        recommendationTasks = getMockTasks();
    }
    
    renderRecommendations(recommendationTasks);
}

function renderRecommendations(tasks) {
    const grid = document.getElementById('recommendationsGrid');
    const countBadge = document.getElementById('matchCount');
    
    grid.innerHTML = '';
    
    const volunteer = getVolunteer();
    const volSkills = (volunteer.skills || '').toLowerCase().split(',').map(s => s.trim());
    const volLoc = (volunteer.location || '').toLowerCase().trim();

    // Filter logic for personalization (if backend didn't do it)
    const filtered = tasks.filter(task => {
        const taskSkills = task.required_skills.toLowerCase();
        const matchesSkill = volSkills.some(s => taskSkills.includes(s));
        const matchesLoc = task.location.toLowerCase().includes(volLoc);
        return matchesSkill || matchesLoc;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <div class="empty-icon">🎉</div>
                <h4>No urgent tasks in your area right now!</h4>
                <p>Check back later or browse all open tasks.</p>
                <button class="btn btn-outline" style="margin-top:15px">Browse All Tasks</button>
            </div>
        `;
        countBadge.textContent = '';
        return;
    }

    countBadge.textContent = `${filtered.length} tasks matched`;
    
    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority.toLowerCase()}`;
        card.id = `task-card-${task.id}`;
        
        const skillBadges = task.required_skills.split(',').map(s => `<span class="skill-badge">${s.trim()}</span>`).join('');
        
        card.innerHTML = `
            <div class="card-top">
                <span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority}</span>
                <span class="task-location">📍 ${task.location}</span>
            </div>
            <h4 class="task-title">${task.title}</h4>
            <p class="task-desc">${task.description}</p>
            <div class="skills-needed-row">
                <span class="skills-label">Skills needed:</span>
                <div class="skills-badges">${skillBadges}</div>
            </div>
            <div class="card-bottom">
                <div class="posted-info">
                    👤 ${task.posted_by}<br>
                    🕐 ${task.posted_ago}
                </div>
                <div class="card-actions">
                    <button class="btn btn-success" onclick="acceptTask(${task.id})">✅ Accept</button>
                    <button class="btn btn-outline" onclick="viewTaskDetails(${task.id})">👁 View</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getPriorityClass(p) {
    if (p === 'Critical') return 'crit';
    if (p === 'High') return 'high';
    if (p === 'Medium') return 'med';
    return 'low';
}

function getMockTasks() {
    return [
        {
            id: 1, title: "Water Treatment Support Needed", location: "Peelamedu", priority: "High",
            required_skills: "Water Treatment, Road Work", posted_by: "Gavutham Foundation", posted_ago: "2 hours ago",
            description: "Community facing waterlogging issue near main road. Need water treatment specialist."
        },
        {
            id: 2, title: "Medical Camp Volunteer Required", location: "Palladam", priority: "Critical",
            required_skills: "Doctor, First Aid", posted_by: "Gavutham Foundation", posted_ago: "5 hours ago",
            description: "Weekend medical camp for elderly residents. Doctor needed for checkups and prescriptions."
        },
        {
            id: 3, title: "Electrical Repair at Community Hall", location: "Ukkadam", priority: "Critical",
            required_skills: "Electrical Work", posted_by: "Gavutham Foundation", posted_ago: "1 hour ago",
            description: "Wiring issue causing power outage in community hall. Urgent fix needed."
        },
        {
            id: 4, title: "Counselling Session for Flood Victims", location: "Ukkadam", priority: "Medium",
            required_skills: "Counselling", posted_by: "Gavutham Foundation", posted_ago: "3 hours ago",
            description: "Group counselling session needed for 15 families displaced by recent flooding."
        }
    ];
}

/**
 * ACTIONS
 */
async function acceptTask(taskId) {
    if (!confirm('Are you sure you want to accept this task?')) return;
    
    try {
        const res = await fetch('http://localhost:5000/api/tasks/accept', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ task_id: taskId, volunteer_id: getVolunteer().id })
        });
        const data = await res.json();
        
        if (data.success) {
            const card = document.getElementById(`task-card-${taskId}`);
            if (card) card.remove();
            showToast('Task accepted! Check My Active Tasks.', 'success');
            loadMyTasks();
        } else {
            showToast(data.message || 'Could not accept task', 'error');
        }
    } catch (e) {
        showToast('Server unreachable.', 'error');
    }
}

function viewTaskDetails(taskId) {
    const task = recommendationTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('detailModalTitle').textContent = task.title;
    document.getElementById('taskDetailBody').innerHTML = `
        <div style="margin-bottom:15px">
            <span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority} Priority</span>
            <span style="margin-left:10px; color:#666">📍 ${task.location}</span>
        </div>
        <p style="font-size:14px; line-height:1.6; color:#444; margin-bottom:20px">${task.description}</p>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px">
            <div style="font-weight:600; font-size:13px; margin-bottom:8px">NGO: ${task.posted_by}</div>
            <div style="font-size:12px; color:#888">Posted ${task.posted_ago}</div>
        </div>
    `;
    
    const acceptBtn = document.getElementById('detailAcceptBtn');
    acceptBtn.onclick = () => {
        closeModal('taskDetailModal');
        acceptTask(taskId);
    };
    
    openModal('taskDetailModal');
}

/**
 * ACTIVE TASKS
 */
async function loadMyTasks() {
    try {
        const res = await fetch('http://localhost:5000/api/volunteers/me/tasks', { headers: getAuthHeaders() });
        const data = await res.json();
        activeTasks = (data.success && data.data.tasks.length > 0) ? data.data.tasks : getMockMyTasks();
    } catch (e) {
        activeTasks = getMockMyTasks();
    }
    
    renderKanban(activeTasks);
    renderList(activeTasks);
}

function getMockMyTasks() {
    return [
        { id: 10, title: "Medical Camp - Palladam", priority: "Critical", status: "In Progress", due_date: "2024-04-15", ngo: "Gavutham Foundation" },
        { id: 11, title: "Road Survey - Peelamedu", priority: "High", status: "To Do", due_date: "2024-04-18", ngo: "Gavutham Foundation" },
        { id: 12, title: "Water Testing - Palladam", priority: "Medium", status: "Pending Review", due_date: "2024-04-10", ngo: "Gavutham Foundation" }
    ];
}

function renderKanban(tasks) {
    const todo = document.getElementById('todoCards');
    const inprogress = document.getElementById('inprogressCards');
    const review = document.getElementById('reviewCards');
    
    todo.innerHTML = '';
    inprogress.innerHTML = '';
    review.innerHTML = '';
    
    let tCount = 0, iCount = 0, rCount = 0;
    
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `kanban-card priority-${task.priority.toLowerCase()}`;
        card.innerHTML = `
            <h4>${task.title}</h4>
            <span class="priority-badge ${getPriorityClass(task.priority)}" style="font-size:9px">${task.priority}</span>
            <div class="kanban-meta">
                <span>📅 ${task.due_date}</span>
                <span>🏢 ${task.ngo}</span>
            </div>
            ${task.status === 'Pending Review' ? `<button class="btn-report" onclick="openFieldReportModal(${task.id}, '${task.title}')">📝 Submit Report</button>` : `<button class="btn-report" onclick="openFieldReportModal(${task.id}, '${task.title}')">📝 Field Report</button>`}
        `;
        
        if (task.status === 'To Do') { todo.appendChild(card); tCount++; }
        else if (task.status === 'In Progress') { inprogress.appendChild(card); iCount++; }
        else if (task.status === 'Pending Review') { review.appendChild(card); rCount++; }
    });
    
    document.getElementById('todoCount').textContent = tCount;
    document.getElementById('inprogressCount').textContent = iCount;
    document.getElementById('reviewCount').textContent = rCount;
    
    document.getElementById('activeTasksEmpty').style.display = tasks.length === 0 ? 'block' : 'none';
}

function renderList(tasks) {
    const tbody = document.getElementById('taskListBody');
    tbody.innerHTML = '';
    
    tasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight:600">${task.title}</td>
            <td><span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority}</span></td>
            <td><span class="status-badge st-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></td>
            <td>${task.due_date}</td>
            <td>${task.ngo}</td>
            <td>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:10px" onclick="openFieldReportModal(${task.id}, '${task.title}')">📝 Report</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupViewToggle(view) {
    const kanban = document.getElementById('kanbanView');
    const list = document.getElementById('listView');
    const kBtn = document.getElementById('kanbanBtn');
    const lBtn = document.getElementById('listBtn');
    
    if (view === 'kanban') {
        kanban.style.display = 'block';
        list.style.display = 'none';
        kBtn.classList.add('active');
        lBtn.classList.remove('active');
    } else {
        kanban.style.display = 'none';
        list.style.display = 'block';
        lBtn.classList.add('active');
        kBtn.classList.remove('active');
    }
}

/**
 * MAP
 */
function initMap() {
    const volunteer = getVolunteer();
    const coords = getVolunteerCoords(volunteer.location || '');
    
    map = L.map('communityMap').setView(coords, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Volunteer Pulse Marker
    L.circleMarker(coords, {
        radius: 10, fillColor: '#1a237e', color: '#fff', weight: 3, fillOpacity: 0.9, className: 'pulse'
    }).addTo(map).bindPopup(`<b>📍 You are here</b><br>${volunteer.location || 'Your area'}`);

    // Need Pins
    const needPins = [
        { coords: [10.9920, 77.0560], priority: "Critical", title: "Medical Emergency", desc: "Elderly patient needs home doctor visit", loc: "Palladam Main Street" },
        { coords: [10.9847, 76.9563], priority: "Critical", title: "Electrical Outage", desc: "Community hall wiring failure", loc: "Ukkadam" },
        { coords: [11.0142, 76.9946], priority: "High", title: "Water Treatment", desc: "Road waterlogging near bus stand", loc: "Peelamedu" },
        { coords: [10.9900, 77.0200], priority: "High", title: "Flood Relief", desc: "25 families need counselling support", loc: "Coimbatore North" },
        { coords: [11.0000, 77.0100], priority: "Medium", title: "Road Repair", desc: "Pothole repair needed on school route", loc: "Ganapathy" }
    ];

    needPins.forEach(pin => {
        L.circleMarker(pin.coords, {
            radius: 12, fillColor: getPriorityHex(pin.priority), color: '#fff', weight: 2, fillOpacity: 0.85
        }).addTo(map).bindPopup(`
            <div style="padding:10px">
                <h5 style="margin:0 0 5px 0">${pin.title}</h5>
                <p style="font-size:12px; margin:0 0 10px 0">${pin.desc}</p>
                <div style="font-size:11px; color:#666">📍 ${pin.loc}</div>
                <div style="font-weight:700; color:${getPriorityHex(pin.priority)}; font-size:11px; margin-top:5px">● ${pin.priority} Priority</div>
            </div>
        `);
    });
}

function getVolunteerCoords(location) {
    const map = {
        'palladam': [10.9913, 77.0554],
        'ukkadam': [10.9847, 76.9563],
        'peelamedu': [11.0142, 76.9946]
    };
    return map[location.toLowerCase().trim()] || [10.9925, 77.0150];
}

function getPriorityHex(p) {
    if (p === 'Critical') return '#c62828';
    if (p === 'High') return '#e65100';
    if (p === 'Medium') return '#1565c0';
    return '#546e7a';
}

/**
 * MODALS & REPORTS
 */
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function openFieldReportModal(taskId, taskTitle) {
    const modal = document.getElementById('reportModal');
    modal.dataset.taskId = taskId;
    document.getElementById('reportModalTitle').textContent = `Submit Field Report — ${taskTitle}`;
    openModal('reportModal');
}

function previewPhoto(input) {
    const preview = document.getElementById('photoPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitFieldReport() {
    const taskId = document.getElementById('reportModal').dataset.taskId;
    const notes = document.getElementById('reportNotes').value.trim();
    const photo = document.getElementById('reportPhoto').files[0];
    const people = document.getElementById('reportPeople').value;

    if (!notes) {
        showToast('Please describe what you did', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('task_id', taskId);
    formData.append('notes', notes);
    formData.append('people_helped', people || 0);
    if (photo) formData.append('photo', photo);

    try {
        const res = await fetch('http://localhost:5000/api/tasks/report', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            closeModal('reportModal');
            showToast('Field report submitted!', 'success');
            loadMyTasks();
        } else {
            showToast(data.message || 'Submission failed', 'error');
        }
    } catch (e) {
        showToast('Report submitted (Mock mode)', 'success');
        closeModal('reportModal');
    }
}

/**
 * UTILS
 */
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('volunteer');
    showToast('Logged out successfully', 'success');
    setTimeout(() => window.location.href = 'login.html', 800);
}

// Close modals on Esc
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
});

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
