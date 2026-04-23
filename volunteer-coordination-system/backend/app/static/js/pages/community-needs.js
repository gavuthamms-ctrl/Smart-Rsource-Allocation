/**
 * Community Needs Page Logic
 */

let currentUser = null;
let currentCommunity = null;

window.onload = async function() {
    checkAuth();
    currentUser = JSON.parse(localStorage.getItem('user'));
    currentCommunity = JSON.parse(localStorage.getItem('community'));
    
    updateHeader();
    renderCurrentNeed();
    await loadHistory();
    await loadNearbyNeeds();
};

function checkAuth() {
    if (!localStorage.getItem('token')) window.location.href = 'login.html';
}

function updateHeader() {
    document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
    document.querySelectorAll('.avatar').forEach(el => el.textContent = currentUser.name.charAt(0));
}

function renderCurrentNeed() {
    const container = document.getElementById('currentNeedContainer');
    if (!currentCommunity || !currentCommunity.needs) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <span style="font-size: 48px;">📋</span>
                <h3>You haven't reported any specific needs yet.</h3>
                <p>Submit your first need to get matching volunteers.</p>
                <button class="btn-primary" style="margin: 20px auto;" onclick="window.location.href='community-dashboard.html'">Go to Dashboard</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="current-need-card">
            <div class="need-header-row">
                <div class="need-badges">
                    <span class="badge priority-${currentCommunity.priority.toLowerCase()}">${currentCommunity.priority} Priority</span>
                    <span class="badge status-${currentCommunity.status.toLowerCase().replace(' ', '-')}">${currentCommunity.status}</span>
                </div>
                <span style="font-size: 13px; color: #999">Posted on Oct 10, 2026</span>
            </div>

            <h1 class="need-title-large">${currentCommunity.needs.split('\n')[0]}</h1>
            <p class="need-desc-full">${currentCommunity.needs}</p>

            <div class="need-meta-info">
                <div class="meta-item">
                    <span class="meta-label">LOCATION</span>
                    <span class="meta-value">📍 ${currentCommunity.city}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">CONTACT</span>
                    <span class="meta-value">📞 ${currentCommunity.phone_number}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">ADDRESS</span>
                    <span class="meta-value">🏠 ${currentCommunity.address}</span>
                </div>
            </div>

            <!-- Horizontal Timeline -->
            <div class="timeline-horizontal">
                <div class="timeline-step completed active">
                    <div class="step-circle">✓</div>
                    <div class="step-text">Reported</div>
                </div>
                <div class="timeline-step ${currentCommunity.status !== 'Open' ? 'completed active' : ''}">
                    <div class="step-circle">2</div>
                    <div class="step-text">NGO Review</div>
                </div>
                <div class="timeline-step ${currentCommunity.status === 'In Progress' || currentCommunity.status === 'Resolved' ? 'completed active' : ''}">
                    <div class="step-circle">3</div>
                    <div class="step-text">Assigned</div>
                </div>
                <div class="timeline-step ${currentCommunity.status === 'Resolved' ? 'completed active' : ''}">
                    <div class="step-circle">4</div>
                    <div class="step-text">Resolved</div>
                </div>
            </div>

            <div class="need-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 24px;">
                <div style="display: flex; gap: 15px;">
                    <button class="btn-primary" style="background: #eee; color: #333;" onclick="alert('Update functionality coming soon')">✏️ Edit Need</button>
                    <button class="btn-outline-red" style="padding: 8px 16px;">🆘 Escalate to Urgent</button>
                </div>
                <button class="btn-primary" onclick="resolveStep()">✅ Mark Resolved</button>
            </div>
        </div>
    `;
}

async function resolveStep() {
    if (!confirm("Are you sure this need is resolved?")) return;
    
    try {
        const response = await fetch('/api/community/resolve-need', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            currentCommunity.status = 'Resolved';
            localStorage.setItem('community', JSON.stringify(currentCommunity));
            renderCurrentNeed();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadHistory() {
    // Mock for now
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = `
        <div class="history-item">
            <div>
                <span class="badge" style="background: #e8f5e9; color: #2e7d32; margin-bottom: 8px; display: inline-block;">✅ RESOLVED</span>
                <h4 style="margin-bottom: 4px;">Medicine delivery for elder</h4>
                <p style="font-size: 13px; color: #777;">Resolved on Aug 15, 2026</p>
            </div>
            <button class="btn-primary" style="background: transparent; color: var(--community-primary); border: 1px solid #eee;">View Details</button>
        </div>
    `;
}

async function loadNearbyNeeds() {
    const list = document.getElementById('nearbyNeedsList');
    list.innerHTML = `
        <div style="display: flex; gap: 16px; margin-top: 20px;">
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; flex: 1;">
                <span style="font-size: 24px;">💧</span>
                <h4 style="margin: 12px 0 6px;">Water Treatment needed</h4>
                <span class="badge priority-high">High Priority</span>
                <p style="font-size: 12px; color: #777; margin-top: 10px;">In ${currentCommunity.city}</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; flex: 1;">
                <span style="font-size: 24px;">⚡</span>
                <h4 style="margin: 12px 0 6px;">Street Light Repair</h4>
                <span class="badge" style="background: #eee; color: #555;">Medium Priority</span>
                <p style="font-size: 12px; color: #777; margin-top: 10px;">In ${currentCommunity.city}</p>
            </div>
        </div>
    `;
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
