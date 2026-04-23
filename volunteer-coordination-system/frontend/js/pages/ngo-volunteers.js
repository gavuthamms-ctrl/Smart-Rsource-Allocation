/**
 * Smart Resource Allocation - Volunteer Management Logic
 */

let currentPage = 1;
let currentView = 'grid';
let searchQuery = '';
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileInfo();
    fetchVolunteers();
    fetchStatStrip();
    loadSkillsDropdown();
    
    // Form listeners
    document.getElementById('addVolunteerForm').addEventListener('submit', handleAddVolunteer);
    document.getElementById('assignTaskForm').addEventListener('submit', handleAssignTask);
});

const API_BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

function checkAuth() {
    if (!token) window.location.href = 'login.html';
}

function loadProfileInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    const ngo = JSON.parse(localStorage.getItem('ngo'));
    if (user) {
        document.getElementById('sidebarUserName').textContent = user.name;
        document.getElementById('sidebarAvatar').textContent = user.name.charAt(0);
    }
    if (ngo) {
        document.getElementById('ngoNameText').textContent = ngo.ngo_name;
    }
}

/**
 * Fetch and Render Volunteers
 */
async function fetchVolunteers() {
    const avail = document.getElementById('availFilter').value;
    const skill = document.getElementById('skillFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        search: searchQuery,
        availability: avail,
        skill: skill,
        sort: sort
    });

    try {
        const response = await fetch(`${API_BASE_URL}/ngo/volunteers?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            renderVolunteers(data.data);
            renderPagination(data.pagination);
        }
    } catch (err) {
        console.error("Error fetching volunteers:", err);
    }
}

function renderVolunteers(volunteers) {
    const container = document.getElementById('volunteerContainer');
    container.innerHTML = '';

    if (volunteers.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px;">No volunteers found matching your criteria.</div>';
        return;
    }

    volunteers.forEach(v => {
        const card = document.createElement('div');
        card.className = `vol-card ${v.availability.replace(' ', '-')}`;
        
        const skillsArray = v.skills ? v.skills.split(',') : [];
        const skillsHtml = skillsArray.slice(0, 3).map(s => `<span class="skill-pill">${s.trim()}</span>`).join('');

        card.innerHTML = `
            <div class="match-badge">Score: ${v.match_score}</div>
            <div class="vol-card-top">
                <div class="vol-avatar">${v.name.charAt(0)}</div>
                <h3 class="vol-name">${v.name}</h3>
                <span class="vol-code">${v.volunteer_code}</span>
                <span class="vol-loc">📍 ${v.location || 'Unknown'}</span>
            </div>
            
            <div class="vol-skills">${skillsHtml} ${skillsArray.length > 3 ? `<span class="skill-pill">+${skillsArray.length-3}</span>` : ''}</div>
            
            <div class="vol-mini-stats">
                <div class="mini-stat">
                    <span class="m-val">${v.tasks_completed}</span>
                    <span class="m-lbl">Done</span>
                </div>
                <div class="mini-stat">
                    <span class="m-val">${v.people_helped}</span>
                    <span class="m-lbl">Helped</span>
                </div>
                <div class="mini-stat">
                    <span class="m-val">${v.hours_volunteered}</span>
                    <span class="m-lbl">Hrs</span>
                </div>
            </div>

            <div class="current-task-bar">
                <span>Status: <span class="task-badge">${v.availability}</span></span>
                ${v.current_task ? `<span style="color:#2196f3">⚡ ${v.current_task.title.substring(0,15)}...</span>` : '<span>Free</span>'}
            </div>

            <div class="vol-actions">
                <button class="btn-outline small" onclick="openDrawer(${v.id})">👁 View</button>
                <button class="btn-primary small" style="background:#4caf50" onclick="openAssignTaskModal(${v.id}, '${v.name.replace(/'/g, "\\'")}')">📋 Assign</button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Fetch Stat Strip counts
 */
async function fetchStatStrip() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const s = data.data;
            document.getElementById('valTotal').textContent = s.total_volunteers;
            document.getElementById('valAvailable').textContent = s.available_volunteers;
            document.getElementById('valBusy').textContent = s.busy_volunteers;
            document.getElementById('valOnLeave').textContent = s.on_leave_volunteers;
        }
    } catch (err) { console.error(err); }
}

/**
 * Detail Drawer Logic
 */
async function openDrawer(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/volunteers?search=${id}`, { // Simplified for demo
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const v = data.data.find(vol => vol.id === id);
        
        if (v) {
            const profile = document.getElementById('drawerProfile');
            profile.innerHTML = `
                <div class="drawer-avatar">${v.name.charAt(0)}</div>
                <h2>${v.name}</h2>
                <p>${v.volunteer_code} | <span class="task-badge">${v.availability}</span></p>
                <p style="margin-top:5px; opacity:0.8; font-size:12px;">Match Score: ${v.match_score}</p>
            `;

            const content = document.getElementById('drawerContent');
            content.innerHTML = `
                <div class="content-section">
                    <h4 class="section-title">Contact Information</h4>
                    <div class="info-grid">
                        <div class="info-item"><span class="ii-lbl">Email</span><span class="ii-val">${v.email}</span></div>
                        <div class="info-item"><span class="ii-lbl">Phone</span><span class="ii-val">${v.phone_number || 'N/A'}</span></div>
                        <div class="info-item"><span class="ii-lbl">Location</span><span class="ii-val">${v.location || 'N/A'}</span></div>
                    </div>
                </div>
                <div class="content-section">
                    <h4 class="section-title">Skills & Expertise</h4>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${v.skills ? v.skills.split(',').map(s => `<span class="skill-pill" style="background:#e8f5e9; color:#2e7d32;">${s.trim()}</span>`).join('') : 'None'}
                    </div>
                </div>
                <div class="content-section">
                    <h4 class="section-title">Performance Stats</h4>
                    <div class="info-grid">
                        <div class="info-item"><span class="ii-lbl">Tasks Completed</span><span class="ii-val">${v.tasks_completed}</span></div>
                        <div class="info-item"><span class="ii-lbl">People Helped</span><span class="ii-val">${v.people_helped}</span></div>
                        <div class="info-item"><span class="ii-lbl">Total Hours</span><span class="ii-val">${v.hours_volunteered}</span></div>
                        <div class="info-item"><span class="ii-lbl">Recent Rating</span><span class="ii-val">⭐ 4.8</span></div>
                    </div>
                </div>
                <div class="content-section">
                    <h4 class="section-title">About / Notes</h4>
                    <p style="font-size:13px; color:#555; line-height:1.6;">${v.notes || 'No bio available for this volunteer.'}</p>
                </div>
            `;

            document.getElementById('detailDrawer').classList.add('open');
            window.activeVolunteerId = v.id;
            window.activeVolunteerName = v.name;
        }
    } catch (err) { console.error(err); }
}

function closeDrawer() {
    document.getElementById('detailDrawer').classList.remove('open');
}

/**
 * Add Volunteer
 */
async function handleAddVolunteer(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/volunteers/create`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            alert("Volunteer added successfully!");
            closeModal('addVolunteerModal');
            fetchVolunteers();
        }
    } catch (err) { console.error(err); }
}

/**
 * Assign Task Logic
 */
async function openAssignTaskModal(id, name) {
    document.getElementById('assignVolunteerId').value = id;
    document.getElementById('assignTargetInfo').innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; background:#f9f9f9; padding:10px; border-radius:8px;">
            <div style="width:30px; height:30px; background:var(--ngo-color); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; border-radius:15px; font-weight:700;">${name.charAt(0)}</div>
            <span style="font-weight:600;">Assigning task to ${name}</span>
        </div>
    `;
    
    // Load open tasks
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks?status=Open`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const select = document.getElementById('taskSelect');
        select.innerHTML = '<option value="">Choose an open task...</option>';
        data.data.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.title} (📍 ${t.location})</option>`;
        });
    } catch (err) { console.error(err); }

    document.getElementById('assignTaskModal').style.display = 'block';
}

function openAssignTaskModalFromDrawer() {
    const id = window.activeVolunteerId;
    const name = window.activeVolunteerName;
    closeDrawer();
    openAssignTaskModal(id, name);
}

async function handleAssignTask(e) {
    e.preventDefault();
    const id = document.getElementById('assignVolunteerId').value;
    const taskId = document.getElementById('taskSelect').value;
    const deadline = document.getElementById('assignmentDeadline').value;
    const notes = document.getElementById('assignmentNotes').value;

    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks/create`, { // We'll use this or a dedicated assign endpoint
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: "Internal Update", // Minimal placeholder for create_task logic
                description: notes,
                required_skills: "None",
                location: "Online",
                priority: "Medium",
                due_date: deadline,
                volunteer_id: id,
                status: 'Assigned'
            })
        });
        if (response.ok) {
            alert("Task assigned successfully!");
            closeModal('assignTaskModal');
            fetchVolunteers();
        }
    } catch (err) { console.error(err); }
}

/**
 * Utils
 */
function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchQuery = document.getElementById('searchInput').value;
        currentPage = 1;
        fetchVolunteers();
    }, 500);
}

function renderPagination(pg) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (pg.pages <= 1) return;

    for (let i = 1; i <= pg.pages; i++) {
        const btn = document.createElement('button');
        btn.className = `pg-btn ${i === pg.page ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; fetchVolunteers(); };
        container.appendChild(btn);
    }
}

function setViewMode(mode) {
    currentView = mode;
    document.getElementById('viewModeGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('viewModeTable').classList.toggle('active', mode === 'table');
    document.getElementById('volunteerContainer').className = mode === 'grid' ? 'volunteer-grid' : 'volunteer-table-view';
    fetchVolunteers();
}

function loadSkillsDropdown() {
    const skills = ["Doctor", "Driving", "Counselling", "Electrical Work", "Water Treatment", "Road Work", "First Aid", "Teaching"];
    const select = document.getElementById('skillFilter');
    skills.forEach(s => {
        select.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

function openAddVolunteerModal() { document.getElementById('addVolunteerModal').style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }
