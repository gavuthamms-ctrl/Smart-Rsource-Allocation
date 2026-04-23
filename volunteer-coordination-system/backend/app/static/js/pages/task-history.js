/**
 * Smart Resource Allocation - Task History Logic
 */

let allTasks = [];
let filteredTasks = [];
let activeView = 'timeline';
let refreshInterval = null;
let liveClockInterval = null;
let currentAssignmentId = null;

// 1. Initialization
window.onload = async function() {
    checkAuth();
    loadUserInfo();
    setupEventListeners();
    
    // Initial data load
    await loadTaskHistory();
    renderActivityFeed();
    renderSkillBreakdown();
    renderAchievementBadges();
    
    // Start live elements
    startAutoRefresh();
    startLiveClock();
};

/**
 * Basic Auth Check
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'volunteer') {
        // Simple role check - NGO admins have their own dashboard
        // window.location.href = 'login.html'; 
    }
}

/**
 * Load User Info into UI
 */
function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    const volunteerStr = localStorage.getItem('volunteer');
    
    if (userStr && volunteerStr) {
        const user = JSON.parse(userStr);
        const volunteer = JSON.parse(volunteerStr);
        
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'V';
        
        // Sidebar
        document.getElementById('sidebarName').textContent = user.name;
        document.getElementById('sidebarAvatar').textContent = initial;
        document.getElementById('sidebarMatchBadge').textContent = `${volunteer.match_score || 0}% Match`;
        
        // Navbar
        document.getElementById('navName').textContent = user.name;
        document.getElementById('navAvatar').textContent = initial;
        
        // Page Header
        document.getElementById('pageSubtitle').textContent = `Complete record of all your volunteer work, ${user.name}`;
    }
}

/**
 * 2. Data Fetching
 */
async function loadTaskHistory() {
    const container = document.getElementById('timelineContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/volunteers/me/task-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.data.tasks.length > 0) {
            allTasks = data.data.tasks;
        } else {
            allTasks = getMockTaskHistory();
        }
    } catch (error) {
        console.warn("Backend unreachable, using mock data", error);
        allTasks = getMockTaskHistory();
    }
    
    filteredTasks = [...allTasks];
    applyFilters();
}

/**
 * Apply all active filters
 */
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const period = document.getElementById('dateFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    filteredTasks = allTasks.filter(task => {
        const matchesSearch = !search || 
            task.title.toLowerCase().includes(search) || 
            task.location.toLowerCase().includes(search) || 
            task.ngo_name.toLowerCase().includes(search);
            
        const matchesStatus = !status || task.status === status;
        const matchesPriority = !priority || task.priority === priority;
        
        // Date Period logic (simplified for mock/live)
        let matchesPeriod = true;
        if (period !== 'all' && task.accepted_at) {
            const date = new Date(task.accepted_at);
            const now = new Date();
            const diffDays = (now - date) / (1000 * 60 * 60 * 24);
            
            if (period === 'week') matchesPeriod = diffDays <= 7;
            else if (period === 'month') matchesPeriod = diffDays <= 30;
            else if (period === '3months') matchesPeriod = diffDays <= 90;
            else if (period === 'year') matchesPeriod = diffDays <= 365;
        }
        
        return matchesSearch && matchesStatus && matchesPriority && matchesPeriod;
    });
    
    // Sorting
    filteredTasks.sort((a, b) => {
        if (sort === 'newest') return new Date(b.accepted_at) - new Date(a.accepted_at);
        if (sort === 'oldest') return new Date(a.accepted_at) - new Date(b.accepted_at);
        if (sort === 'priority') {
            const weight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            return weight[b.priority] - weight[a.priority];
        }
        if (sort === 'completed') {
            if (!a.completed_at) return 1;
            if (!b.completed_at) return -1;
            return new Date(b.completed_at) - new Date(a.completed_at);
        }
        return 0;
    });
    
    renderCurrentView();
    updateImpactCards();
    renderCurrentTaskTracker();
}

/**
 * 3. Rendering Functions
 */
function renderCurrentView() {
    const timelineView = document.getElementById('timelineView');
    const tableView = document.getElementById('tableView');
    const statsView = document.getElementById('statsView');
    const emptyState = document.getElementById('emptyState');
    
    // Hide all
    timelineView.style.display = 'none';
    tableView.style.display = 'none';
    statsView.style.display = 'none';
    emptyState.style.display = 'none';
    
    document.getElementById('resultCount').textContent = `Showing ${filteredTasks.length} of ${allTasks.length} tasks`;
    
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    if (activeView === 'timeline') {
        timelineView.style.display = 'block';
        renderTimeline();
    } else if (activeView === 'table') {
        tableView.style.display = 'block';
        renderTable();
    } else {
        statsView.style.display = 'block';
        renderStats();
    }
}

function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    
    // Group tasks by month
    const groups = {};
    filteredTasks.forEach(task => {
        const date = new Date(task.accepted_at);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(task);
    });
    
    Object.keys(groups).forEach(month => {
        // Month Separator
        const sep = document.createElement('div');
        sep.className = 'timeline-month-separator';
        sep.textContent = month;
        container.appendChild(sep);
        
        groups[month].forEach((task, index) => {
            const side = index % 2 === 0 ? 'right' : 'left';
            const entry = document.createElement('div');
            entry.className = `timeline-entry ${side}`;
            
            const isPulsing = task.status === 'In Progress' ? 'pulsing' : '';
            
            entry.innerHTML = `
                <div class="timeline-dot ${isPulsing}"></div>
                <div class="timeline-card priority-${task.priority.toLowerCase()}">
                    <div class="card-header-meta">
                        <span class="badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="badge status-${task.status.toLowerCase().replace(' ', '-')}">${getStatusIcon(task.status)} ${task.status}</span>
                    </div>
                    <h4 onclick="openTaskDrawer(${task.assignment_id})">${task.title}</h4>
                    <div class="card-info">
                        📍 ${task.location} · 🏢 ${task.ngo_name}
                    </div>
                    <div class="skill-pills">
                        ${task.required_skills.split(',').map(s => `<span class="skill-pill">${s.trim()}</span>`).join('')}
                    </div>
                    
                    ${task.status === 'In Progress' ? `
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>Progress</span>
                                <span>60%</span>
                            </div>
                            <div class="p-bar">
                                <div class="p-fill" style="width: 60%"></div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="milestones-row">
                        <div class="milestone">
                            <span>✅</span>
                            <p>${formatDateShort(task.accepted_at)}</p>
                        </div>
                        <div class="milestone">
                            <span>⚡</span>
                            <p>${task.status === 'In Progress' || task.status === 'Completed' ? 'Started' : 'Pending'}</p>
                        </div>
                        <div class="milestone">
                            <span>🏁</span>
                            <p>${task.completed_at ? formatDateShort(task.completed_at) : 'Due ' + formatDateShort(task.due_date)}</p>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        ${getActionButtons(task)}
                    </div>
                </div>
            `;
            container.appendChild(entry);
        });
    });
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    filteredTasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight:600; cursor:pointer;" onclick="openTaskDrawer(${task.assignment_id})">
                ${task.title}
                <div style="font-size:10px; color:#999; font-weight:400;">${task.required_skills}</div>
            </td>
            <td>${task.ngo_name}</td>
            <td>📍 ${task.location}</td>
            <td><span class="badge priority-${task.priority.toLowerCase()}">${task.priority}</span></td>
            <td><span class="badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></td>
            <td>${formatDateShort(task.accepted_at)}</td>
            <td>${task.completed_at ? formatDateShort(task.completed_at) : '<span style="color:#999">-</span>'}</td>
            <td>👥 ${task.people_helped || 0}</td>
            <td class="card-actions">
                <button class="btn btn-outline" style="padding:4px 8px;" onclick="openTaskDrawer(${task.assignment_id})">👁️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderStats() {
    const container = document.getElementById('statsViewContent');
    
    // Calculate Stats
    const completed = allTasks.filter(t => t.status === 'Completed').length;
    const rate = Math.round((completed / allTasks.length) * 100);
    
    container.innerHTML = `
        <div class="stats-card">
            <h5 style="text-align:center; margin-bottom:20px;">Completion Rate</h5>
            <div class="donut-chart-container">
                <div class="donut-chart" style="background: conic-gradient(var(--accent-green) 0% ${rate}%, var(--gray-light) ${rate}% 100%)"></div>
                <div class="donut-label">${rate}%</div>
            </div>
            <p class="chart-subtitle">Tasks completed vs. assigned</p>
        </div>
        
        <div class="stats-card">
            <h5 style="text-align:center; margin-bottom:20px;">Avg Response Time</h5>
            <div style="font-size:36px; font-weight:700; text-align:center; color:var(--primary); margin-top:20px;">4.2 hrs</div>
            <p class="chart-subtitle" style="margin-top:20px;">Time to accept after posting</p>
        </div>
        
        <div class="stats-card">
            <h5 style="text-align:center; margin-bottom:20px;">Top Skill Used</h5>
            <div style="font-size:24px; font-weight:700; text-align:center; color:var(--accent-purple); margin-top:20px;">Doctor</div>
            <p class="chart-subtitle" style="margin-top:20px;">Used in 10 tasks</p>
        </div>
        
        <div class="bar-charts-row">
            <div class="stats-card" style="grid-column: span 1;">
                <h5>Tasks by Priority</h5>
                <div style="margin-top:20px;">
                    ${renderBar('Critical', allTasks.filter(t => t.priority === 'Critical').length, allTasks.length, 'var(--accent-red)')}
                    ${renderBar('High', allTasks.filter(t => t.priority === 'High').length, allTasks.length, 'var(--accent-orange)')}
                    ${renderBar('Medium', allTasks.filter(t => t.priority === 'Medium').length, allTasks.length, 'var(--primary)')}
                    ${renderBar('Low', allTasks.filter(t => t.priority === 'Low').length, allTasks.length, 'var(--gray-mid)')}
                </div>
            </div>
            <div class="stats-card" style="grid-column: span 1;">
                <h5>Tasks by Status</h5>
                <div style="display:flex; justify-content:space-between; margin-top:30px;">
                    <div style="text-align:center;"><div style="color:var(--accent-orange); font-size:20px; font-weight:700;">${allTasks.filter(t => t.status === 'In Progress').length}</div><div style="font-size:10px;">Progress</div></div>
                    <div style="text-align:center;"><div style="color:var(--primary); font-size:20px; font-weight:700;">${allTasks.filter(t => t.status === 'To Do').length}</div><div style="font-size:10px;">To Do</div></div>
                    <div style="text-align:center;"><div style="color:var(--accent-purple); font-size:20px; font-weight:700;">${allTasks.filter(t => t.status === 'Pending Review').length}</div><div style="font-size:10px;">Pending</div></div>
                    <div style="text-align:center;"><div style="color:var(--accent-green); font-size:20px; font-weight:700;">${allTasks.filter(t => t.status === 'Completed').length}</div><div style="font-size:10px;">Done</div></div>
                </div>
            </div>
        </div>
    `;
}

function renderBar(label, count, total, color) {
    const p = Math.round((count / total) * 100);
    return `
        <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>${label}</span>
                <span>${count} tasks</span>
            </div>
            <div style="height:8px; background:#eee; border-radius:4px;">
                <div style="height:100%; width:${p}%; background:${color}; border-radius:4px;"></div>
            </div>
        </div>
    `;
}

/**
 * 4. UI Interactions
 */
function switchView(view) {
    activeView = view;
    // Update buttons
    document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${view}Btn`).classList.add('active');
    renderCurrentView();
}

function updateImpactCards() {
    const volStr = localStorage.getItem('volunteer');
    if (!volStr) return;
    const vol = JSON.parse(volStr);
    
    // Animate numbers
    animateCount('statAccepted', vol.tasks_assigned || 0);
    animateCount('statCompleted', vol.tasks_completed || 0);
    
    const inProgressCount = allTasks.filter(t => t.status === 'In Progress' || t.status === 'To Do').length;
    animateCount('statInProgress', inProgressCount);
    
    animateCount('statPeople', vol.people_helped || 0);
    animateCount('statHours', vol.hours_volunteered || 0);
    
    // Status text
    document.getElementById('inProgressStatus').textContent = inProgressCount > 0 ? '🔴 Needs attention' : '✅ All clear';
    
    // Completion rate
    const rate = vol.tasks_assigned ? Math.round((vol.tasks_completed / vol.tasks_assigned) * 100) : 0;
    document.getElementById('completionRateLabel').textContent = `${rate}% completion rate`;
}

async function updateTaskStatus(assignmentId, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/tasks/assignments/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ assignment_id: assignmentId, status: newStatus })
        });
        
        const data = await res.json();
        if (data.success) {
            showToast(`Task marked as ${newStatus}`, 'success');
            await loadTaskHistory();
        }
    } catch (error) {
        // Optimistic Mock Update
        const task = allTasks.find(t => t.assignment_id === assignmentId);
        if (task) {
            task.status = newStatus;
            applyFilters();
            showToast(`(Mock) Task marked as ${newStatus}`, 'success');
        }
    }
}

/**
 * 5. Drawer & Modals
 */
function openTaskDrawer(assignmentId) {
    const task = allTasks.find(t => t.assignment_id === assignmentId);
    if (!task) return;
    
    const header = document.getElementById('drawerHeaderContent');
    header.innerHTML = `
        <div style="margin-bottom:12px;">
            <span class="badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
            <span class="badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
        </div>
        <h2 style="font-size:20px; font-weight:700;">${task.title}</h2>
        <p style="font-size:14px; color:#666; margin-top:4px;">📍 ${task.location} · 🏢 ${task.ngo_name}</p>
    `;
    
    const body = document.getElementById('drawerBody');
    body.innerHTML = `
        <div class="drawer-section">
            <h5>Task Overview</h5>
            <div style="display:flex; gap:20px;">
                <div style="flex:1; background:#f8f9ff; padding:12px; border-radius:8px; text-align:center;">
                    <div style="font-size:10px; color:#999;">DUE DATE</div>
                    <div style="font-weight:600; font-size:13px;">${formatDateShort(task.due_date)}</div>
                </div>
                <div style="flex:1; background:#f8f9ff; padding:12px; border-radius:8px; text-align:center;">
                    <div style="font-size:10px; color:#999;">PEOPLE HELPED</div>
                    <div style="font-weight:600; font-size:13px;">${task.people_helped || 0}</div>
                </div>
                <div style="flex:1; background:#f8f9ff; padding:12px; border-radius:8px; text-align:center;">
                    <div style="font-size:10px; color:#999;">MATCH</div>
                    <div style="font-weight:600; font-size:13px; color:var(--accent-green);">${task.match_percentage || 0}%</div>
                </div>
            </div>
        </div>
        
        <div class="drawer-section">
            <h5>Description</h5>
            <p style="font-size:14px; line-height:1.6; color:#444;">${task.description || 'No description provided.'}</p>
        </div>
        
        <div class="drawer-section">
            <h5>Timeline</h5>
            <div style="border-left:2px solid #eee; padding-left:20px; position:relative;">
                <div style="margin-bottom:15px; position:relative;">
                    <div style="width:10px; height:10px; border-radius:50%; background:var(--accent-green); position:absolute; left:-26px; top:4px;"></div>
                    <div style="font-size:12px; font-weight:600;">Task Accepted</div>
                    <div style="font-size:11px; color:#999;">${formatDateShort(task.accepted_at)}</div>
                </div>
                ${task.completed_at ? `
                    <div style="position:relative;">
                        <div style="width:10px; height:10px; border-radius:50%; background:var(--accent-green); position:absolute; left:-26px; top:4px;"></div>
                        <div style="font-size:12px; font-weight:600;">Work Completed</div>
                        <div style="font-size:11px; color:#999;">${formatDateShort(task.completed_at)}</div>
                    </div>
                ` : `
                    <div style="position:relative;">
                        <div style="width:10px; height:10px; border-radius:50%; background:#ddd; position:absolute; left:-26px; top:4px;"></div>
                        <div style="font-size:12px; font-weight:600;">Outcome Submission</div>
                        <div style="font-size:11px; color:#999;">Pending</div>
                    </div>
                `}
            </div>
        </div>
        
        ${task.field_notes ? `
            <div class="drawer-section">
                <h5>Field Notes</h5>
                <div style="background:#fff9f0; border:1px solid #ffe0b2; padding:12px; border-radius:8px; font-size:13px; font-style:italic;">
                    "${task.field_notes}"
                </div>
            </div>
        ` : ''}
    `;
    
    const footer = document.getElementById('drawerFooter');
    footer.innerHTML = getDrawerButtons(task);
    
    document.getElementById('taskDrawer').classList.add('active');
    document.getElementById('drawerOverlay').classList.add('active');
}

function closeTaskDrawer() {
    document.getElementById('taskDrawer').classList.remove('active');
    document.getElementById('drawerOverlay').classList.remove('active');
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

/**
 * 6. Specific Actions
 */
function openReportModal(assignmentId) {
    currentAssignmentId = assignmentId;
    const task = allTasks.find(t => t.assignment_id === assignmentId);
    
    document.getElementById('reportTaskInfo').innerHTML = `
        <div style="font-weight:700; color:var(--primary);">${task.title}</div>
        <div style="font-size:12px; color:#666;">${task.ngo_name} · ${task.location}</div>
    `;
    
    openModal('fieldReportModal');
}

async function submitFieldReport() {
    const notes = document.getElementById('reportNotes').value;
    const people = document.getElementById('reportPeople').value;
    const hours = document.getElementById('reportHours').value;
    
    if (!notes || !people || !hours) {
        showToast("Please fill all required fields", "error");
        return;
    }
    
    const btn = document.getElementById('submitReportBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/tasks/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                assignment_id: currentAssignmentId,
                field_notes: notes,
                people_helped: parseInt(people),
                hours_spent: parseFloat(hours),
                outcome: document.querySelector('input[name="outcome"]:checked').value
            })
        });
        
        const data = await res.json();
        if (data.success) {
            showToast("Report submitted successfully!", "success");
            closeModal('fieldReportModal');
            await loadTaskHistory();
        }
    } catch (error) {
        showToast("(Mock) Report saved successfully", "success");
        closeModal('fieldReportModal');
        // Update local mock
        const task = allTasks.find(t => t.assignment_id === currentAssignmentId);
        if (task) {
            task.status = 'Pending Review';
            task.field_notes = notes;
            task.people_helped = parseInt(people);
            applyFilters();
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Report & Mark Complete';
    }
}

function openCertificate(assignmentId) {
    const task = allTasks.find(t => t.assignment_id === assignmentId);
    const user = JSON.parse(localStorage.getItem('user'));
    
    document.getElementById('certName').textContent = user.name;
    document.getElementById('certTask').textContent = task.title;
    document.getElementById('certNGO').textContent = task.ngo_name;
    document.getElementById('certNGOFooter').textContent = task.ngo_name;
    document.getElementById('certDate').textContent = formatDateShort(task.completed_at || new Date());
    document.getElementById('certImpact').textContent = `${task.people_helped || 0} People Helped`;
    
    openModal('certificateModal');
}

/**
 * 7. Real-time Elements
 */
function startLiveClock() {
    liveClockInterval = setInterval(() => {
        const now = new Date();
        document.getElementById('liveClock').textContent = now.toLocaleTimeString();
    }, 1000);
}

function startAutoRefresh() {
    refreshInterval = setInterval(async () => {
        if (document.getElementById('autoRefreshToggle').checked) {
            await loadTaskHistory();
            document.getElementById('lastSynced').textContent = "Last synced: just now";
            setTimeout(() => {
                document.getElementById('lastSynced').textContent = "Last synced: few seconds ago";
            }, 5000);
        }
    }, 30000);
}

function toggleAutoRefresh() {
    // If we wanted to clear/reset specifically
}

/**
 * 8. Helper UI Elements
 */
function renderActivityFeed() {
    const feed = document.getElementById('activityFeed');
    const logs = [
        { type: 'task_completed', msg: 'You completed Medical Camp - Palladam', time: '2 hours ago' },
        { type: 'match_found', msg: 'New High priority match found near you', time: '5 hours ago' },
        { type: 'task_accepted', msg: 'You accepted Patient Transport Driver Needed', time: '1 day ago' },
        { type: 'deadline', msg: 'Upcoming deadline for Medical Camp', time: '2 days ago' }
    ];
    
    feed.innerHTML = logs.map(log => `
        <div class="activity-item">
            <div class="activity-dot" style="background:${getActivityColor(log.type)}"></div>
            <div class="activity-content">
                <div class="activity-msg">${log.msg}</div>
                <div class="activity-time">${log.time}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('activityLastUpdated').textContent = "Updated just now";
}

function renderSkillBreakdown() {
    const container = document.getElementById('skillBreakdownContent');
    const vol = JSON.parse(localStorage.getItem('volunteer'));
    const skills = vol.skills.split(',').map(s => s.trim());
    
    container.innerHTML = skills.map(skill => {
        const count = allTasks.filter(t => t.required_skills.includes(skill)).length;
        const width = Math.min((count / 10) * 100, 100);
        return `
            <div class="skill-bar-row">
                <div class="skill-bar-head">
                    <span>${skill}</span>
                    <span>${count} tasks</span>
                </div>
                <div class="sb-track">
                    <div class="sb-fill" style="width: ${width}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAchievementBadges() {
    const container = document.getElementById('achievementBadges');
    const vol = JSON.parse(localStorage.getItem('volunteer'));
    const completed = vol.tasks_completed || 0;
    
    const badges = [
        { name: 'First Task', icon: '🥇', earned: completed >= 1 },
        { name: 'Rising Star', icon: '⭐', earned: completed >= 5 },
        { name: 'Community Hero', icon: '🏆', earned: completed >= 10 },
        { name: 'Impact Pro', icon: '👥', earned: vol.people_helped >= 50 },
        { name: 'Dedicated', icon: '⏱️', earned: vol.hours_volunteered >= 20 },
        { name: 'Perfect Match', icon: '🎯', earned: vol.match_score >= 85 }
    ];
    
    container.innerHTML = badges.map(b => `
        <div class="badge-item ${b.earned ? 'earned' : 'locked'}">
            <div class="badge-icon">${b.earned ? b.icon : '🔒'}</div>
            <p>${b.name}</p>
        </div>
    `).join('');
}

function renderCurrentTaskTracker() {
    const tracker = document.getElementById('taskTrackerContent');
    const active = allTasks.find(t => t.status === 'In Progress');
    
    if (active) {
        document.getElementById('trackingLabel').textContent = `⚡ Currently Active: ${active.title}`;
        document.getElementById('trackingSub').textContent = `📍 ${active.location} · Started 2 hours ago`;
        
        tracker.innerHTML = `
            <div style="font-weight:600; font-size:14px; margin-bottom:10px;">${active.title}</div>
            <div class="progress-steps">
                <div class="step completed"><div class="step-circle">✓</div><span class="step-label">Accepted</span></div>
                <div class="step current"><div class="step-circle">⚡</div><span class="step-label">Working</span></div>
                <div class="step"><div class="step-circle">🏁</div><span class="step-label">Done</span></div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="openReportModal(${active.assignment_id})">📝 Submit Report</button>
        `;
    } else {
        document.getElementById('trackingLabel').textContent = "✅ No active tasks right now";
        document.getElementById('trackingSub').textContent = "Accept a matched task to get started";
        tracker.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">No active task right now</div>`;
    }
}

/**
 * 9. Export & Helpers
 */
function exportTaskHistory() {
    let csv = "ID,Title,Location,NGO,Priority,Status,Accepted Date,Completed Date,People Helped\n";
    filteredTasks.forEach(t => {
        csv += `${t.assignment_id},"${t.title}","${t.location}","${t.ngo_name}","${t.priority}","${t.status}",${t.accepted_at},${t.completed_at || ''},${t.people_helped || 0}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `task-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("History exported as CSV", "success");
}

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const increment = Math.ceil(target / 20);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = current;
        }
    }, 30);
}

function formatDateShort(dateString) {
    if (!dateString) return 'Pending';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusIcon(status) {
    if (status === 'In Progress') return '⚡';
    if (status === 'Completed') return '✅';
    if (status === 'Pending Review') return '⏳';
    if (status === 'Cancelled') return '❌';
    return '📌';
}

function getActivityColor(type) {
    if (type === 'task_completed') return 'var(--accent-green)';
    if (type === 'match_found') return 'var(--accent-purple)';
    if (type === 'deadline') return 'var(--accent-red)';
    return 'var(--primary)';
}

function getActionButtons(task) {
    if (task.status === 'In Progress') {
        return `<button class="btn btn-primary" onclick="openReportModal(${task.assignment_id})">📝 Report</button>`;
    }
    if (task.status === 'To Do') {
        return `<button class="btn btn-orange" onclick="updateTaskStatus(${task.assignment_id}, 'In Progress')">⚡ Start</button>`;
    }
    if (task.status === 'Completed') {
        return `<button class="btn btn-outline" onclick="openCertificate(${task.assignment_id})">🏆 Cert</button>`;
    }
    return '';
}

function getDrawerButtons(task) {
    if (task.status === 'In Progress') {
        return `<button class="btn btn-primary" style="flex:1" onclick="openReportModal(${task.assignment_id})">📝 Submit Field Report</button>
                <button class="btn btn-green" style="flex:1" onclick="updateTaskStatus(${task.assignment_id}, 'Completed')">✅ Done</button>`;
    }
    if (task.status === 'Completed') {
        return `<button class="btn btn-orange" style="flex:1" onclick="openCertificate(${task.assignment_id})">🏆 View Certificate</button>`;
    }
    return `<button class="btn btn-outline" style="flex:1" onclick="closeTaskDrawer()">Close</button>`;
}

function getMockTaskHistory() {
    return [
        {
            assignment_id: 101, title: "Medical Camp Volunteer - Palladam", location: "Palladam", ngo_name: "Gavutham Foundation",
            priority: "Critical", status: "In Progress", required_skills: "Doctor, First Aid", accepted_at: "2026-04-10T10:00:00",
            due_date: "2026-04-15", match_percentage: 95, description: "Assisting doctors at the free health camp."
        },
        {
            assignment_id: 102, title: "Home Visit Doctor - Palladam North", location: "Palladam", ngo_name: "Gavutham Foundation",
            priority: "High", status: "Completed", required_skills: "Doctor", accepted_at: "2026-04-01T09:00:00",
            completed_at: "2026-04-05T14:30:00", people_helped: 3, hours_spent: 4, match_percentage: 88,
            field_notes: "Visited 3 bedridden patients and provided medications."
        },
        {
            assignment_id: 103, title: "Emergency Medical Response", location: "Highway 47", ngo_name: "Swift Relief",
            priority: "Critical", status: "Completed", required_skills: "First Aid", accepted_at: "2026-03-20T07:15:00",
            completed_at: "2026-03-20T10:30:00", people_helped: 4, hours_spent: 3, match_percentage: 92,
            field_notes: "Provided triage for accident victims until ambulance arrived."
        }
    ];
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('sortFilter').addEventListener('change', applyFilters);
}
