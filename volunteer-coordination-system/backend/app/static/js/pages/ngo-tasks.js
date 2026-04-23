/**
 * Smart Resource Allocation - Task Management Logic
 */

let currentTasks = [];
let currentFilterStatus = '';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileInfo();
    fetchTasks();
    fetchTaskStats();
    loadAvailableVolunteers();

    // Check query params for action
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
        openCreateTaskModal();
        // Prefill if needed
        if (urlParams.get('title')) document.querySelector('[name="title"]').value = urlParams.get('title');
        if (urlParams.get('location')) document.querySelector('[name="location"]').value = urlParams.get('location');
        if (urlParams.get('description')) document.querySelector('[name="description"]').value = urlParams.get('description');
        if (urlParams.get('skills')) document.querySelector('[name="required_skills"]').value = urlParams.get('skills');
        
        if (urlParams.get('priority')) {
            const radio = document.querySelector(`input[name="priority"][value="${urlParams.get('priority')}"]`);
            if (radio) radio.checked = true;
        }
    }

    document.getElementById('taskForm').addEventListener('submit', handleCreateTask);
});

const API_BASE_URL = '/api';
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
 * Fetch and Render Tasks
 */
async function fetchTasks() {
    const search = document.getElementById('taskSearch').value;
    const priority = document.getElementById('priorityFilter').value;
    const location = document.getElementById('locationFilter').value;

    const params = new URLSearchParams({
        search: search,
        priority: priority,
        location: location
    });

    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            currentTasks = data.data;
            renderKanban(currentTasks);
            renderList(currentTasks);
        }
    } catch (err) { console.error(err); }
}

function renderKanban(tasks) {
    const cols = {
        'Open': document.getElementById('listOpen'),
        'Assigned': document.getElementById('listAssigned'),
        'In Progress': document.getElementById('listInProgress'),
        'Pending Review': document.getElementById('listReview'),
        'Completed': document.getElementById('listCompleted')
    };

    // Clear columns
    Object.values(cols).forEach(c => c.innerHTML = '');

    tasks.forEach(task => {
        const list = cols[task.status];
        if (!list) return;

        const card = document.createElement('div');
        card.className = `task-card ${task.priority}`;
        card.onclick = () => openTaskDrawer(task.id);
        
        card.innerHTML = `
            <div class="t-card-top">
                <span class="prio-badge ${task.priority}">${task.priority}</span>
                <span class="t-id">#${task.id}</span>
            </div>
            <span class="t-title">${task.title}</span>
            <div class="t-info">
                <span>📍 ${task.location}</span>
                <span>🔧 ${task.required_skills}</span>
                <span>📅 Due: ${task.due_date}</span>
            </div>
            ${task.assigned_volunteer ? `
                <div class="t-volunteer">
                    <div class="v-avatar">${task.assigned_volunteer.charAt(0)}</div>
                    <span class="v-name">${task.assigned_volunteer}</span>
                </div>
            ` : ''}
        `;
        list.appendChild(card);
    });

    // Update column counts
    Object.keys(cols).forEach(status => {
        const countSpan = document.querySelector(`.column-header.${statusToColorClass(status)} .count`);
        if (countSpan) countSpan.textContent = tasks.filter(t => t.status === status).length;
    });
}

function statusToColorClass(status) {
    const map = {
        'Open': 'blue',
        'Assigned': 'orange',
        'In Progress': 'yellow',
        'Pending Review': 'purple',
        'Completed': 'green'
    };
    return map[status] || 'gray';
}

function renderList(tasks) {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = '';
    tasks.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td>#${t.id}</td>
                <td><b>${t.title}</b></td>
                <td><span class="prio-badge ${t.priority}">${t.priority}</span></td>
                <td>${t.location}</td>
                <td><span class="task-badge">${t.status}</span></td>
                <td>${t.assigned_volunteer || 'Unassigned'}</td>
                <td>${t.due_date}</td>
                <td>
                    <button class="small-btn outline" onclick="openTaskDrawer(${t.id})">👁</button>
                    <button class="small-btn outline" onclick="deleteTask(${t.id})">🗑</button>
                </td>
            </tr>
        `;
    });
}

/**
 * Handle Create Task
 */
async function handleCreateTask(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks/create`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            alert("Task created successfully!");
            closeModal('taskModal');
            fetchTasks();
            fetchTaskStats();
        }
    } catch (err) { console.error(err); }
}

/**
 * Fetch Stats
 */
async function fetchTaskStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const s = data.data;
            document.getElementById('countOpen').textContent = s.tasks_by_status.Open;
            document.getElementById('countAssigned').textContent = s.tasks_by_status.Assigned;
            document.getElementById('countInProgress').textContent = s.tasks_by_status['In Progress'];
            document.getElementById('countReview').textContent = s.pending_reviews;
            document.getElementById('countCompleted').textContent = s.tasks_by_status.Completed;
        }
    } catch (err) { console.error(err); }
}

/**
 * Detail Drawer Logic
 */
async function openTaskDrawer(id) {
    const t = currentTasks.find(task => task.id === id);
    if (!t) return;

    const drawerTitle = document.getElementById('drawerTitleArea');
    drawerTitle.innerHTML = `
        <span class="prio-badge ${t.priority}">${t.priority}</span>
        <h2 style="margin:10px 0 5px">${t.title}</h2>
        <span style="font-size:12px; color:#888;">#${t.id} | Created by ${JSON.parse(localStorage.getItem('ngo')).ngo_name}</span>
    `;

    const body = document.getElementById('drawerBody');
    body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin:20px 0;">
            <div style="background:#f9f9f9; padding:15px; border-radius:10px; text-align:center;">
                <span style="font-size:11px; display:block; color:#888;">📍 Location</span>
                <span style="font-weight:600;">${t.location}</span>
            </div>
            <div style="background:#f9f9f9; padding:15px; border-radius:10px; text-align:center;">
                <span style="font-size:11px; display:block; color:#888;">📅 Due Date</span>
                <span style="font-weight:600;">${t.due_date}</span>
            </div>
        </div>
        <div style="margin-bottom:20px;">
            <h4 style="font-size:13px; color:#888; margin-bottom:8px;">Description</h4>
            <p style="font-size:14px; line-height:1.6;">${t.description}</p>
        </div>
        <div style="margin-bottom:20px;">
            <h4 style="font-size:13px; color:#888; margin-bottom:8px;">Status</h4>
            <span class="task-badge">${t.status}</span>
        </div>
    `;

    const footer = document.getElementById('drawerFooter');
    footer.innerHTML = `
        <button class="btn-outline" onclick="closeDrawer()">Close</button>
        <button class="btn-primary" onclick="alert('Edit logic coming soon...')">✏️ Edit</button>
    `;

    document.getElementById('taskDrawer').classList.add('open');
}

/**
 * UI Utils
 */
function toggleAdvancedSearch() {
    const el = document.getElementById('advancedSearch');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function switchView(mode) {
    document.getElementById('kanbanBoard').style.display = mode === 'kanban' ? 'flex' : 'none';
    document.getElementById('listView').style.display = mode === 'list' ? 'block' : 'none';
}

async function loadAvailableVolunteers() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/volunteers?availability=Available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const select = document.getElementById('quickAssignSelect');
        data.data.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.name} (⭐ MT: ${v.match_score})`;
            select.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

function openCreateTaskModal() { document.getElementById('taskModal').style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeDrawer() { document.getElementById('taskDrawer').classList.remove('open'); }
function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert("Task deleted!");
            fetchTasks();
            fetchTaskStats();
        }
    } catch (err) { console.error(err); }
}
