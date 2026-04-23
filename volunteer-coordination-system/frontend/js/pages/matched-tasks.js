/**
 * Matched Tasks Page Logic
 */

let allTasks = [];
let filteredTasks = [];
let volunteer = null;
let currentTaskMap = null;

window.onload = async function() {
    if (!checkAuth()) return;
    
    volunteer = getVolunteer();
    loadUserInfo();
    loadPageHeader();
    
    await loadMatchedTasks();
    
    renderStatsStrip();
    renderSkillBreakdown();
    renderQuickProfile();
    renderActiveAlerts();
    
    setupEventListeners();
};

// --- AUTH & HELPERS ---

function checkAuth() {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user || user.role !== 'volunteer') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function getVolunteer() {
    return JSON.parse(localStorage.getItem('volunteer'));
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    };
}

function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    const navName = document.getElementById('navUserName');
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const navAvatar = document.getElementById('navAvatar');
    const matchScoreBadge = document.getElementById('matchScoreBadge');

    if (navName) navName.innerText = user.name;
    if (sidebarName) sidebarName.innerText = user.name;
    
    const initial = user.name.charAt(0).toUpperCase();
    if (sidebarAvatar) {
        sidebarAvatar.innerText = initial;
        sidebarAvatar.style.backgroundColor = getColorByName(user.name);
    }
    if (navAvatar) {
        navAvatar.innerText = initial;
        navAvatar.style.backgroundColor = getColorByName(user.name);
    }

    if (matchScoreBadge && volunteer) {
        matchScoreBadge.innerText = `🎯 ${volunteer.match_score || 0}% Match`;
    }
}

function getColorByName(name) {
    const colors = ['#1a237e', '#2e7d32', '#6a1b9a', '#ff6f00', '#00796b', '#c62828'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// --- PAGE UI ---

function loadPageHeader() {
    // Page subtitle update handled by loadMatchedTasks -> updatePageSubtitle
}

function showLoadingState() {
    const container = document.getElementById('taskCardsContainer');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Finding your matched tasks...</p>
            </div>
        `;
    }
}

function updatePageSubtitle(skills, location) {
    const subtitle = document.getElementById('pageSubtitle');
    if (subtitle) {
        const skillText = skills && skills.length > 0
            ? skills.join(', ')
            : 'your skills';
        const locText = location || 'your area';
        subtitle.textContent = `Showing tasks matched to your ${skillText} expertise in ${locText}`;
    }
}

// --- MAIN DATA ---

async function loadMatchedTasks() {
    const volunteer = getVolunteer()
    const skills    = volunteer.skills    || ''
    const location  = volunteer.location  || ''
    const volId     = volunteer.id        || ''

    // Show loading (already exists in UI)
    showLoadingState()

    try {
        // Build API URL with volunteer data
        const params = new URLSearchParams({
            skills      : skills,
            location    : location,
            volunteer_id: volId
        })

        const res = await fetch(
            `http://localhost:5000/api/volunteers/tasks/recommended?${params.toString()}`,
            {
                headers: getAuthHeaders()
            }
        )
        const data = await res.json()

        if (data.success && data.data.tasks.length > 0) {
            // Use tasks sorted and scored by backend
            allTasks      = data.data.tasks
            filteredTasks = [...allTasks]

            // Update page subtitle dynamically
            updatePageSubtitle(
                data.data.volunteer_skills,
                data.data.volunteer_location
            )

        } else {
            // Fallback: use smart client-side matching
            allTasks      = getClientSideMatchedTasks()
            filteredTasks = [...allTasks]
        }

    } catch (error) {
        console.error("API error, falling back to client-side matching:", error);
        // Fallback: use smart client-side matching
        allTasks      = getClientSideMatchedTasks()
        filteredTasks = [...allTasks]
    }

    // Render — UI unchanged
    renderTaskCards(filteredTasks)
    renderStatsStrip()
    renderSkillBreakdown()
    renderActiveAlerts()
}

function getClientSideMatchedTasks() {
    /*
    Client-side matching fallback when API is unavailable.
    Uses the SAME algorithm as the backend.
    Runs on mock task data.
    NO UI change — same card format.
    */
    const volunteer = getVolunteer()
    const vol_skills = (volunteer.skills || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s)

    const vol_location = (volunteer.location || '')
        .toLowerCase().trim()

    const coimbatore_district = [
        'palladam', 'ukkadam', 'peelamedu',
        'coimbatore', 'ganapathy', 'saibaba colony',
        'rs puram', 'gandhipuram', 'singanallur',
        'hopes college', 'race course'
    ]

    const priority_map = {
        'Critical': 20, 'High': 15,
        'Medium': 10, 'Low': 5
    }
    const avail_bonus = volunteer.availability === 'Available'
        ? 10 : 0

    const all_mock_tasks = getAllMockTasks()

    const scored = all_mock_tasks
        // Only Open tasks
        .filter(t => t.status === 'Open')
        .map(task => {
            const task_skills = (task.required_skills || '')
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(s => s)

            const task_location = (task.location || '')
                .toLowerCase().trim()

            // A) Skill score
            const matched = task_skills.filter(
                s => vol_skills.includes(s))
            const unmatched = task_skills.filter(
                s => !vol_skills.includes(s))
            const skill_score = task_skills.length > 0
                ? (matched.length / task_skills.length) * 50
                : 0

            // B) Location score
            let location_score = 0
            let location_match_type = 'different'
            if (task_location === vol_location) {
                location_score = 30
                location_match_type = 'exact'
            } else if (
                coimbatore_district.includes(task_location) &&
                coimbatore_district.includes(vol_location)
            ) {
                location_score = 15
                location_match_type = 'nearby'
            }

            // C) Priority score
            const priority_score =
                priority_map[task.priority] || 5

            // D) Availability bonus
            const raw = skill_score +
                        location_score +
                        priority_score +
                        avail_bonus

            const match_pct = Math.min(Math.round(raw), 100)

            return {
                ...task,
                match_percentage    : match_pct,
                matched_skills      : matched,
                unmatched_skills    : unmatched,
                location_match_type : location_match_type,
                skill_score         : Math.round(skill_score),
                location_score      : location_score,
                priority_score      : priority_score,
                availability_bonus  : avail_bonus
            }
        })
        // Filter by minimum threshold
        .filter(t => t.match_percentage >= 20)
        // Sort: match% DESC, priority, location
        .sort((a, b) => {
            if (b.match_percentage !== a.match_percentage)
                return b.match_percentage - a.match_percentage
            const pOrder = {
                Critical:4,High:3,Medium:2,Low:1
            }
            if (pOrder[b.priority] !== pOrder[a.priority])
                return pOrder[b.priority] - pOrder[a.priority]
            const lOrder = {exact:3,nearby:2,different:1}
            if (lOrder[b.location_match_type] !==
                lOrder[a.location_match_type])
                return lOrder[b.location_match_type] -
                       lOrder[a.location_match_type]
            return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0)
        })

    return scored
}

function getAllMockTasks() {
    return [
        {
            id: 1,
            title: 'Medical Camp Volunteer - Palladam',
            description: 'Weekend medical camp for elderly residents in Palladam. Doctor needed for health checkups, blood pressure monitoring, and basic prescription guidance.',
            required_skills: 'Doctor, First Aid',
            location: 'Palladam',
            priority: 'Critical',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-15',
            people_needed: 2,
            is_new: true,
            posted_ago: '1 hour ago'
        },
        {
            id: 2,
            title: 'Patient Transport Driver Needed',
            description: 'Elderly patients from Palladam need transport to Coimbatore hospital for weekly dialysis. Reliable driver needed every Tuesday and Friday.',
            required_skills: 'Driving',
            location: 'Palladam',
            priority: 'High',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-20',
            people_needed: 1,
            is_new: false,
            posted_ago: '3 hours ago'
        },
        {
            id: 3,
            title: 'Electrical Repair - Community Hall Ukkadam',
            description: 'Wiring failure causing complete power outage at Ukkadam community hall. 200+ residents affected. Urgent electrician needed.',
            required_skills: 'Electrical Work',
            location: 'Ukkadam',
            priority: 'Critical',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-12',
            people_needed: 1,
            is_new: true,
            posted_ago: '45 mins ago'
        },
        {
            id: 4,
            title: 'Flood Victim Counselling Sessions',
            description: '15 families displaced by flooding near Ukkadam require group counselling sessions over 3 weekends.',
            required_skills: 'Counselling',
            location: 'Ukkadam',
            priority: 'High',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-22',
            people_needed: 1,
            is_new: false,
            posted_ago: '2 hours ago'
        },
        {
            id: 5,
            title: 'Water Treatment Plant Support - Peelamedu',
            description: 'Severe waterlogging near Peelamedu bus stand. Water treatment specialist needed. 300 families without clean water.',
            required_skills: 'Water Treatment',
            location: 'Peelamedu',
            priority: 'Critical',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-13',
            people_needed: 1,
            is_new: true,
            posted_ago: '30 mins ago'
        },
        {
            id: 6,
            title: 'Road Damage Assessment - Peelamedu School Zone',
            description: 'Heavy rain damaged main road near Peelamedu school. Civil works volunteer needed before school reopens Monday.',
            required_skills: 'Road Work',
            location: 'Peelamedu',
            priority: 'High',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-14',
            people_needed: 2,
            is_new: true,
            posted_ago: '1 hour ago'
        },
        {
            id: 7,
            title: 'Home Visit Doctor - Palladam North',
            description: '3 bedridden elderly patients in Palladam North require home visits for health assessment and medication guidance.',
            required_skills: 'Doctor',
            location: 'Palladam',
            priority: 'Medium',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-25',
            people_needed: 1,
            is_new: false,
            posted_ago: '5 hours ago'
        },
        {
            id: 8,
            title: 'Community Health Awareness Drive',
            description: 'Monthly health awareness camp in Coimbatore. Medical volunteers needed to conduct screenings and distribute health kits.',
            required_skills: 'Doctor, Driving',
            location: 'Coimbatore',
            priority: 'Low',
            status: 'Open',
            ngo_name: 'Gavutham Foundation',
            due_date: '2026-04-30',
            people_needed: 3,
            is_new: false,
            posted_ago: '6 hours ago'
        }
    ]
}

// --- RENDERING ---

function renderTaskCards(tasks) {
    const container = document.getElementById('taskCardsContainer');
    container.innerHTML = '';

    if (tasks.length === 0) {
        showEmptyState();
        return;
    }

    tasks.forEach((task, index) => {
        const card = buildTaskCard(task);
        card.classList.add('card-hidden');
        container.appendChild(card);
    });

    animateCardsIn();
}

function buildTaskCard(task) {
    const volSkills = volunteer.skills.split(',').map(s => s.trim().toLowerCase());
    const requiredSkills = task.required_skills.split(',').map(s => s.trim());

    const isNearYou = task.location.toLowerCase() === volunteer.location.toLowerCase();
    const matchColor = getMatchColor(task.match_percentage);

    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority.toLowerCase()}`;
    if (task.accepted) card.classList.add('accepted');

    card.innerHTML = `
        ${task.accepted ? '<div class="accepted-ribbon">ACCEPTED</div>' : ''}
        <div class="card-top-row">
            <div class="badge-group">
                <span class="badge badge-priority-${task.priority.toLowerCase()}">${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}</span>
                ${task.is_new ? '<span class="badge tag-new">NEW</span>' : ''}
                ${isNearYou ? '<span class="badge tag-near-you">NEAR YOU</span>' : ''}
            </div>
            <div class="match-group" style="display:flex; align-items:center;">
                <span class="match-percentage-badge" style="background:${matchColor}">${task.match_percentage}% Match</span>
                <span class="posted-time">🕐 ${task.posted_ago}</span>
            </div>
        </div>
        <h3 class="task-title" onclick="openTaskDetailModal(${task.id})">${task.title}</h3>
        <p class="task-description-preview">${task.description}</p>
        <div class="task-info-row">
            <span>📍 ${task.location}</span>
            <span>🔧 Skills: ${task.required_skills}</span>
            <span>👤 Posted by: ${task.ngo_name || task.ngo || 'Gavutham Foundation'}</span>
        </div>
        <div class="skills-required-row">
            <span class="skill-label">Required Skills:</span>
            <div class="skill-pills-wrap">
                ${buildSkillMatchPills(task.required_skills, task.matched_skills, task.unmatched_skills)}
            </div>
        </div>
        <div class="match-bar-row">
            <span class="skill-label" style="margin-top:10px">Match Strength</span>
            <div class="match-bar-container">
                <div class="match-bar-fill" style="background:${matchColor};" data-width="${task.match_percentage}"></div>
            </div>
        </div>
        <div class="card-action-row">
            <div class="meta-info">
                <span>🏢 ${task.ngo_name || task.ngo || 'Gavutham Foundation'}</span> · 
                <span>📅 Due: ${task.due_date}</span>
            </div>
            <div class="action-btns">
                ${task.accepted ? 
                    '<span class="badge tag-new" style="background:#4caf50; padding:8px 15px">✅ Accepted</span>' : 
                    `<button class="btn-accept ${volunteer.availability === 'Busy' ? 'warning' : ''}" onclick="openAcceptModal(${task.id})">
                        ${volunteer.availability === 'Busy' ? '⚠️ You\'re Busy' : '✅ Accept Task'}
                    </button>`
                }
                <button class="btn-details" onclick="openTaskDetailModal(${task.id})">👁 View Details</button>
                <button class="btn-report" onclick="openReportModal(${task.id})">🚩 Report Issue</button>
            </div>
        </div>
    `;
    return card;
}

function buildSkillMatchPills(required_skills, matched_skills, unmatched_skills) {
    /*
    This function already exists in matched-tasks.js
    Only change: use matched_skills/unmatched_skills
    arrays from the backend response instead of
    recalculating on frontend.

    Green ✅ pill if skill is in matched_skills
    Red ❌ pill if skill is in unmatched_skills
    */

    const matched   = matched_skills || []
    const unmatched = unmatched_skills || []
    const all_skills = required_skills
        ? required_skills.split(',').map(s => s.trim())
        : []

    return all_skills.map(skill => {
        const isMatched = matched.some(
            m => m.toLowerCase() ===
                 skill.toLowerCase()
        )
        if (isMatched) {
            return `<span class="skill-pill skill-pill-matched">
                        ✅ ${skill}
                    </span>`
        } else {
            return `<span class="skill-pill skill-pill-missing">
                        ❌ ${skill}
                    </span>`
        }
    }).join('')
}

function getPriorityIcon(p) {
    const icons = { Critical: '🔴', High: '🟠', Medium: '🔵', Low: '⚪' };
    return icons[p] || '';
}

function getMatchColor(pct) {
    if (pct >= 90) return '#2e7d32'; // green
    if (pct >= 70) return '#1565c0'; // blue
    if (pct >= 50) return '#e65100'; // orange
    return '#546e7a'; // gray
}

function animateCardsIn() {
    const cards = document.querySelectorAll('.task-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('card-visible');
            const bars = card.querySelectorAll('.match-bar-fill');
            bars.forEach(bar => {
                const targetWidth = bar.getAttribute('data-width');
                bar.style.width = targetWidth + '%';
            });
        }, index * 100);
    });
}

function showEmptyState() {
    const container = document.getElementById('taskCardsContainer');
    const isFiltered = document.getElementById('searchInput').value || 
                       document.getElementById('priorityFilter').value ||
                       document.getElementById('locationFilter').value;

    if (isFiltered) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🔍</div>
                <h3>No results found</h3>
                <p>Try adjusting your filters or search term.</p>
                <button class="btn-empty" onclick="clearAllFilters()">Clear All Filters</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🎯</div>
                <h3>No Tasks Matched Yet</h3>
                <p>We couldn't find tasks matching your skills (${volunteer.skills}) in ${volunteer.location} right now.</p>
                <button class="btn-empty" onclick="refreshMatches()">🔄 Check Again</button>
                <p style="margin-top:10px">Or update your <a href="profile.html">My Profile →</a></p>
            </div>
        `;
    }
}

// --- STATS STRIP ---

function renderStatsStrip() {
    // Stats strip already renders in UI
    // Just update the COUNT values
    // NO structural change
    const total    = allTasks.length
    const critical = allTasks.filter(
        t => t.priority === 'Critical').length
    const nearYou  = allTasks.filter(
        t => t.location_match_type === 'exact').length
    const isNew    = allTasks.filter(
        t => t.is_new === true).length

    // These IDs already exist in matched-tasks.html
    const totalEl    = document.getElementById('totalMatches')
    const criticalEl = document.getElementById('criticalCount')
    const nearYouEl  = document.getElementById('nearYouCount')
    const newTodayEl = document.getElementById('newTodayCount')

    if (totalEl)    totalEl.textContent    = total
    if (criticalEl) criticalEl.textContent = critical
    if (nearYouEl)  nearYouEl.textContent  = nearYou
    if (newTodayEl) newTodayEl.textContent = isNew
}

// --- RIGHT PANEL ---

function renderSkillBreakdown() {
    // Right panel skill breakdown
    // NO UI change — same bars, same layout
    // Just update the COUNT data

    const volunteerProfile = getVolunteer()
    const vol_skills = (volunteerProfile.skills || '')
        .split(',')
        .map(s => s.trim())

    const container = document.getElementById(
        'skillBreakdownContent')
    if (!container) return

    const html = vol_skills.map((skill, i) => {
        // Count how many matched tasks need this skill
        const count = allTasks.filter(t =>
            (t.matched_skills || []).map(
                s => s.toLowerCase()
            ).includes(skill.toLowerCase())
        ).length

        const maxCount = Math.max(
            ...vol_skills.map(s =>
                allTasks.filter(t =>
                    (t.matched_skills || []).map(
                        m => m.toLowerCase()
                    ).includes(s.toLowerCase())
                ).length
            ), 1
        )

        const barWidth = Math.round(
            (count / maxCount) * 100)

        const colors = [
            '#1a237e', '#2e7d32',
            '#e65100', '#6a1b9a'
        ]
        const color = colors[i % colors.length]

        // Return same HTML structure as before
        // NO change to HTML shape
        return `
            <div class="skill-bar-row">
                <div class="skill-bar-label">
                    <span class="skill-name">${skill}</span>
                    <span class="skill-count">
                        ${count} tasks
                    </span>
                </div>
                <div class="skill-bar-track">
                    <div class="skill-bar-fill"
                         style="width:${barWidth}%;
                                background:${color}">
                    </div>
                </div>
                <p class="skill-bar-sub">
                    ${count} tasks in
                    ${volunteerProfile.location || 'your area'}
                    need this skill
                </p>
            </div>
        `
    }).join('')

    container.innerHTML = html
}

function renderQuickProfile() {
    const container = document.getElementById('quickProfileContent');
    const color = getColorByName(volunteer.name || 'V');
    const score = volunteer.match_score || 0;

    container.innerHTML = `
        <div class="quick-profile-wrap">
            <div class="profile-avatar-lg" style="background:${color}">
                ${(volunteer.name || 'V').charAt(0)}
            </div>
            <div class="profile-name">${volunteer.name}</div>
            <div class="profile-loc">📍 ${volunteer.location}</div>
            <div class="availability-badge ${volunteer.availability.toLowerCase()}">
                ${volunteer.availability}
            </div>
            <div class="match-circle-wrap">
                <div class="score-circle" style="background: conic-gradient(var(--primary) ${score}%, #eee ${score}%)">
                    <div class="score-circle-value">${score}%</div>
                </div>
                <p style="font-size:11px; margin-top:5px; color:var(--text-gray)">Overall Match</p>
            </div>
            <div class="skill-pills-wrap" style="justify-content:center">
                ${volunteer.skills.split(',').map(s => `<span class="skill-pill skill-pill-matched">${s.trim()}</span>`).join('')}
            </div>
        </div>
    `;
}

function renderActiveAlerts() {
    const critical = allTasks.filter(t => t.priority === 'Critical');
    const alertBox = document.getElementById('criticalAlertBox');
    
    if (alertBox) {
        if (critical.length > 0) {
            alertBox.style.display = 'block';
            document.getElementById('criticalAlertText').innerText = `There are ${critical.length} critical needs matching your skills in ${volunteer.location}. Your expertise is urgently required.`;
            
            const list = document.getElementById('criticalTaskList');
            if (list) {
                list.innerHTML = '';
                critical.slice(0, 3).forEach(t => {
                    const li = document.createElement('li');
                    li.innerText = t.title;
                    list.appendChild(li);
                });
            }
        } else {
            alertBox.style.display = 'none';
        }
    }
}

// --- FILTERS & SEARCH ---

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const priorityFilter = document.getElementById('priorityFilter');
    const locationFilter = document.getElementById('locationFilter');
    const skillFilter = document.getElementById('skillFilter');
    const sortFilter = document.getElementById('sortFilter');
    const clearAllBtn = document.getElementById('clearAllBtn');

    searchInput.addEventListener('input', debounce(applyFilters, 300));
    priorityFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
    skillFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
    clearAllBtn.addEventListener('click', clearAllFilters);

    // Modal close listeners
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
        }
    });
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const priority = document.getElementById('priorityFilter').value;
    const location = document.getElementById('locationFilter').value;
    const skillType = document.getElementById('skillFilter').value;
    const sort = document.getElementById('sortFilter').value;

    filteredTasks = allTasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search) || 
                              task.required_skills.toLowerCase().includes(search) ||
                              task.location.toLowerCase().includes(search);
        
        const matchesPriority = !priority || task.priority === priority;
        
        const matchesLocation = !location || task.location.toLowerCase() === location.toLowerCase();
        
        let matchesSkill = true;
        if (skillType === 'exact') {
            const volSkills = volunteer.skills.toLowerCase().split(',').map(s => s.trim());
            const reqSkills = task.required_skills.toLowerCase().split(',').map(s => s.trim());
            matchesSkill = reqSkills.every(s => volSkills.includes(s));
        }

        return matchesSearch && matchesPriority && matchesLocation && matchesSkill;
    });

    // Sorting
    if (sort === 'match') filteredTasks.sort((a,b) => b.match_percentage - a.match_percentage);
    else if (sort === 'priority') {
        const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        filteredTasks.sort((a,b) => order[b.priority] - order[a.priority]);
    }
    else if (sort === 'newest') filteredTasks.sort((a,b) => (a.is_new ? 0 : 1) - (b.is_new ? 0 : 1)); // Simplified for mock
    else if (sort === 'location') {
        filteredTasks.sort((a,b) => {
            const aNear = a.location.toLowerCase() === volunteer.location.toLowerCase();
            const bNear = b.location.toLowerCase() === volunteer.location.toLowerCase();
            return bNear - aNear;
        });
    }

    renderTaskCards(filteredTasks);
    updateFilterResultCount(filteredTasks.length);
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('skillFilter').value = '';
    document.getElementById('sortFilter').value = 'match';
    applyFilters();
}

function updateFilterResultCount(count) {
    const el = document.getElementById('filterResultCount');
    if (el) el.innerText = `${count} tasks found matching your criteria`;
}

function switchView(type) {
    const cardView = document.getElementById('cardView');
    const listView = document.getElementById('listView');
    const cardBtn = document.getElementById('cardViewBtn');
    const listBtn = document.getElementById('listViewBtn');

    if (type === 'card') {
        cardView.style.display = 'block';
        listView.style.display = 'none';
        cardBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        cardView.style.display = 'none';
        listView.style.display = 'block';
        cardBtn.classList.remove('active');
        listBtn.classList.add('active');
        renderListView(filteredTasks);
    }
}

function renderListView(tasks) {
    const body = document.getElementById('listViewBody');
    body.innerHTML = '';
    
    tasks.forEach((task, index) => {
        const tr = document.createElement('tr');
        const color = getPriorityColor(task.priority);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight:600">${task.title}</td>
            <td><span class="priority-dot" style="background:${color}"></span>${task.priority}</td>
            <td>📍 ${task.location}</td>
            <td>${task.required_skills}</td>
            <td><span class="badge" style="background:${getMatchColor(task.match_percentage)}">${task.match_percentage}%</span></td>
            <td>📅 ${task.due_date}</td>
            <td>
                <div style="display:flex; gap:5px">
                    <button class="btn-green-sm btn-sm" onclick="openAcceptModal(${task.id})">Accept</button>
                    <button class="btn-blue-outline-sm btn-sm" onclick="openTaskDetailModal(${task.id})">Details</button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

function getPriorityColor(p) {
    const colors = { Critical: '#c62828', High: '#e65100', Medium: '#1565c0', Low: '#546e7a' };
    return colors[p] || '#546e7a';
}

// --- MODALS ---

let currentTaskId = null;

function openTaskDetailModal(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    currentTaskId = id;

    document.getElementById('detailTitle').innerText = task.title;
    document.getElementById('detailPriorityBadge').innerHTML = `<span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority.toUpperCase()}</span>`;
    document.getElementById('detailMeta').innerText = `Posted by ${task.ngo} · ${task.posted_ago}`;
    
    const body = document.getElementById('taskDetailBody');
    const volSkills = volunteer.skills.toLowerCase().split(',').map(s => s.trim());
    const reqSkills = task.required_skills.split(',').map(s => s.trim());
    const matchColor = getMatchColor(task.match_percentage);

    body.innerHTML = `
        <div class="info-grid">
            <div class="info-box"><span>📍 Location</span><p>${task.location}</p></div>
            <div class="info-box"><span>📅 Due Date</span><p>${task.due_date}</p></div>
            <div class="info-box"><span>🏢 Organization</span><p>${task.ngo}</p></div>
        </div>
        <span class="detail-label">About This Task</span>
        <p class="detail-text">${task.description}</p>
        <span class="detail-label">Skills Required</span>
        <div class="skill-pills-wrap" style="margin-bottom:24px">
            ${buildSkillMatchPills(reqSkills, volSkills)}
        </div>
        <span class="detail-label">Why You Were Matched</span>
        <div class="match-analysis-wrap">
            <div class="match-circle-wrap" style="margin:0; width:60px; height:60px;">
                <div class="score-circle" style="width:60px; height:60px; background: conic-gradient(var(--primary) ${task.match_percentage}%, #eee ${task.match_percentage}%)">
                    <div class="score-circle-value" style="font-size:14px">${task.match_percentage}%</div>
                </div>
            </div>
            <div class="analysis-text">
                ${reqSkills.map(s => volSkills.includes(s.toLowerCase()) ? 
                    `<div class="analysis-item">✅ Your skill '${s}' matches this task</div>` : '').join('')}
                ${task.location.toLowerCase() === volunteer.location.toLowerCase() ? 
                    `<div class="analysis-item">✅ Your location '${volunteer.location}' matches task location</div>` : ''}
                <div class="analysis-item">ℹ️ Match strength based on skill density and location proximity</div>
            </div>
        </div>
        <div id="taskDetailMap"></div>
        <span class="detail-label">Posted By</span>
        <div style="font-size:14px; margin-bottom:10px">
            <p><strong>${task.ngo}</strong></p>
            <p style="color:var(--text-gray)">Focused on community support and disaster relief.</p>
            <a href="#" style="color:var(--primary); font-weight:600">Contact NGO</a>
        </div>
    `;

    openModal('taskDetailModal');

    // Initialize Map after modal is shown to avoid rendering issues
    setTimeout(() => {
        if (currentTaskMap) currentTaskMap.remove();
        // Mock coordinates based on location name
        const locCoords = { 'Palladam': [10.98, 77.28], 'Ukkadam': [10.99, 76.96], 'Peelamedu': [11.02, 77.01], 'Coimbatore': [11.01, 76.95] };
        const coords = locCoords[task.location] || [11.01, 76.95];
        
        currentTaskMap = L.map('taskDetailMap').setView(coords, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(currentTaskMap);
        L.marker(coords).addTo(currentTaskMap).bindPopup(task.title).openPopup();
    }, 350);

    const acceptBtn = document.getElementById('detailAcceptBtn');
    acceptBtn.onclick = () => {
        closeModal('taskDetailModal');
        openAcceptModal(id);
    };
    
    document.getElementById('detailReportLink').onclick = () => {
        closeModal('taskDetailModal');
        openReportModal(id);
    };
}

function openAcceptModal(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    currentTaskId = id;

    document.getElementById('acceptTaskTitle').innerText = task.title;
    document.getElementById('acceptInfoBox').innerHTML = `
        <div style="font-size:13px; line-height:1.6">
            📍 <strong>Location:</strong> ${task.location}<br>
            📅 <strong>Due:</strong> ${task.due_date}<br>
            🔧 <strong>Skills:</strong> ${task.required_skills}
        </div>
    `;

    const warning = document.getElementById('busyWarning');
    if (volunteer.availability === 'Busy') {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }

    document.getElementById('confirmCheckbox').checked = false;
    document.getElementById('confirmAcceptBtn').disabled = true;

    openModal('acceptModal');
}

function toggleAcceptBtn() {
    const checked = document.getElementById('confirmCheckbox').checked;
    document.getElementById('confirmAcceptBtn').disabled = !checked;
}

async function confirmAcceptTask() {
    const btn = document.getElementById('confirmAcceptBtn');
    btn.innerHTML = 'Accepting...';
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:5000/api/volunteers/tasks/accept', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ task_id: currentTaskId, volunteer_id: volunteer.id })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast("🎉 Task accepted! Check My Task History.", "success");
            closeModal('acceptModal');
            
            // Mark as accepted locally
            const taskIdx = allTasks.findIndex(t => t.id === currentTaskId);
            if (taskIdx !== -1) allTasks[taskIdx].accepted = true;
            
            applyFilters();
            renderStatsStrip();
        } else {
            showToast(data.message || "Failed to accept task", "error");
            btn.innerHTML = '✅ Confirm & Accept';
            btn.disabled = false;
        }
    } catch (error) {
        showToast("Server error. Try again later.", "error");
        btn.innerHTML = '✅ Confirm & Accept';
        btn.disabled = false;
    }
}

function openReportModal(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    currentTaskId = id;

    document.getElementById('reportTaskName').innerText = `Reporting: ${task.title}`;
    
    const pills = document.getElementById('issueTypePills');
    const types = ['Incorrect Skills', 'Wrong Location', 'Task Already Filled', 'Inappropriate', 'Other'];
    pills.innerHTML = types.map(t => `<div class="report-pill" onclick="selectReportPill(this)">${t}</div>`).join('');
    
    document.getElementById('reportDescription').value = '';
    openModal('reportModal');
}

function selectReportPill(el) {
    document.querySelectorAll('.report-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
}

async function submitReport() {
    const typePill = document.querySelector('.report-pill.active');
    const desc = document.getElementById('reportDescription').value;

    if (!typePill) {
        showToast("Please select an issue type", "warning");
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/api/volunteers/tasks/report-issue', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                task_id: currentTaskId,
                issue_type: typePill.innerText,
                description: desc
            })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast("Report submitted. Thank you for your feedback!", "success");
            closeModal('reportModal');
        } else {
            showToast("Failed to submit report", "error");
        }
    } catch (error) {
        showToast("Server error", "error");
    }
}

// --- CORE MODAL LOGIC ---

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';
}

// --- UTILS ---

function debounce(fn, delay) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, arguments), delay);
    };
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('volunteer');
    window.location.href = 'login.html';
}

async function refreshMatches() {
    const btn = document.querySelector('.btn-refresh');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Refreshing...';
    btn.disabled = true;

    await loadMatchedTasks();
    renderStatsStrip();
    renderSkillBreakdown();
    checkCriticalAlert();

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast("Matches updated!", "success");
    }, 1000);
}
