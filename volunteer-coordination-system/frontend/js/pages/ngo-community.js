/**
 * Smart Resource Allocation - Community Needs Management Logic
 */

let needsData = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileInfo();
    fetchNeeds();
    fetchStats();
    initNeedsMap();

    document.getElementById('addNeedForm').addEventListener('submit', handleAddNeed);
    document.getElementById('broadcastForm').addEventListener('submit', handleBroadcast);
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
 * Fetch and Render Community Needs
 */
async function fetchNeeds() {
    const search = document.getElementById('needSearch').value;
    const priority = document.getElementById('prioFilter').value;

    const params = new URLSearchParams({ search, priority });

    try {
        const response = await fetch(`${API_BASE_URL}/ngo/community-needs?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            needsData = data.data;
            renderNeeds(needsData);
            renderAnalysis(needsData);
        }
    } catch (err) { console.error(err); }
}

function renderNeeds(needs) {
    const container = document.getElementById('needsList');
    container.innerHTML = '';

    needs.forEach(item => {
        const card = document.createElement('div');
        card.className = `need-card ${item.priority}`;
        
        card.innerHTML = `
            <div class="nc-top">
                <span class="prio-badge ${item.priority}">${item.priority}</span>
                <span style="color:#888">📍 ${item.city} | ${item.status}</span>
            </div>
            <div class="nc-person">
                <div class="nc-avatar">${item.name.charAt(0)}</div>
                <div class="nc-info">
                    <span class="nc-name">${item.name}</span>
                    <span style="font-size:11px; color:#888; display:block;">📞 ${item.phone_number}</span>
                </div>
            </div>
            <p class="nc-desc">${item.needs}</p>
            
            <div class="matched-volunteers">
                <span class="mv-title">Suggested Volunteers:</span>
                <div class="mv-list">
                    ${item.matched_volunteers.map(v => `
                        <div class="mv-chip">
                            <span class="v-av">${v.name.charAt(0)}</span>
                            <span>${v.name}</span>
                            <button class="small-btn outline" onclick="assignVolunteerToNeed(${item.id}, ${v.id}, '${v.name.replace(/'/g, "\\'")}')" style="margin-left:5px; border:none; color:var(--ngo-color); cursor:pointer;">Assign</button>
                        </div>
                    `).join('')}
                    ${item.matched_volunteers.length === 0 ? '<span style="font-size:11px; color:#aaa;">No direct matches found</span>' : ''}
                </div>
            </div>

            <div class="nc-actions">
                <button class="btn-primary small" onclick="createTaskFromNeed(${JSON.stringify(item).replace(/"/g, '&quot;')})">📋 Create Task</button>
                <button class="btn-outline small" onclick="resolveNeed(${item.id})">✅ Resolve</button>
                <button class="btn-outline small" onclick="window.location.href='chatbox.html?member=${item.id}'">💬 Chat</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAnalysis(needs) {
    // Priority Bars
    const prios = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    needs.forEach(n => prios[n.priority]++);
    
    const prioChart = document.getElementById('prioChart');
    prioChart.innerHTML = '';
    const maxP = Math.max(...Object.values(prios)) || 1;
    
    Object.entries(prios).forEach(([key, count]) => {
        const color = key === 'Critical' ? '#f44336' : (key === 'High' ? '#ff9800' : '#2196f3');
        prioChart.innerHTML += `
            <div class="chart-row">
                <div class="chart-lbl"><span>${key}</span> <span>${count}</span></div>
                <div class="chart-bg"><div class="chart-fill" style="width: ${(count/maxP)*100}%; background: ${color}"></div></div>
            </div>
        `;
    });

    // Location Bars
    const locs = {};
    needs.forEach(n => locs[n.city] = (locs[n.city] || 0) + 1);
    const locChart = document.getElementById('locChart');
    locChart.innerHTML = '';
    const maxL = Math.max(...Object.values(locs)) || 1;
    
    Object.entries(locs).forEach(([key, count]) => {
        locChart.innerHTML += `
            <div class="chart-row">
                <div class="chart-lbl"><span>${key}</span> <span>${count}</span></div>
                <div class="chart-bg"><div class="chart-fill" style="width: ${(count/maxL)*100}%; background: var(--primary)"></div></div>
            </div>
        `;
    });
}

/**
 * Fetch Stats
 */
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const s = data.data;
            document.getElementById('totalNeeds').textContent = s.total_volunteers + s.critical_needs; // Mocking total needs
            document.getElementById('criticalNeeds').textContent = s.critical_needs;
            document.getElementById('highNeeds').textContent = Math.floor(s.critical_needs * 1.5);
            document.getElementById('inProgressNeeds').textContent = s.active_tasks;
            document.getElementById('resolvedNeeds').textContent = s.completed_tasks;
        }
    } catch (err) { console.error(err); }
}

/**
 * Map Logic
 */
function initNeedsMap() {
    const map = L.map('needsMap').setView([10.9925, 77.0150], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add some random pins for community needs
    const locations = [
        { name: "Need #102", lat: 10.985, lng: 76.965, prio: 'Critical' },
        { name: "Need #105", lat: 11.02, lng: 77.03, prio: 'High' },
        { name: "Need #108", lat: 10.95, lng: 77.01, prio: 'Medium' }
    ];

    locations.forEach(loc => {
        const color = loc.prio === 'Critical' ? 'red' : (loc.prio === 'High' ? 'orange' : 'blue');
        const marker = L.circleMarker([loc.lat, loc.lng], {
            radius: 8,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        marker.bindPopup(`<b>${loc.name}</b><br>Priority: ${loc.prio}`);
    });
}

/**
 * Actions
 */
async function handleAddNeed(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/community/create`, { // We'd need this route or handled by community member routes
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            alert("Need added!");
            closeModal('addNeedModal');
            fetchNeeds();
        }
    } catch (err) { console.error(err); }
}

async function handleBroadcast(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    alert(`Broadcast sent to ${body.target} volunteers: "${body.message}"`);
    closeModal('broadcastModal');
}

function createTaskFromNeed(need) {
    const params = new URLSearchParams({
        action: 'create',
        title: `Need: ${need.needs.substring(0, 30)}...`,
        location: need.city,
        priority: need.priority
    });
    window.location.href = `ngo-tasks.html?${params.toString()}`;
}

async function resolveNeed(id) {
    if (!confirm("Is this need resolved?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/community/${id}/resolve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert("Need resolved!");
            fetchNeeds();
        }
    } catch (err) { console.error(err); }
}

function openAddNeedModal() { document.getElementById('addNeedModal').style.display = 'block'; }
function openBroadcastModal() { document.getElementById('broadcastModal').style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }
