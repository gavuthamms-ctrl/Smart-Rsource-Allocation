/**
 * Community Volunteers Page Logic
 */

let currentUser = null;
let currentCommunity = null;
let allVolunteers = [];
let filteredVolunteers = [];

window.onload = async function() {
    checkAuth();
    currentUser = JSON.parse(localStorage.getItem('user'));
    currentCommunity = JSON.parse(localStorage.getItem('community'));
    
    updateHeader();
    await loadVolunteers();
};

function checkAuth() {
    if (!localStorage.getItem('token')) window.location.href = 'login.html';
}

function updateHeader() {
    document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
    document.querySelectorAll('.avatar').forEach(el => el.textContent = currentUser.name.charAt(0));
}

async function loadVolunteers() {
    const grid = document.getElementById('volunteersGrid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading volunteers...</p>';
    
    try {
        const response = await fetch(`/api/community/volunteers?city=${currentCommunity.city}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            allVolunteers = data.data.volunteers;
            filteredVolunteers = [...allVolunteers];
            renderVolunteers();
            updateStats();
        }
    } catch (err) {
        console.error("Fetch failed", err);
    }
}

function renderVolunteers() {
    const grid = document.getElementById('volunteersGrid');
    grid.innerHTML = '';
    
    if (filteredVolunteers.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No volunteers found with these filters.</p>';
        return;
    }

    filteredVolunteers.forEach(v => {
        const card = document.createElement('div');
        card.className = `v-card ${v.skill_match ? 'matched' : ''}`;
        
        card.innerHTML = `
            <div class="v-avatar-box">
                <span class="v-badge-avail" style="background: ${v.availability === 'Available' ? '#e8f5e9; color: #2e7d32' : '#fff3e0; color: #ef6c00'}">
                    ${v.availability === 'Available' ? '🟢 Available' : '🟠 Busy'}
                </span>
                <div class="v-avatar-circle" style="background: ${getRandomColor()}">${v.name.charAt(0)}</div>
            </div>
            <h3 class="v-name">${v.name}</h3>
            <span class="v-code">VOL-${v.id.toString().padStart(4, '0')}</span>
            
            <div class="v-skills" style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; height: 50px; overflow: hidden;">
                ${v.skills.split(',').map(s => `<span class="skill-pill" style="font-size: 10px; background: #f0f0f0; padding: 2px 8px; border-radius: 4px;">${s.trim()}</span>`).join('')}
            </div>
            
            <div style="font-size: 13px; color: #666; margin-top: 10px;">📍 ${v.location}</div>
            
            <div class="v-impact-stats">
                <div class="impact-item">
                    <span class="impact-val">${v.tasks_completed || 0}</span>
                    <span class="impact-lab">Tasks</span>
                </div>
                <div class="impact-item">
                    <span class="impact-val">${v.people_helped || 0}</span>
                    <span class="impact-lab">Helped</span>
                </div>
            </div>

            ${v.skill_match ? '<div class="match-banner">✅ Matching your need!</div>' : '<div style="margin: 16px 0; height: 31px;"></div>'}

            <div class="v-actions">
                <button class="btn-v-chat" onclick="window.location.href='chatbox.html?target=${v.id}'">💬 Chat</button>
                <button class="btn-v-req" onclick="alert('Request sent to ${v.name}')">🙋 Request Help</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStats() {
    document.getElementById('statTotalVolunteers').textContent = filteredVolunteers.length;
    document.getElementById('statAvailableVolunteers').textContent = filteredVolunteers.filter(v => v.availability === 'Available').length;
    
    let totalHelped = 0;
    filteredVolunteers.forEach(v => totalHelped += (v.people_helped || 0));
    document.getElementById('statPeopleHelped').textContent = totalHelped;
}

function filterBySkill(skill, element) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    element.classList.add('active');
    
    if (skill === 'All') {
        filteredVolunteers = [...allVolunteers];
    } else {
        filteredVolunteers = allVolunteers.filter(v => v.skills.toLowerCase().includes(skill.toLowerCase()));
    }
    renderVolunteers();
    updateStats();
}

function handleSearch(query) {
    query = query.toLowerCase();
    filteredVolunteers = allVolunteers.filter(v => 
        v.name.toLowerCase().includes(query) || 
        v.skills.toLowerCase().includes(query)
    );
    renderVolunteers();
    updateStats();
}

function getRandomColor() {
    const colors = ['#1b5e20', '#2e7d32', '#43a047', '#66bb6a', '#81c784'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
