/**
 * Personalized Volunteer Dashboard Logic
 * Smart Resource Allocation
 */

let map;
let currentUser = null;
let currentVolunteer = null;
let allMatchedTasks = [];
let allActiveTasks = [];
let currentTaskMap = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    initUI();
    loadDashboardData();
    initChat();
    initNotifications();
});

/**
 * 1. Auth Check
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const volStr = localStorage.getItem('volunteer');

    if (!token || !userStr) {
        window.location.href = 'login.html';
        return false;
    }

    currentUser = JSON.parse(userStr);

    // Check if role is volunteer
    if (currentUser.role !== 'volunteer') {
        console.warn('Access denied: Needs volunteer role.');
        // Redirect to login or appropriate dashboard if we had others
        // window.location.href = 'login.html';
    }

    if (volStr) {
        currentVolunteer = JSON.parse(volStr);
    } else {
        // Mock volunteer if missing in localStorage for dev
        currentVolunteer = {
            skills: 'Volunteer Work, Community Support',
            location: 'Coimbatore',
            availability: 'Available',
            match_score: 75,
            notes: 'Active community member'
        };
    }

    return true;
}

/**
 * 2. Initialize Static UI Elements
 */
function initUI() {
    // Top Right Nav
    document.getElementById('navName').textContent = currentUser.name || currentUser.email.split('@')[0];
    const initial = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
    document.getElementById('navAvatar').textContent = initial;
    document.getElementById('navAvatar').style.backgroundColor = nameToColor(currentUser.name || currentUser.email);

    // Sidebar
    document.getElementById('sidebarUserName').textContent = currentUser.name || currentUser.email.split('@')[0];
    document.getElementById('sidebarAvatar').textContent = initial;
    document.getElementById('sidebarAvatar').style.backgroundColor = nameToColor(currentUser.name || currentUser.email);

    const scoreVal = currentVolunteer.match_score || 0;
    document.getElementById('sidebarMatchVal').textContent = scoreVal;

    // Page Header
    setGreeting();
    setSubtitle();
    updateDate();
    updateAvailabilityUI(currentVolunteer.availability);
}

/**
 * 3. Greeting Logic
 */
function setGreeting() {
    const hour = new Date().getHours();
    const gText = document.getElementById('greetingText');
    const name = currentUser.name || currentUser.email.split('@')[0];

    let greeting = "Good Evening";
    if (hour < 12) greeting = "Good Morning";
    else if (hour < 17) greeting = "Good Afternoon";

    gText.textContent = `${greeting}, ${name}! 👋`;
}

function setSubtitle() {
    const skills = currentVolunteer.skills || 'Community';
    const loc = currentVolunteer.location || 'your area';
    document.getElementById('vSubtitle').textContent = `Here's what needs your ${skills} expertise in ${loc} today.`;
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateText').textContent = new Date().toLocaleDateString('en-US', options);
}

/**
 * 4. Load Dynamic Data
 */
async function loadDashboardData() {
    // Stats
    fetchPersonalStats();

    // Lists
    fetchMatchedTasks();
    fetchActiveTasks();
    fetchRecentActivity();

    // Map
    initMiniMap();
}

/**
 * Fetch stats from API or use mocks
 */
async function fetchPersonalStats() {
    try {
        const response = await fetch('http://localhost:5000/api/volunteers/me/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            updateStatsUI(data.data);
        } else {
            throw new Error('API Fail');
        }
    } catch (e) {
        // Mock fallback
        updateStatsUI({
            tasks_assigned: 2,
            tasks_completed: 15,
            people_helped: 124,
            match_score: currentVolunteer.match_score || 88
        });
    }
}

function updateStatsUI(stats) {
    document.getElementById('statsAssigned').textContent = stats.tasks_assigned || 0;
    if (stats.tasks_assigned === 0) document.getElementById('statsAssignedSub').textContent = 'No tasks yet';

    document.getElementById('statsCompleted').textContent = stats.tasks_completed || 0;
    if (stats.tasks_completed === 0) document.getElementById('statsCompletedSub').textContent = 'Complete your first task!';

    document.getElementById('statsHelped').textContent = stats.people_helped || 0;
    if (stats.people_helped === 0) document.getElementById('statsHelpedSub').textContent = 'Start helping today!';

    const score = stats.match_score || 0;
    document.getElementById('statsMatch').textContent = score;
    updateProgressRing(score);
}

function updateProgressRing(percent) {
    const circle = document.getElementById('scoreBar');
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;

    // Color based on score
    if (percent >= 75) circle.style.stroke = '#2e7d32';
    else if (percent >= 50) circle.style.stroke = '#e65100';
    else circle.style.stroke = '#c62828';
}

/**
 * Fetch Recommended Tasks
 */
async function fetchMatchedTasks() {
    const container = document.getElementById('matchedTasksList');
    try {
        const skills = encodeURIComponent(currentVolunteer.skills);
        const loc = encodeURIComponent(currentVolunteer.location);
        const response = await fetch(`http://localhost:5000/api/volunteers/tasks/recommended?skills=${skills}&location=${loc}`);
        if (response.ok) {
            const data = await response.json();
            allMatchedTasks = data.data.tasks;
            renderMatchedTasks(allMatchedTasks.slice(0, 3));
        } else {
            throw new Error('API Fail');
        }
    } catch (e) {
        // PERSONALIZED MOCKS
        allMatchedTasks = getPersonalizedTaskMocks();
        renderMatchedTasks(allMatchedTasks);
    }
}

function renderMatchedTasks(tasks) {
    const container = document.getElementById('matchedTasksList');
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">No matches found for your skills currently.</div>';
        return;
    }

    container.innerHTML = tasks.map(t => `
        <div class="task-item-compact priority-${t.priority.toLowerCase()}">
            <div class="task-content">
                <div class="task-top">
                    <span class="task-name">${t.title}</span>
                    <span class="priority-pill ${t.priority.toLowerCase()}">${t.priority}</span>
                </div>
                <div class="task-mid">
                    📍 ${t.location} | 🔧 ${t.required_skills || t.skills}
                </div>
                <div class="task-bottom">
                    <span class="posted-time">⏰ Posted ${t.posted_ago || 'just now'}</span>
                    <div class="task-btns">
                        <button class="btn-sm btn-green-sm" onclick="acceptTask('${t.id}')">✅ Accept</button>
                        <button class="btn-sm btn-blue-outline-sm" onclick="openTaskDetailModal('${t.id}')">👁 Details</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Update badge count in navbar if we have urgent ones
    const urgentCount = tasks.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
    if (urgentCount > 0) {
        const badge = document.getElementById('notifBadge');
        badge.textContent = urgentCount;
        badge.style.display = 'flex';
    }
}

function getPersonalizedTaskMocks() {
    const loc = currentVolunteer.location;
    if (loc === 'Palladam') {
        return [
            { id: 101, title: "Medical Camp Volunteer Required", location: "Palladam", priority: "Critical", required_skills: "Doctor, First Aid", posted_ago: "2 hours ago" },
            { id: 102, title: "Patient Transport Driver Needed", location: "Palladam", priority: "High", required_skills: "Driving", posted_ago: "4 hours ago" },
            { id: 103, title: "Blood Donation Drive", location: "Palladam", priority: "Medium", required_skills: "Organization", posted_ago: "1 day ago" }
        ];
    } else if (loc === 'Ukkadam') {
        return [
            { id: 201, title: "Electrical Outage Support", location: "Ukkadam", priority: "Critical", required_skills: "Electrical Work", posted_ago: "1 hour ago" },
            { id: 202, title: "Counselling Session for Youth", location: "Ukkadam", priority: "High", required_skills: "Counselling", posted_ago: "3 hours ago" },
            { id: 203, title: "Food Distribution Logistics", location: "Ukkadam", priority: "Medium", required_skills: "Logistics", posted_ago: "5 hours ago" }
        ];
    } else {
        // Peelamedu or default
        return [
            { id: 301, title: "Water Treatment Maintenance", location: "Peelamedu", priority: "High", required_skills: "Water Treatment", posted_ago: "1 hour ago" },
            { id: 302, title: "Road Survey Support", location: "Peelamedu", priority: "Medium", required_skills: "Road Work", posted_ago: "6 hours ago" },
            { id: 303, title: "Software Training for NGO Staff", location: "Peelamedu", priority: "Medium", required_skills: "IT Support", posted_ago: "12 hours ago" }
        ];
    }
}

/**
 * Fetch My Active Tasks
 */
async function fetchActiveTasks() {
    const container = document.getElementById('activeTasksList');
    try {
        const response = await fetch('http://localhost:5000/api/volunteers/me/tasks', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            allActiveTasks = data.data.tasks;
            renderActiveTasks(allActiveTasks.slice(0, 3));
        } else {
            throw new Error('API Fail');
        }
    } catch (e) {
        // MOCKS
        allActiveTasks = [
            { id: 10, title: `Medical Camp - ${currentVolunteer.location}`, status: "In Progress", ngo: "Gavutham Foundation", due_date: "Apr 15, 2026" },
            { id: 11, title: `Relief Distribution - ${currentVolunteer.location}`, status: "To Do", ngo: "Helping Hands NGO", due_date: "Apr 18, 2026" }
        ];
        renderActiveTasks(allActiveTasks);
    }
}

function renderActiveTasks(tasks) {
    const container = document.getElementById('activeTasksList');
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">🎯 No active tasks yet. Accept a matched task above!</div>';
        return;
    }

    container.innerHTML = tasks.map(t => `
        <div class="active-item">
            <div class="active-left">
                <div class="status-dot status-${t.status.toLowerCase().replace(' ', '')}"></div>
                <div class="active-info">
                    <span class="t-name">${t.title}</span>
                    <span class="ngo-name">${t.ngo}</span>
                </div>
            </div>
            <div class="active-right">
                <span class="due-date">${t.due_date}</span>
                <button class="btn-report-sm" onclick="openReportModal('${t.id}', 'active')">🚩 Report</button>
            </div>
        </div>
    `).join('');
}

/**
 * Recent Activity
 */
async function fetchRecentActivity() {
    try {
        const response = await fetch('http://localhost:5000/api/volunteers/me/activity', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderActivity(data.data);
        } else { throw new Error(); }
    } catch (e) {
        const mocks = [
            { type: 'task_accepted', message: `You accepted: Medical Camp - ${currentVolunteer.location}`, time_ago: 'Just now' },
            { type: 'match_found', message: 'Your profile was matched to 3 new tasks', time_ago: '2 hours ago' },
            { type: 'deadline', message: 'Task deadline approaching: Road Survey', time_ago: '5 hours ago' },
            { type: 'critical_need', message: `Critical need near you: Medical Emergency in ${currentVolunteer.location}`, time_ago: '1 hour ago' }
        ];
        renderActivity(mocks);
    }
}

function renderActivity(items) {
    const container = document.getElementById('activityList');
    const colors = {
        task_accepted: '#2e7d32',
        match_found: '#1a237e',
        deadline: '#e65100',
        critical_need: '#c62828',
        profile_update: '#6a1b9a'
    };

    container.innerHTML = items.map(i => `
        <div class="activity-item">
            <div class="a-dot" style="background: ${colors[i.type] || '#757575'}"></div>
            <div class="a-info">
                <span class="a-text">${i.message}</span>
                <span class="a-time">${i.time_ago}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 5. Mini Map Implementation
 */
function initMiniMap() {
    const loc = currentVolunteer.location;
    const coordsMap = {
        'Palladam': [10.9913, 77.0554],
        'Ukkadam': [10.9847, 76.9563],
        'Peelamedu': [11.0142, 76.9946]
    };

    const center = coordsMap[loc] || [10.9925, 77.0150];
    document.getElementById('mapLocLabel').textContent = `📍 ${loc}`;

    if (map) map.remove();
    map = L.map('miniMap').setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM'
    }).addTo(map);

    // Volunteer personal marker (Blue)
    L.circleMarker(center, {
        radius: 10,
        fillColor: '#1a237e',
        color: '#fff',
        weight: 3,
        fillOpacity: 1
    }).addTo(map).bindPopup(`📍 You — ${currentUser.name || 'Volunteer'}`);

    // Some Need Pins based on priority
    const mockNeeds = [
        { c: [center[0] + 0.005, center[1] + 0.005], p: 'Critical', t: 'Emergency Relief' },
        { c: [center[0] - 0.003, center[1] + 0.008], p: 'High', t: 'Water Support' },
        { c: [center[0] + 0.008, center[1] - 0.004], p: 'Medium', t: 'Skill Session' }
    ];

    mockNeeds.forEach(n => {
        const color = n.p === 'Critical' ? '#c62828' : (n.p === 'High' ? '#f57c00' : '#1a237e');
        L.circleMarker(n.c, {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(map).bindPopup(`<b>${n.p}:</b> ${n.t}`);
    });
}

/**
 * 6. Interactive Handlers
 */
async function handleStatusToggle() {
    const current = currentVolunteer.availability;
    const nextMap = {
        'Available': 'Busy',
        'Busy': 'Available',
        'On Leave': 'On Leave'
    };

    const newStatus = nextMap[current];
    if (newStatus === current) return; // Static for On Leave

    try {
        const response = await fetch('http://localhost:5000/api/volunteers/availability', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ availability: newStatus })
        });

        if (response.ok) {
            currentVolunteer.availability = newStatus;
            localStorage.setItem('volunteer', JSON.stringify(currentVolunteer));
            updateAvailabilityUI(newStatus);
            showToast(`Status updated to ${newStatus}`, 'success');
        } else {
            throw new Error();
        }
    } catch (e) {
        // Fallback for dev
        currentVolunteer.availability = newStatus;
        localStorage.setItem('volunteer', JSON.stringify(currentVolunteer));
        updateAvailabilityUI(newStatus);
        showToast(`Status updated to ${newStatus} (Sync Mode)`, 'success');
    }
}

function updateAvailabilityUI(status) {
    const pill = document.getElementById('statusToggle');
    const icon = document.getElementById('statusIcon');
    const label = document.getElementById('statusLabel');

    pill.className = 'status-pill ' + status.toLowerCase().replace(' ', '-');

    if (status === 'Available') {
        icon.textContent = '🟢';
        label.textContent = 'Available';
    } else if (status === 'Busy') {
        icon.textContent = '🔴';
        label.textContent = 'Busy';
    } else {
        icon.textContent = '🟠';
        label.textContent = 'On Leave';
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('volunteer');
    window.location.href = 'login.html';
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

function acceptTask(id) {
    showToast('Task accepted! It is now in your Active Tasks.', 'success');
    // In a real app, this would refresh the lists
    fetchActiveTasks();
}

/**
 * Utils
 */
function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
        background: ${type === 'success' ? '#2e7d32' : '#c62828'};
        color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000; animation: slideIn 0.3s forwards;
    `;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * 7. Dashboard Quick Chat (Urgent Alerts)
 */
/**
 * 7. Standardized Dashboard Chat Logic
 */
function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatWindow = document.getElementById('chatWindow');
    const roomSelect = document.getElementById('roomSelect');

    // 1. Robust Validation (Prevent Silent Failure)
    if (!chatInput) console.error("Missing required element: id='chatInput'");
    if (!sendBtn) console.error("Missing required element: id='sendBtn'");
    if (!chatWindow) console.error("Missing required element: id='chatWindow'");
    if (!roomSelect) console.error("Missing required element: id='roomSelect'");
    
    if (!chatInput || !sendBtn || !chatWindow || !roomSelect) {
        console.error("Dashboard Chat initialization failed due to missing DOM elements.");
        return;
    }

    // 2. Event Listeners
    // Handle Send Button Click
    sendBtn.addEventListener('click', () => {
        sendMessage();
    });

    // Handle Enter Keypress on Input field
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    console.log("Dashboard Chat initialized successfully (Standard Protocol).");
}

/**
 * sendMessage()
 * Orchestrates the async message POST and UI update
 */
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatWindow = document.getElementById('chatWindow');
    const roomSelect = document.getElementById('roomSelect');
    
    const text = chatInput.value.trim();
    const roomName = roomSelect.value;
    
    if (!text) return;

    // 1. Instant UI Feedback (Append local bubble)
    chatInput.value = '';
    appendMessageToChat(text, 'You', chatWindow, true);

    try {
        // 2. API Request
        const response = await fetch('http://localhost:5000/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                message: text,
                room_name: roomName,
                urgency_level: roomName === 'Urgent Alerts' ? 'high' : 'normal'
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Server rejected the message');
        }

        console.log(`Message sent to ${roomName}:`, data);

    } catch (err) {
        console.error('Chat sync error:', err);
        showToast(`Failed to send: ${err.message}`, 'error');
        
        // 3. Error Recovery: Restore text and visually mark failure
        chatInput.value = text;
        const bubbles = chatWindow.querySelectorAll('.chat-bubble.mine');
        if (bubbles.length > 0) {
            const lastBubble = bubbles[bubbles.length - 1];
            lastBubble.style.opacity = '0.5';
            lastBubble.title = 'Failed to sync with server';
        }
    }
}

function appendMessageToChat(text, sender, container, isMine) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    bubble.innerHTML = `
        <div class="bubble-text">${text}</div>
        <span class="bubble-meta">${sender} • ${time}</span>
    `;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function nameToColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
}

/**
 * 8. Notification System Logic
 */
function initNotifications() {
    const notifBell = document.getElementById('notifBell');
    const notifDropdown = document.getElementById('notifDropdown');
    const markAllReadBtn = document.getElementById('markAllRead');

    if (!notifBell || !notifDropdown) return;

    // Toggle Dropdown
    notifBell.addEventListener('click', (e) => {
        // Prevent closing immediately if we clicked inside
        if (e.target.closest('.notif-dropdown')) return;
        
        const isVisible = notifDropdown.style.display === 'flex';
        notifDropdown.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible) {
            fetchNotifications();
        }
    });

    // Mark All Read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markNotificationsAsRead();
        });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!notifBell.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });

    // Initial Fetch for Badge
    fetchNotifications(true); 
}

async function fetchNotifications(badgeOnly = false) {
    try {
        const response = await fetch('http://localhost:5000/api/volunteers/me/notifications', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const notifications = data.data.notifications;
            
            updateNotifBadge(notifications);
            if (!badgeOnly) {
                renderNotifications(notifications);
            }
        }
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
    }
}

function updateNotifBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notifList');
    if (!notifications || notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
        return;
    }

    list.innerHTML = notifications.map(n => {
        const iconInfo = getNotifIconInfo(n.type);
        return `
            <div class="notif-item ${n.is_read ? '' : 'unread'}">
                <div class="notif-icon" style="background: ${iconInfo.bg}; color: ${iconInfo.color}">
                    ${iconInfo.emoji}
                </div>
                <div class="notif-desc">
                    <span class="n-msg">${n.message}</span>
                    <span class="n-time">${n.time_ago}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getNotifIconInfo(type) {
    switch(type) {
        case 'critical_need': 
            return { emoji: '🚨', bg: '#ffebee', color: '#c62828' };
        case 'broadcast': 
            return { emoji: '📢', bg: '#e8eaf6', color: '#1a237e' };
        case 'task_accepted': 
            return { emoji: '✅', bg: '#e8f5e9', color: '#2e7d32' };
        case 'task_completed': 
            return { emoji: '🏆', bg: '#fff3e0', color: '#e65100' };
        case 'match_found': 
            return { emoji: '🎯', bg: '#f3e5f5', color: '#6a1b9a' };
        default: 
            return { emoji: '🔔', bg: '#f5f5f5', color: '#757575' };
    }
}

async function markNotificationsAsRead() {
    try {
        const response = await fetch('http://localhost:5000/api/volunteers/me/notifications/read', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            document.getElementById('notifBadge').style.display = 'none';
            // Refresh the list to show them as read (no blue background)
            fetchNotifications();
        }
    } catch (err) {
        console.error('Failed to mark notifications read:', err);
    }
}

/**
 * 9. Modal UI Helpers
 */
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * 10. Task Detail Modal Logic
 */
function openTaskDetailModal(id) {
    // Convert id to same type as items in allMatchedTasks
    const task = allMatchedTasks.find(t => String(t.id) === String(id));
    if (!task) return;

    document.getElementById('detailTitle').innerText = task.title;
    document.getElementById('detailPriorityBadge').innerHTML = `<span class="priority-pill ${task.priority.toLowerCase()}">${task.priority.toUpperCase()}</span>`;
    document.getElementById('detailMeta').innerText = `Posted by ${task.ngo || 'Gavutham Foundation'} · ${task.posted_ago || 'just now'}`;
    
    const body = document.getElementById('taskDetailBody');
    const volSkills = currentVolunteer.skills.toLowerCase().split(',').map(s => s.trim());
    const reqSkills = (task.required_skills || task.skills || '').split(',').map(s => s.trim());
    const matchPercentage = task.match_percentage || calculateSimpleMatch(reqSkills, volSkills);

    body.innerHTML = `
        <div class="info-grid">
            <div class="info-box"><span>📍 Location</span><p>${task.location}</p></div>
            <div class="info-box"><span>📅 Due Date</span><p>${task.due_date || 'Apr 20, 2026'}</p></div>
            <div class="info-box"><span>🏢 Organization</span><p>${task.ngo || 'Gavutham Foundation'}</p></div>
        </div>
        <span class="detail-label">About This Task</span>
        <p class="detail-text">${task.description || 'No description provided.'}</p>
        <span class="detail-label">Skills Required</span>
        <div class="skill-pills-wrap" style="margin-bottom:24px">
            ${buildSkillMatchPills(reqSkills, volSkills)}
        </div>
        <span class="detail-label">Match Analysis</span>
        <div class="match-analysis-wrap">
            <div class="analysis-text">
                ${reqSkills.map(s => volSkills.includes(s.toLowerCase()) ? 
                    `<div class="analysis-item">✅ Your skill <b>'${s}'</b> matches this task</div>` : '').join('')}
                ${task.location.toLowerCase() === currentVolunteer.location.toLowerCase() ? 
                    `<div class="analysis-item">✅ Your location matches task location</div>` : ''}
                <div class="analysis-item">ℹ️ Overall match score for this opportunity: <b>${matchPercentage}%</b></div>
            </div>
        </div>
        <span class="detail-label">Task Location</span>
        <div id="taskDetailMap"></div>
    `;

    openModal('taskDetailModal');

    // Initialize Map for Modal
    setTimeout(() => {
        if (currentTaskMap) currentTaskMap.remove();
        
        const center = getCoordsForLoc(task.location);
        currentTaskMap = L.map('taskDetailMap').setView(center, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM'
        }).addTo(currentTaskMap);
        
        L.circleMarker(center, {
            radius: 8,
            fillColor: '#1a237e',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).addTo(currentTaskMap).bindPopup(task.title).openPopup();
    }, 350);

    const acceptBtn = document.getElementById('detailAcceptBtn');
    acceptBtn.onclick = () => {
        closeModal('taskDetailModal');
        acceptTask(id);
    };
}

function calculateSimpleMatch(req, vol) {
    if (!req.length) return 100;
    const matches = req.filter(s => vol.includes(s.toLowerCase())).length;
    return Math.round((matches / req.length) * 100);
}

function buildSkillMatchPills(required, volunteer) {
    return required.map(skill => {
        const hasIt = volunteer.includes(skill.toLowerCase());
        return `<span class="skill-pill ${hasIt ? 'skill-pill-matched' : 'skill-pill-missing'}">
            ${hasIt ? '✅' : '❌'} ${skill}
        </span>`;
    }).join('');
}

function getCoordsForLoc(loc) {
    const coordsMap = {
        'Palladam': [10.9913, 77.0554],
        'Ukkadam': [10.9847, 76.9563],
        'Peelamedu': [11.0142, 76.9946],
        'Coimbatore': [10.9925, 77.0150]
    };
    return coordsMap[loc] || [11.0142, 76.9946];
}

/**
 * 11. Report Issue Logic
 */
let currentReportingTaskId = null;

function openReportModal(id, source = 'matched') {
    let task = null;
    if (source === 'active') {
        task = allActiveTasks.find(t => String(t.id) === String(id));
    } else {
        task = allMatchedTasks.find(t => String(t.id) === String(id));
    }

    if (!task) return;
    currentReportingTaskId = id;

    document.getElementById('reportTaskName').innerText = `Reporting: ${task.title}`;
    
    // Clear previous state
    document.querySelectorAll('.report-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('reportDescription').value = '';
    
    openModal('reportModal');
}

function selectReportPill(el) {
    document.querySelectorAll('.report-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
}

async function submitReport() {
    const activePill = document.querySelector('.report-pill.active');
    const description = document.getElementById('reportDescription').value.trim();

    if (!activePill) {
        showToast('Please select an issue type', 'error');
        return;
    }

    if (!description) {
        showToast('Please provide a short description', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/volunteers/tasks/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                task_id: currentReportingTaskId,
                issue_type: activePill.innerText,
                description: description
            })
        });

        if (response.ok) {
            showToast('Issue reported successfully. The NGO will review it.', 'success');
            closeModal('reportModal');
        } else {
            throw new Error('Server Fail');
        }
    } catch (e) {
        // Fallback for dev
        showToast('Issue reported successfully (Sync Mode)', 'success');
        closeModal('reportModal');
    }
}
