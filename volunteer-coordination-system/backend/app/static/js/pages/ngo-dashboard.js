/**
 * Smart Resource Allocation - NGO Dashboard Logic
 */

const API_BASE_URL = '/api';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadNGOProfile();
    fetchDashboardStats();
    fetchRecentActivity();
    fetchPendingReports();
    fetchCriticalNeeds();
    initMap();
    updateDateTime();
    
    // Initialize Modal Handlers
    initModalHooks();
});

/**
 * AUTH & PROFILE
 */
function checkAuth() {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'ngo') {
        window.location.href = 'login.html';
    }
}

function loadNGOProfile() {
    const ngo = JSON.parse(localStorage.getItem('ngo'));
    const user = JSON.parse(localStorage.getItem('user'));

    if (ngo) {
        document.querySelectorAll('.ngo-name-text').forEach(el => el.textContent = ngo.ngo_name);
        if (document.getElementById('welcomeText')) {
            document.getElementById('welcomeText').textContent = `Good ${getTimeOfDay()}, ${ngo.ngo_name}! 🏢`;
        }
    }

    if (user) {
        document.querySelectorAll('#sidebarUserName, #navUserName').forEach(el => el.textContent = user.name);
        document.querySelectorAll('#sidebarAvatar, #navAvatar').forEach(el => el.textContent = user.name.charAt(0));
    }
}

/**
 * DASHBOARD DATA FETCHING
 */
async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            const s = data.data;
            
            // Hero Stats
            if(document.getElementById('heroActiveTasks')) document.getElementById('heroActiveTasks').textContent = s.active_tasks;
            if(document.getElementById('heroActiveVolunteers')) document.getElementById('heroActiveVolunteers').textContent = s.available_volunteers;
            if(document.getElementById('heroPendingNeeds')) document.getElementById('heroPendingNeeds').textContent = s.critical_needs;

            // Stat Cards
            const ids = ['statTotalVolunteers', 'statActiveTasks', 'statCompletedTasks', 'statCriticalNeeds', 'statPeopleHelped', 'statPendingReports', 'urgentNeedsCount'];
            ids.forEach(id => {
                if(document.getElementById(id)) document.getElementById(id).textContent = s[id.replace('stat', '').replace('urgentNeedsCount', 'critical_needs').replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '')] || s[id.replace('stat', '').replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '')] || 0;
            });
            
            // Fix for inconsistent naming in map/object
            if(document.getElementById('statTotalVolunteers')) document.getElementById('statTotalVolunteers').textContent = s.total_volunteers;
            if(document.getElementById('statPendingReports')) document.getElementById('statPendingReports').textContent = s.pending_reviews;

            if (s.critical_needs > 0 && document.getElementById('criticalNeedsCard')) {
                document.getElementById('criticalNeedsCard').classList.add('pulsing');
            }

            // Task Status Bar Chart
            const statusMap = s.tasks_by_status || {};
            animateProgressBar('barOpen', statusMap.Open || 0, s.total_tasks);
            animateProgressBar('barAssigned', statusMap.Assigned || 0, s.total_tasks);
            animateProgressBar('barInProgress', statusMap['In Progress'] || 0, s.total_tasks);
            animateProgressBar('barCompleted', statusMap.Completed || 0, s.total_tasks);
            
            if(document.getElementById('countOpen')) document.getElementById('countOpen').textContent = statusMap.Open || 0;
            if(document.getElementById('countAssigned')) document.getElementById('countAssigned').textContent = statusMap.Assigned || 0;
            if(document.getElementById('countInProgress')) document.getElementById('countInProgress').textContent = statusMap['In Progress'] || 0;
            if(document.getElementById('countCompleted')) document.getElementById('countCompleted').textContent = statusMap.Completed || 0;

            // Availability Conic Circles
            updateConicCircle('circleAvailable', s.available_volunteers, s.total_volunteers);
            updateConicCircle('circleBusy', s.busy_volunteers, s.total_volunteers);
            updateConicCircle('circleOnLeave', s.on_leave_volunteers, s.total_volunteers);
            
            if(document.getElementById('labelAvailable')) document.getElementById('labelAvailable').textContent = `${s.available_volunteers} Available`;
            if(document.getElementById('labelBusy')) document.getElementById('labelBusy').textContent = `${s.busy_volunteers} Busy`;
            if(document.getElementById('labelOnLeave')) document.getElementById('labelOnLeave').textContent = `${s.on_leave_volunteers} On Leave`;
        }
    } catch (err) { console.error("Error fetching stats:", err); }
}

async function fetchRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/recent-activity?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const list = document.getElementById('recentActivityList');
            if(!list) return;
            list.innerHTML = '';
            data.data.forEach(log => {
                const row = document.createElement('div');
                row.className = 'activity-row';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.padding = '10px 0';
                row.style.borderBottom = '1px solid #eee';
                row.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:13px; font-weight:600;">${log.message}</span>
                        <span style="font-size:11px; color:#777;">${log.time_ago}</span>
                    </div>
                    <a href="ngo-tasks.html?id=${log.related_task_id}" style="font-size:11px; color:var(--ngo-color); text-decoration:none;">View →</a>
                `;
                list.appendChild(row);
            });
        }
    } catch (err) { console.error("Error fetching activity:", err); }
}

async function fetchPendingReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/pending-reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const list = document.getElementById('pendingReportsList');
            if(!list) return;
            list.innerHTML = '';
            if (data.data.length === 0) {
                list.innerHTML = '<p style="font-size:12px; color:#888; text-align:center;">No pending reports</p>';
                return;
            }
            data.data.forEach(report => {
                const item = document.createElement('div');
                item.className = 'report-item';
                item.style.padding = '12px';
                item.style.background = '#f9f9f9';
                item.style.borderRadius = '8px';
                item.style.marginBottom = '8px';
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-weight:600; font-size:13px;">${report.volunteer_name}</span>
                        <span style="font-size:10px; color:#888;">${new Date(report.submitted_at).toLocaleDateString()}</span>
                    </div>
                    <p style="font-size:12px; margin-bottom:8px;">Submitting report for <b>${report.task_title}</b></p>
                    <div class="item-actions">
                        <button class="small-btn outline" onclick="reviewReport(${report.assignment_id})">👁 Review</button>
                        <button class="small-btn primary" style="background:#4caf50" onclick="approveReport(${report.assignment_id})">✅ Approve</button>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    } catch (err) { console.error("Error fetching reports:", err); }
}

async function fetchCriticalNeeds() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/community-needs?priority=Critical&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const list = document.getElementById('criticalNeedsList');
            if(!list) return;
            list.innerHTML = '';
            data.data.forEach(need => {
                const item = document.createElement('div');
                item.className = 'need-item';
                item.innerHTML = `
                    <div class="need-top">
                        <span class="need-name">${need.name}</span>
                        <span class="need-loc">📍 ${need.city}</span>
                    </div>
                    <p class="need-desc">${need.needs}</p>
                    <div class="item-actions">
                        <button class="small-btn primary" onclick="createTaskFromNeed(${JSON.stringify(need).replace(/"/g, '&quot;')})">📋 Create Task</button>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    } catch (err) { console.error("Error fetching needs:", err); }
}

/**
 * BUTTON HANDLERS
 */
function createTaskFromNeed(need) {
    const params = new URLSearchParams({
        action: 'create',
        title: `Response: ${need.needs.substring(0, 30)}...`,
        location: need.city,
        description: `Community Need reported by ${need.name}: ${need.needs}`,
        priority: 'Critical'
    });
    window.location.href = `ngo-tasks.html?${params.toString()}`;
}

async function approveReport(assignmentId) {
    if(!confirm("Are you sure you want to approve this field report?")) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/tasks/assignments/${assignmentId}/approve`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('✅ Report Approved', 'Task successfully marked as completed.', 'green');
            fetchPendingReports(); // Refresh the list
            fetchDashboardStats(); // Refresh stats
        } else {
            const err = await response.json();
            showToast('Error', err.message || 'Failed to approve report.', 'red');
        }
    } catch (err) {
        console.error(err);
        showToast('Error', 'Connection error.', 'red');
    }
}

function reviewReport(assignmentId) {
    window.location.href = `ngo-reports.html?assignment_id=${assignmentId}`;
}

/**
 * UTILITIES
 */
function initMap() {
    if(!document.getElementById('volunteerMap')) return;
    const map = L.map('volunteerMap').setView([10.9925, 77.0150], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([10.9925, 77.0150]).addTo(map).bindPopup('<b>NGO Headquarters</b>').openPopup();
}

function animateProgressBar(id, value, total) {
    const bar = document.getElementById(id);
    if (!bar) return;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    setTimeout(() => { bar.style.width = percentage + '%'; }, 100);
}

function updateConicCircle(id, value, total) {
    const circle = document.getElementById(id);
    if (!circle) return;
    const percentage = total > 0 ? (value / total) * 360 : 0;
    circle.style.background = `conic-gradient(var(--circle-color) ${percentage}deg, #f1f3f4 0deg)`;
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

function updateDateTime() {
    if(!document.getElementById('currentDate')) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

/**
 * PROFESSIONAL MODAL LOGIC (New)
 */
function openAnnouncementModal() { document.getElementById('announcementModal').style.display = 'flex'; initAnnouncementLogic(); }
function openUrgentAlertModal() { document.getElementById('urgentAlertModal').style.display = 'flex'; initUrgentAlertLogic(); fetchMatchingVolunteers(); }
function openGenerateReportModal() { document.getElementById('reportModal').style.display = 'flex'; initReportModal(); nextReportStep(1); }
function openUploadResourceModal() { document.getElementById('uploadResourceModal').style.display = 'flex'; initResourceUploadLogic(); loadResourceCategories(); }

function closeDashboardModal(id) { document.getElementById(id).style.display = 'none'; }

function initModalHooks() {
    // Map Action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        const text = btn.textContent.trim();
        if (text.includes('Post Announcement')) btn.onclick = openAnnouncementModal;
        if (text.includes('Post Urgent Alert')) btn.onclick = openUrgentAlertModal;
        if (text.includes('Generate Report')) btn.onclick = openGenerateReportModal;
        if (text.includes('Upload Resource')) btn.onclick = openUploadResourceModal;
    });

    const navAlertBtn = document.querySelector('.btn-alert');
    if (navAlertBtn) navAlertBtn.onclick = openUrgentAlertModal;

    window.onclick = function(event) {
        if (event.target.classList.contains('dashboard-modal-overlay')) {
            event.target.style.display = 'none';
        }
    };
}

/**
 * 1. ANNOUNCEMENT
 */
function initAnnouncementLogic() {
    const titleInp = document.getElementById('annTitle');
    const msgInp = document.getElementById('annMessage');
    const preview = document.getElementById('announcementPreview');
    
    titleInp.oninput = () => {
        preview.textContent = titleInp.value || "Your announcement title will appear here...";
        document.getElementById('annTitleCount').textContent = `${titleInp.value.length}/100`;
    };
    msgInp.oninput = () => document.getElementById('annMsgCount').textContent = `${msgInp.value.length}/500`;
    document.getElementById('annActionToggle').onchange = (e) => document.getElementById('actionFields').style.display = e.target.checked ? 'block' : 'none';
    
    document.querySelectorAll('#annAudience .pill-checkbox, #urgSkills .pill-checkbox').forEach(pill => {
        pill.onclick = () => {
            const cb = pill.querySelector('input');
            if (cb) {
                cb.checked = !cb.checked;
                pill.classList.toggle('selected', cb.checked);
                if (pill.parentElement.id === 'urgSkills') fetchMatchingVolunteers();
            }
        };
    });
}

function initUrgentAlertLogic() {
    // Sync location input with matching
    const locInp = document.getElementById('urgLocation');
    if (locInp) {
        locInp.oninput = fetchMatchingVolunteers;
    }
}

async function submitAnnouncement() {
    const title = document.getElementById('annTitle').value;
    const message = document.getElementById('annMessage').value;
    const room_id = document.getElementById('annRoom').value;
    const audiences = Array.from(document.querySelectorAll('#annAudience input:checked')).map(i => i.value);
    
    if (!title || message.length < 20 || audiences.length === 0) {
        showToast('Error', 'Please fill all required fields.', 'red');
        return;
    }

    const btn = document.getElementById('submitAnnBtn');
    btn.disabled = true;
    btn.innerHTML = 'Posting...';

    try {
        await fetch(`${API_BASE_URL}/chat/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id, message: `📢 ANNOUNCEMENT: ${title}\n\n${message}`, message_type: 'announcement' })
        });
        await fetch(`${API_BASE_URL}/ngo/broadcast-notification`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ audience: audiences, title, message })
        });
        showToast('📢 Announcement Posted', 'Successfully broadcasted.', 'orange');
        closeDashboardModal('announcementModal');
        fetchRecentActivity();
    } catch (err) { showToast('Error', 'Failed to post.', 'red'); }
    finally { btn.disabled = false; btn.innerHTML = 'Post Announcement'; }
}

/**
 * 2. URGENT ALERT
 */
let selectedUrgencyLevel = 'critical';
function selectUrgency(level) {
    selectedUrgencyLevel = level;
    document.querySelectorAll('.u-card').forEach(c => c.classList.remove('selected'));
    const id = `urgency${level.charAt(0).toUpperCase() + level.slice(1)}`;
    const el = document.getElementById(id);
    if (el) el.classList.add('selected');
}
function fillLoc(city) { document.getElementById('urgLocation').value = city; fetchMatchingVolunteers(); }

async function fetchMatchingVolunteers() {
    const loc = document.getElementById('urgLocation').value;
    const skills = Array.from(document.querySelectorAll('#urgSkills input:checked')).map(i => i.value).join(',');
    try {
        const resp = await fetch(`${API_BASE_URL}/ngo/matching-volunteers?location=${loc}&skills=${skills}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await resp.json();
        const list = document.getElementById('matchingVolunteers');
        list.innerHTML = data.data.length ? data.data.map(v => `<div style="font-size:12px;padding:2px;">👤 ${v.name}</div>`).join('') : '<label>Alert will be sent to ALL available volunteers.</label>';
        document.getElementById('urgMatchCount').textContent = data.data.length ? `${data.data.length} volunteers match` : 'All volunteers will be notified';
    } catch (err) { console.error(err); }
}

async function submitUrgentAlert() {
    const desc = document.getElementById('urgDescription').value;
    const loc = document.getElementById('urgLocation').value;
    if (desc.length < 30 || !loc) { showToast('Error', 'Please fill all fields.', 'red'); return; }
    const btn = document.getElementById('submitUrgBtn');
    btn.disabled = true; btn.innerHTML = 'Sending...';
    try {
        await fetch(`${API_BASE_URL}/chat/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: 2, message: `🚨 URGENT: ${loc}\n${desc}`, message_type: 'urgent_alert', urgency_level: selectedUrgencyLevel })
        });
        showToast('🚨 Alert Sent', 'All volunteers notified.', 'red');
        closeDashboardModal('urgentAlertModal');
    } catch (err) { showToast('Error', 'Failed.', 'red'); }
    finally { btn.disabled = false; btn.innerHTML = 'Send Alert'; }
}

/**
 * 3. REPORT
 */
function initReportModal() {
    const cards = document.querySelectorAll('#reportModal .repo-card');
    cards.forEach(card => {
        card.onclick = () => {
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        };
    });

    // Handle Period Pills
    const periodPills = document.querySelectorAll('#reportStep2 .pill');
    periodPills.forEach(pill => {
        pill.onclick = () => {
            periodPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
        };
    });

    // Handle Format Pills
    const formatPills = document.querySelectorAll('#reportStep2 .format-pill');
    formatPills.forEach(pill => {
        pill.onclick = () => {
            formatPills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
        };
    });
}

function handleReportStep1() {
    const selected = document.querySelector('input[name="reportType"]:checked');
    if (!selected) {
        showToast('Selection Required', 'Please select a report type to continue.', 'red');
        return;
    }
    
    const type = selected.value;
    showToast('Processing', `Initializing ${type === 'tasks' ? 'Tasks Summary' : 'Volunteer Performance'} report...`, 'green');
    
    // Move to step 2
    setTimeout(() => {
        nextReportStep(2);
    }, 600);
}

function nextReportStep(step) {
    document.getElementById('reportStep1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('reportStep2').style.display = step === 2 ? 'block' : 'none';
}

async function generateReport() {
    const btn = document.getElementById('submitReportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    showToast('📊 Report', 'Generating your professional report...', 'green');
    
    setTimeout(() => {
        showToast('✅ Success', 'Report generated and downloaded successfully.', 'green');
        btn.disabled = false;
        btn.innerHTML = 'Generate & Download';
        closeDashboardModal('reportModal');
    }, 2000);
}

/**
 * 4. RESOURCE
 */
function initResourceUploadLogic() {
    const typeRadios = document.querySelectorAll('input[name="resType"]');
    const dynamicArea = document.getElementById('dynamicInputArea');

    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            let html = '';

            if (['pdf', 'template', 'checklist'].includes(type)) {
                html = `
                    <div class="file-dropzone" onclick="document.getElementById('resFile').click()">
                        <span class="icon">📎</span>
                        <p><strong>Click to upload ${type.toUpperCase()}</strong> or drag and drop</p>
                        <span class="subtext">Maximum file size: 10MB</span>
                        <input type="file" id="resFile" accept=".pdf" style="display:none">
                    </div>
                `;
            } else if (type === 'video') {
                html = `
                    <div class="form-group-stacked">
                        <label>Video URL *</label>
                        <input type="url" id="resVideoUrl" placeholder="https://www.youtube.com/watch?v=..." required>
                        <span class="subtext">Supports YouTube, Vimeo, and Loom links</span>
                    </div>
                `;
            } else if (['guide', 'article'].includes(type)) {
                html = `
                    <div class="form-group-stacked">
                        <label>Full Content (Markdown supported) *</label>
                        <textarea id="resContent" rows="8" placeholder="Enter the full guide or article content here..."></textarea>
                    </div>
                `;
            } else if (type === 'quiz') {
                html = `
                    <div class="info-box-blue">
                        <p>ℹ️ <strong>Note:</strong> You are uploading the Quiz metadata. You will be prompted to add specific quiz questions and answers in the next step after this resource is created.</p>
                    </div>
                `;
            }

            dynamicArea.innerHTML = html;
        });
    });
}

async function submitResource() {
    const btn = document.getElementById('submitResBtn');
    const form = document.getElementById('resourceForm');
    
    // Basic validation
    const title = document.getElementById('resTitle').value;
    if (!title) {
        showToast('Required Field', 'Please enter a resource title.', 'red');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Uploading...';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', document.getElementById('resDesc').value);
    formData.append('category', document.getElementById('resCategory').value);
    formData.append('skills', document.getElementById('resSkills').value);
    formData.append('type', form.querySelector('input[name="resType"]:checked').value);
    formData.append('difficulty', form.querySelector('input[name="resDifficulty"]:checked').value);
    formData.append('featured', document.getElementById('resFeatured').checked);

    // Handle dynamic fields
    const type = form.querySelector('input[name="resType"]:checked').value;
    if (['pdf', 'template', 'checklist'].includes(type)) {
        const fileInput = document.getElementById('resFile');
        if (fileInput && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
    } else if (type === 'video') {
        formData.append('content_url', document.getElementById('resVideoUrl').value);
    } else if (['guide', 'article'].includes(type)) {
        formData.append('content_text', document.getElementById('resContent').value);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/resources/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            showToast('📚 Success', 'Resource uploaded successfully!', 'purple');
            closeDashboardModal('uploadResourceModal');
            form.reset();
            // Re-fetch resources if needed (not implemented yet)
        } else {
            const error = await response.json();
            showToast('Upload Failed', error.message || 'Server error occurred.', 'red');
        }
    } catch (err) {
        showToast('Error', 'Could not connect to the server.', 'red');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Upload Resource';
    }
}

/**
 * TOAST
 */
function showToast(title, msg, type = 'orange') {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { orange: '📢', red: '🚨', green: '📊', purple: '📚' };
    toast.innerHTML = `<div class="toast-icon">${icons[type] || '✨'}</div><div class="toast-content"><h4>${title}</h4><p>${msg}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
