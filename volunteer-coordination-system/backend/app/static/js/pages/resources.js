/**
 * Skill Resources Page Logic
 * Pure Vanilla JavaScript
 */

// --- STATE MANAGEMENT ---
let allResources = [];
let categories = [];
let activeFilters = {
    page: 1,
    limit: 12,
    sort: 'relevant'
};
let currentView = 'grid'; // 'grid' or 'list'
let openResourceId = null;
let currentResource = null;
let searchTimeout = null;

// Quiz State
let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizTimer = null;
let quizSecondsLeft = 0;

// API Config
const API_BASE_URL = '/api'; // Adjust to your Flask URL

// --- INITIALIZATION ---
window.onload = async function() {
    if (!checkAuth()) return;
    
    initUI();
    await loadCategories();
    await loadStats();
    await loadResources();
    
    setupEventListeners();
};

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Show/Hide NGO features
    if (user.role === 'ngo') {
        document.getElementById('uploadResourceBtn').style.display = 'block';
    }
    
    return true;
}

function initUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    const volunteer = JSON.parse(localStorage.getItem('volunteer') || '{}');
    
    // Populate Sidebar & Navbar
    const avatarEls = document.querySelectorAll('#sidebarAvatar, #navbarAvatar');
    const nameEls = document.querySelectorAll('#sidebarUserName, #navbarUserName');
    const roleEls = document.querySelectorAll('#sidebarUserRole, #navbarUserRole');
    
    const initials = user.name ? user.name.charAt(0).toUpperCase() : '?';
    avatarEls.forEach(el => el.textContent = initials);
    nameEls.forEach(el => el.textContent = user.name);
    roleEls.forEach(el => el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));
    
    // Sidebar Match Badge
    if (user.role === 'volunteer' && volunteer.match_score) {
        document.getElementById('sidebarMatchBadge').style.display = 'block';
        document.getElementById('sidebarMatchVal').textContent = volunteer.match_score;
    }

    // Personalized Hero
    if (user.role === 'volunteer' && volunteer.skills) {
        document.getElementById('heroSubtitle').textContent = `Resources curated for your ${volunteer.skills} expertise`;
        const skills = volunteer.skills.split(',').map(s => s.trim());
        const skillsContainer = document.getElementById('heroSkillsContainer');
        skillsContainer.innerHTML = '';
        skills.forEach(skill => {
            const pill = document.createElement('span');
            pill.className = 'skill-pill';
            pill.textContent = skill;
            pill.onclick = () => setSearch(skill);
            skillsContainer.appendChild(pill);
        });
    } else {
        document.getElementById('heroSubtitle').textContent = 'Resources for all social impact volunteers';
    }
}

// --- DATA FETCHING ---

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    if (options.body instanceof FormData) {
        delete mergedOptions.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        return null;
    }
}

async function loadCategories() {
    const response = await apiFetch('/resources/categories');
    if (response) {
        categories = response.data.categories;
        renderFilterCategories();
        populateUploadCategories();
    }
}

async function loadStats() {
    const response = await apiFetch('/resources/stats');
    if (response) {
        const stats = response.data;
        animateValue('statTotalResources', stats.total_resources);
        animateValue('statCompleted', stats.completed);
        animateValue('statBookmarked', stats.bookmarked);
        animateValue('statMatched', stats.skill_matched);
    }
}

async function loadResources() {
    toggleLoading(true);
    
    const params = new URLSearchParams(activeFilters);
    const response = await apiFetch(`/resources?${params.toString()}`);
    
    toggleLoading(false);
    
    if (response) {
        allResources = response.data;
        renderResources();
        renderPagination(response.pagination);
        updateResultCount(response.pagination.total);
    }
}

// --- RENDERING ---

function renderResources() {
    const grid = document.getElementById('resourcesGrid');
    const list = document.getElementById('resourcesListBody');
    const featuredSection = document.getElementById('featuredSection');
    const gridContainer = grid.parentElement;
    const listContainer = document.getElementById('listViewContainer');

    grid.innerHTML = '';
    list.innerHTML = '';
    
    if (allResources.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        featuredSection.style.display = 'none';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';

    // Show Featured only if no active search/filter and on first page
    const isFiltered = Object.keys(activeFilters).length > 2; // page and limit ALWAYS exist
    if (!isFiltered && activeFilters.page === 1) {
        featuredSection.style.display = 'block';
        renderFeatured();
    } else {
        featuredSection.style.display = 'none';
    }

    if (currentView === 'grid') {
        gridContainer.style.display = 'block';
        listContainer.style.display = 'none';
        allResources.forEach((res, index) => {
            grid.appendChild(createResourceCard(res, index));
        });
    } else {
        gridContainer.style.display = 'none';
        listContainer.style.display = 'block';
        allResources.forEach(res => {
            list.appendChild(createResourceRow(res));
        });
    }
}

function renderFeatured() {
    const featuredGrid = document.getElementById('featuredGrid');
    const featured = allResources.filter(r => r.is_featured).slice(0, 3);
    
    featuredGrid.innerHTML = '';
    featured.forEach((res, index) => {
        featuredGrid.appendChild(createResourceCard(res, index, true));
    });
}

function createResourceCard(res, index, isFeatured = false) {
    const volunteer = JSON.parse(localStorage.getItem('volunteer') || '{}');
    const volunteerSkills = (volunteer.skills || '').split(',').map(s => s.trim().toLowerCase());
    
    const card = document.createElement('div');
    card.className = `resource-card ${isFeatured ? 'featured' : ''}`;
    card.style.animationDelay = `${index * 0.05}s`;
    
    const isSkillMatch = res.skill_tags.some(tag => volunteerSkills.includes(tag.toLowerCase()));
    const bookmarkActive = res.is_bookmarked ? 'active' : '';
    
    card.innerHTML = `
        <button class="bookmark-icon-btn ${bookmarkActive}" onclick="toggleBookmark(${res.id}, event)">
            ${res.is_bookmarked ? '🔖' : '🔖'}
        </button>
        <div class="card-top">
            <span class="card-type ${res.resource_type}">
                ${getTypeIcon(res.resource_type)} ${res.resource_type}
            </span>
            <span class="card-difficulty diff-${res.difficulty}">${res.difficulty}</span>
        </div>
        <h4 class="card-title" onclick="openResource(${res.id})">${res.title}</h4>
        <p class="card-desc">${res.description}</p>
        <div class="card-meta">
            <div class="meta-item">🕐 ${res.duration_mins}m</div>
            <div class="meta-item">👁️ ${res.view_count}</div>
            <div class="meta-item">⭐ ${res.avg_rating}</div>
        </div>
        <div class="card-skills">
            ${res.skill_tags.map(tag => {
                const matched = volunteerSkills.includes(tag.toLowerCase()) ? 'matched' : '';
                return `<span class="card-skill-tag ${matched}">${tag}</span>`;
            }).join('')}
        </div>
        
        ${res.progress_status !== 'not_started' ? `
            <div class="card-status-text status-${res.progress_status.replace('_', '-')}">
                ${res.progress_status === 'completed' ? '✅ Completed' : `⏩ ${res.progress_pct}% In Progress`}
            </div>
            <div class="card-progress-container">
                <div class="card-progress-bar ${res.progress_status}" style="width: ${res.progress_pct}%"></div>
            </div>
        ` : ''}

        <div class="card-footer">
            <span class="uploader">by ${res.uploaded_by_name}</span>
            <button class="btn-start-resource ${getBtnClass(res.progress_status)}" onclick="openResource(${res.id})">
                ${getBtnText(res.progress_status, res.resource_type)}
            </button>
        </div>
    `;
    
    return card;
}

function createResourceRow(res) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong class="clickable" onclick="openResource(${res.id})">${res.title}</strong></td>
        <td><span class="card-type ${res.resource_type}">${getTypeIcon(res.resource_type)} ${res.resource_type}</span></td>
        <td>${res.category_name}</td>
        <td><span class="card-difficulty diff-${res.difficulty}">${res.difficulty}</span></td>
        <td>⭐ ${res.avg_rating}</td>
        <td>${res.progress_status === 'completed' ? '✅ Done' : res.progress_status === 'in_progress' ? `${res.progress_pct}%` : '-'}</td>
        <td>
            <button class="btn-icon" onclick="toggleBookmark(${res.id}, event)">${res.is_bookmarked ? '🔖' : '🔖'}</button>
            <button class="btn-icon" onclick="openResource(${res.id})">👁️</button>
        </td>
    `;
    return tr;
}

function renderFilterCategories() {
    const list = document.getElementById('categoryFilterList');
    list.innerHTML = '';
    
    const volunteer = JSON.parse(localStorage.getItem('volunteer') || '{}');
    const volunteerSkills = (volunteer.skills || '').toLowerCase().split(',').map(s => s.trim());

    categories.forEach(cat => {
        const isMatch = volunteerSkills.some(skill => cat.skill_tag && cat.skill_tag.toLowerCase().includes(skill));
        
        const item = document.createElement('label');
        item.className = 'checkbox-item';
        item.innerHTML = `
            <input type="checkbox" class="cat-check" value="${cat.id}" onchange="handleFilterUpdate()">
            <span class="cat-label">${cat.icon} ${cat.name}</span>
            ${isMatch ? '<span class="skill-match-tag">✨ Match</span>' : ''}
            <span class="cat-count">${cat.resource_count}</span>
        `;
        list.appendChild(item);
    });
}

function renderPagination(pagination) {
    const bar = document.getElementById('paginationBar');
    bar.innerHTML = '';
    
    if (pagination.pages <= 1) return;
    
    // Previous
    const prev = document.createElement('button');
    prev.className = 'page-link';
    prev.innerHTML = '←';
    prev.disabled = pagination.page === 1;
    prev.onclick = () => goToPage(pagination.page - 1);
    bar.appendChild(prev);
    
    // Pages
    for (let i = 1; i <= pagination.pages; i++) {
        const p = document.createElement('button');
        p.className = `page-link ${pagination.page === i ? 'active' : ''}`;
        p.textContent = i;
        p.onclick = () => goToPage(i);
        bar.appendChild(p);
    }
    
    // Next
    const next = document.createElement('button');
    next.className = 'page-link';
    next.innerHTML = '→';
    next.disabled = pagination.page === pagination.pages;
    next.onclick = () => goToPage(pagination.page + 1);
    bar.appendChild(next);
}

// --- FILTERING & SEARCH ---

function handleFilterUpdate() {
    // Show active filter pills
    updateResultPills(); 
    
    // Auto-apply for live filtering
    applyFilters();
}

function updateResultPills() {
    const list = document.getElementById('activeFiltersList');
    list.innerHTML = '';
    
    // Search pill
    const search = document.getElementById('searchInput').value.trim();
    if (search) {
        list.appendChild(createPill(`Search: ${search}`, () => {
            document.getElementById('searchInput').value = '';
            applyFilters();
        }));
    }
    
    // Category pills
    document.querySelectorAll('.cat-check:checked').forEach(cb => {
        const label = cb.parentElement.querySelector('.cat-label').textContent;
        list.appendChild(createPill(label, () => {
            cb.checked = false;
            applyFilters();
        }));
    });
    
    // Difficulty pills
    document.querySelectorAll('.diff-check:checked').forEach(cb => {
        const label = cb.parentElement.textContent.trim();
        list.appendChild(createPill(label, () => {
            cb.checked = false;
            applyFilters();
        }));
    });

    // Type pills
    const type = document.querySelector('input[name="resType"]:checked').value;
    if (type !== 'all') {
        list.appendChild(createPill(`Type: ${type}`, () => {
            document.querySelector('input[name="resType"][value="all"]').checked = true;
            applyFilters();
        }));
    }
}

function createPill(text, onRemove) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.innerHTML = `${text} <span class="remove-filter">✕</span>`;
    pill.querySelector('.remove-filter').onclick = (e) => {
        e.stopPropagation();
        onRemove();
    };
    return pill;
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.trim();
    const categories = Array.from(document.querySelectorAll('.cat-check:checked')).map(cb => cb.value);
    const type = document.querySelector('input[name="resType"]:checked').value;
    const diffs = Array.from(document.querySelectorAll('.diff-check:checked')).map(cb => cb.value);
    const sort = document.getElementById('sortSelect').value;
    const isBookmarked = document.getElementById('bookmarkToggle').checked;
    const isSkillMatched = document.getElementById('skillMatchToggle').checked;

    activeFilters = {
        page: 1,
        limit: 12,
        search: search,
        category_id: categories.join(','),
        resource_type: type === 'all' ? '' : type,
        difficulty: diffs.join(','),
        sort: sort,
        bookmarked: isBookmarked ? 'true' : '',
        skill_match: isSkillMatched ? volunteer.skills : ''
    };

    loadResources();
    updateResultPills(); // Sync pills
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.cat-check, .diff-check').forEach(cb => cb.checked = false);
    document.querySelector('input[name="resType"][value="all"]').checked = true;
    document.getElementById('sortSelect').value = 'relevant';
    document.getElementById('bookmarkToggle').checked = false;
    document.getElementById('skillMatchToggle').checked = false;
    
    applyFilters();
}

function setSearch(term) {
    document.getElementById('searchInput').value = term;
    applyFilters();
}

function debounceSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 400);
}

// --- RESOURCE VIEWER ---

async function openResource(id) {
    toggleLoading(true);
    const response = await apiFetch(`/resources/${id}`);
    toggleLoading(false);
    
    if (response) {
        currentResource = response.data.resource;
        openResourceId = id;
        
        // Record View
        apiFetch(`/resources/${id}/view`, { method: 'POST' });
        
        renderResourceModalContent(currentResource);
        openModal('resourceModal');
        
        // If not started, mark as in progress
        if (currentResource.progress_status === 'not_started') {
            saveProgress(id, 'in_progress', 0);
        }
    }
}

function renderResourceModalContent(res) {
    const modal = document.getElementById('resourceModal');
    
    // Header
    document.getElementById('modalTitle').textContent = res.title;
    document.getElementById('modalCategoryBadge').textContent = res.category_name;
    document.getElementById('modalCategoryBadge').style.backgroundColor = res.category_color;
    document.getElementById('modalTypeBadge').textContent = res.resource_type.toUpperCase();
    document.getElementById('modalDiffBadge').textContent = res.difficulty;
    document.getElementById('modalDuration').textContent = `🕐 ${res.duration_mins} mins`;
    
    const bookmarkBtn = document.getElementById('modalBookmarkBtn');
    bookmarkBtn.textContent = res.is_bookmarked ? '🔖 Saved' : '🔖 Bookmark';
    bookmarkBtn.classList.toggle('active', res.is_bookmarked);

    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (res.file_url) {
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => downloadResource(res.id, res.file_url);
    } else {
        downloadBtn.style.display = 'none';
    }

    // Body
    const body = document.getElementById('resourceModalBody');
    body.innerHTML = '';
    
    if (res.resource_type === 'video' && res.file_url) {
        body.innerHTML = `
            <div class="video-wrapper">
                <iframe src="${res.file_url}" frameborder="0" allowfullscreen></iframe>
            </div>
            <div class="content-renderer">
                <h2>Overview</h2>
                <p>${res.description}</p>
            </div>
        `;
    } else if (res.resource_type === 'quiz') {
        body.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🎯</span>
                <h2>Knowledge Check: ${res.title}</h2>
                <p>Test your understanding of this topic. You have 3 minutes to complete the quiz.</p>
                <button class="upload-btn" onclick="startQuiz(${res.id})">Start Quiz Now</button>
            </div>
        `;
    } else if (res.content) {
        body.innerHTML = `
            <div class="content-renderer" id="articleRenderer">
                ${parseMarkdown(res.content)}
            </div>
        `;
        setupReadingTracker();
    } else {
        body.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">${getTypeIcon(res.resource_type)}</span>
                <p>${res.description}</p>
                ${res.file_url ? `<button class="upload-btn" onclick="downloadResource(${res.id}, '${res.file_url}')">Download Resource</button>` : ''}
            </div>
        `;
    }

    // Footer
    document.getElementById('modalUploaderInfo').textContent = `Uploaded by ${res.uploaded_by_name} • ${new Date(res.created_at).toLocaleDateString()}`;
    document.getElementById('modalRatingDisplay').textContent = `⭐ ${res.avg_rating} (${res.rating_count} ratings)`;
    
    const completeBtn = document.getElementById('markCompleteBtn');
    if (res.progress_status === 'completed') {
        completeBtn.textContent = '✅ Completed';
        completeBtn.disabled = true;
        completeBtn.classList.add('completed');
    } else {
        completeBtn.textContent = '✅ Mark as Complete';
        completeBtn.disabled = false;
        completeBtn.classList.remove('completed');
    }
}

async function downloadResource(resourceId, fileUrl) {
    if (!fileUrl) {
        showToast('No downloadable file available for this resource.', 'error');
        return;
    }

    // API Call to increment download counter
    try {
        await apiFetch(`/resources/${resourceId}/download`, { method: 'POST' });
    } catch (err) {
        console.error('Failed to track download:', err);
    }

    // Trigger actual file download
    const baseUrl = '';
    window.open(baseUrl + fileUrl, '_blank');
}

// --- QUIZ LOGIC ---

async function startQuiz(id) {
    closeModal('resourceModal');
    toggleLoading(true);
    const response = await apiFetch(`/resources/${id}/quiz`);
    toggleLoading(false);
    
    if (response) {
        quizQuestions = response.data.questions;
        quizCurrentIndex = 0;
        quizScore = 0;
        quizSecondsLeft = 180; // 3 mins
        
        openModal('quizModal');
        document.getElementById('quizTitle').textContent = currentResource.title;
        renderQuizQuestion();
        startQuizTimer();
    }
}

function startQuizTimer() {
    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
        quizSecondsLeft--;
        const mins = Math.floor(quizSecondsLeft / 60);
        const secs = quizSecondsLeft % 60;
        document.getElementById('quizTimer').textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
        
        if (quizSecondsLeft <= 0) {
            clearInterval(quizTimer);
            handleQuizFinish();
        }
    }, 1000);
}

function renderQuizQuestion() {
    const q = quizQuestions[quizCurrentIndex];
    document.getElementById('quizProgressText').textContent = `Question ${quizCurrentIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('quizProgressBar').style.width = `${((quizCurrentIndex) / quizQuestions.length) * 100}%`;
    
    const body = document.getElementById('quizContent');
    body.innerHTML = `
        <div class="quiz-question">${q.question}</div>
        <div class="quiz-options">
            <button class="quiz-opt" onclick="checkAnswer('a')">A) ${q.options.a}</button>
            <button class="quiz-opt" onclick="checkAnswer('b')">B) ${q.options.b}</button>
            <button class="quiz-opt" onclick="checkAnswer('c')">C) ${q.options.c}</button>
            <button class="quiz-opt" onclick="checkAnswer('d')">D) ${q.options.d}</button>
        </div>
        <div id="quizFeedback" style="display:none"></div>
    `;
    
    document.getElementById('nextQuestionBtn').disabled = true;
}

function checkAnswer(ans) {
    const q = quizQuestions[quizCurrentIndex];
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(btn => btn.disabled = true);
    
    const correctBtn = Array.from(opts).find(btn => btn.textContent.startsWith(q.correct_ans.toUpperCase()));
    const chosenBtn = Array.from(opts).find(btn => btn.textContent.startsWith(ans.toUpperCase()));

    if (ans === q.correct_ans) {
        quizScore++;
        chosenBtn.classList.add('correct');
    } else {
        chosenBtn.classList.add('wrong');
        correctBtn.classList.add('correct');
    }
    
    const feedback = document.getElementById('quizFeedback');
    feedback.innerHTML = `
        <div class="quiz-explanation">
            <strong>${ans === q.correct_ans ? '✅ Correct!' : '❌ Incorrect.'}</strong>
            <p>${q.explanation}</p>
        </div>
    `;
    feedback.style.display = 'block';
    
    document.getElementById('nextQuestionBtn').disabled = false;
    document.getElementById('nextQuestionBtn').textContent = (quizCurrentIndex === quizQuestions.length - 1) ? 'Finish Quiz' : 'Next Question';
}

function handleNextQuestion() {
    quizCurrentIndex++;
    if (quizCurrentIndex < quizQuestions.length) {
        renderQuizQuestion();
    } else {
        handleQuizFinish();
    }
}

async function handleQuizFinish() {
    clearInterval(quizTimer);
    const pct = Math.round((quizScore / quizQuestions.length) * 100);
    
    const body = document.getElementById('quizContent');
    body.innerHTML = `
        <div class="empty-state">
            <div class="score-circle">
                <span style="font-size: 40px; font-weight: 700;">${pct}%</span>
            </div>
            <h2>Quiz Complete!</h2>
            <p>You scored ${quizScore} out of ${quizQuestions.length}</p>
            <div class="mt-3">
                ${pct >= 70 ? '🏆 <strong>Expert Level! Great job!</strong>' : '📖 <strong>Good effort! Review the guide to improve.</strong>'}
            </div>
            <button class="upload-btn mt-3" onclick="closeModal('quizModal'); loadResources();">Finish knowledge Check</button>
        </div>
    `;
    document.getElementById('quizFooter').style.display = 'none';
    
    // Save progress as completed if score > 70
    if (pct >= 70) {
        saveProgress(openResourceId, 'completed', 100);
    }
}

// --- BOOKMARKS & RATINGS ---

async function toggleBookmark(id, event) {
    if (event) event.stopPropagation();
    
    const response = await apiFetch(`/resources/${id}/bookmark`, { method: 'POST' });
    if (response) {
        const action = response.data.action;
        showToast(`Resource ${action === 'added' ? 'bookmarked' : 'removed'}`, 'success');
        
        // Update local state if needed OR just reload stats and data
        loadStats();
        loadResources();
        
        if (openResourceId === id) {
             const btn = document.getElementById('modalBookmarkBtn');
             btn.textContent = action === 'added' ? '🔖 Saved' : '🔖 Bookmark';
             btn.classList.toggle('active', action === 'added');
        }
    }
}

function openRatingModalFromResource() {
    const ratingModal = document.getElementById('ratingModal');
    document.getElementById('ratingResourceTitle').textContent = currentResource.title;
    
    // Reset stars
    const stars = document.querySelectorAll('.star');
    stars.forEach(s => s.classList.remove('active'));
    document.getElementById('ratingLabel').textContent = 'Select your rating';
    document.getElementById('submitRatingBtn').disabled = true;
    
    openModal('ratingModal');
}

// Star Selection Handling
let selectedRating = 0;
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('starSelector').addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            selectedRating = parseInt(e.target.dataset.value);
            const stars = document.querySelectorAll('.star');
            stars.forEach((s, idx) => {
                s.classList.toggle('active', idx < selectedRating);
            });
            
            const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
            document.getElementById('ratingLabel').textContent = labels[selectedRating];
            document.getElementById('submitRatingBtn').disabled = false;
        }
    });
});

async function submitRating() {
    const review = document.getElementById('ratingReview').value;
    const response = await apiFetch(`/resources/${openResourceId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating: selectedRating, review: review })
    });
    
    if (response) {
        showToast('Rating submitted! Thank you.', 'success');
        closeModal('ratingModal');
        // Update view
        if (currentResource) {
            document.getElementById('modalRatingDisplay').textContent = `⭐ ${response.data.avg_rating} (${response.data.rating_count} ratings)`;
        }
        loadResources();
    }
}

// --- PROGRESS TRACKING ---

async function saveProgress(id, status, pct) {
    await apiFetch(`/resources/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ status: status, progress_pct: pct })
    });
}

async function markAsComplete() {
    await saveProgress(openResourceId, 'completed', 100);
    showToast('Resource marked as complete! ✅', 'success');
    
    const btn = document.getElementById('markCompleteBtn');
    btn.textContent = '✅ Completed';
    btn.disabled = true;
    btn.classList.add('completed');
    
    loadStats();
    loadResources();
}

function setupReadingTracker() {
    const modalBody = document.getElementById('resourceModal');
    const progressBar = document.getElementById('readingProgressBar');
    
    // Use the actual container that's scrolling
    const scrollContainer = modalBody.querySelector('.modal-box');
    
    scrollContainer.onscroll = () => {
        const winScroll = scrollContainer.scrollTop;
        const height = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + "%";
        
        // If scrolled > 80% and not completed, mark as partially done?
        // Simpler: just use reading as activity.
    };
}

// --- NGO UPLOAD ---

function openUploadModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user.role !== 'ngo') return;
    
    // Clear form
    document.getElementById('uploadForm').reset();
    handleUploadTypeChange();
    openModal('uploadModal');
}

function handleUploadTypeChange() {
    const type = document.getElementById('uploadType').value;
    const contentSec = document.getElementById('uploadContentSection');
    const fileSec = document.getElementById('uploadFileSection');
    const urlSec = document.getElementById('uploadUrlSection');
    
    contentSec.style.display = (type === 'guide' || type === 'article') ? 'block' : 'none';
    fileSec.style.display = (type === 'pdf' || type === 'checklist' || type === 'template') ? 'block' : 'none';
    urlSec.style.display = (type === 'video') ? 'block' : 'none';
    
    if (type === 'quiz') {
        showToast('Please upload title first, then add questions in Management Panel.', 'info');
    }
}

async function handleUploadSubmit() {
    const form = document.getElementById('uploadForm');
    const formData = new FormData();
    
    formData.append('title', document.getElementById('uploadTitle').value);
    formData.append('description', document.getElementById('uploadDesc').value);
    formData.append('category_id', document.getElementById('uploadCategory').value);
    formData.append('resource_type', document.getElementById('uploadType').value);
    formData.append('difficulty', document.getElementById('uploadDifficulty').value);
    formData.append('duration_mins', document.getElementById('uploadDuration').value);
    formData.append('skill_tags', document.getElementById('uploadSkills').value);
    formData.append('is_featured', document.getElementById('uploadFeatured').checked);
    
    const type = document.getElementById('uploadType').value;
    if (type === 'guide' || type === 'article') {
        formData.append('content', document.getElementById('uploadContent').value);
    } else if (type === 'pdf' || type === 'checklist' || type === 'template') {
        const fileInput = document.getElementById('uploadFile');
        if (fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
    } else if (type === 'video') {
        formData.append('file_url', document.getElementById('uploadUrl').value);
    }

    toggleLoading(true);
    const response = await apiFetch('/resources/upload', {
        method: 'POST',
        body: formData
    });
    toggleLoading(false);
    
    if (response) {
        showToast('Resource uploaded successfully!', 'success');
        closeModal('uploadModal');
        loadResources();
        loadStats();
    }
}

// --- HELPERS ---

function toggleLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
}

function updateResultCount(total) {
    document.getElementById('resultCountText').textContent = `Showing ${allResources.length} of ${total} resources`;
}

function toggleView(view) {
    currentView = view;
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    renderResources();
}

function goToPage(page) {
    activeFilters.page = page;
    loadResources();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getTypeIcon(type) {
    const icons = {
        guide: '📖',
        pdf: '📄',
        video: '🎬',
        quiz: '🎯',
        checklist: '✅',
        template: '📋',
        article: '📝'
    };
    return icons[type] || '📄';
}

function getBtnClass(status) {
    if (status === 'completed') return 'btn-completed';
    if (status === 'in_progress') return 'btn-in-progress';
    return 'btn-not-started';
}

function getBtnText(status, type) {
    if (status === 'completed') return '✅ Review';
    if (status === 'in_progress') return '⏩ Continue';
    return type === 'quiz' ? '🎯 Take Quiz' : '▶️ Start';
}

function animateValue(id, target) {
    const el = document.getElementById(id);
    let current = 0;
    const step = Math.ceil(target / 20) || 1;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = current;
        }
    }, 30);
}

function parseMarkdown(text) {
    // Very simple MD parser for bold and headers
    return text
        .replace(/# (.*)/g, '<h1>$1</h1>')
        .replace(/## (.*)/g, '<h2>$1</h2>')
        .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (id === 'quizModal') {
        clearInterval(quizTimer);
        document.getElementById('quizFooter').style.display = 'flex';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function populateUploadCategories() {
    const select = document.getElementById('uploadCategory');
    select.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(opt);
    });
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function setupEventListeners() {
    // Menu toggle for mobile
    document.getElementById('menuToggle').onclick = () => {
        document.querySelector('.sidebar').classList.toggle('mobile-active');
    };
    
    // File input name display
    const fileInput = document.getElementById('uploadFile');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const fileName = e.target.files[0]?.name || '';
            document.getElementById('fileNameDisplay').textContent = fileName;
        };
    }
}
