/**
 * Smart Resource Allocation - NGO Resource Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileInfo();
    fetchResources();
    fetchCategories();
    fetchResourceStats();

    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
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
 * Fetch and Render Resources
 */
async function fetchResources() {
    const search = document.getElementById('resSearch').value;
    const cat = document.getElementById('catFilter').value;
    const type = document.getElementById('typeFilter').value;
    const owner = document.getElementById('ownerFilter').value;

    const params = new URLSearchParams({ search, category: cat, type, owner });

    try {
        const response = await fetch(`${API_BASE_URL}/resources?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            renderResources(data.data);
        }
    } catch (err) { console.error(err); }
}

function renderResources(resources) {
    const container = document.getElementById('resGrid');
    container.innerHTML = '';

    resources.forEach(r => {
        const card = document.createElement('div');
        card.className = `res-card ${r.resource_type}`;
        
        const icon = r.resource_type === 'video' ? '🎬' : (r.resource_type === 'pdf' ? '📄' : '📖');
        
        card.innerHTML = `
            <div class="res-thumb">${icon}</div>
            <div class="res-body">
                <span class="res-cat">${r.category_name}</span>
                <span class="res-title">${r.title}</span>
                <div class="res-meta">
                    <span>👁 ${r.view_count || 0} views</span>
                    <span>⭐ ${r.rating || 4.5}</span>
                    <span>${r.difficulty}</span>
                </div>
            </div>
            <div class="res-actions">
                <button class="btn-outline small" onclick="editResource(${r.id})">✏️ Edit</button>
                <button class="btn-primary small" onclick="deleteResource(${r.id})" style="background:#f44336">🗑 Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Fetch Stats
 */
async function fetchResourceStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ngo/reports/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('totalLibrary').textContent = 14; // Mock
            document.getElementById('totalViews').textContent = 1245; // Mock
            document.getElementById('avgRating').textContent = '4.7'; // Mock
            document.getElementById('feedbackCount').textContent = 28; // Mock
        }
    } catch (err) { console.error(err); }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/resources/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const filters = document.getElementById('catFilter');
            const selects = document.getElementById('uploadCatSelect');
            data.data.forEach(c => {
                filters.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                selects.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    } catch (err) { console.error(err); }
}

/**
 * Handle Upload
 */
async function handleUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE_URL}/resources/create`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            alert("Resource published!");
            closeModal('uploadModal');
            fetchResources();
        }
    } catch (err) { console.error(err); }
}

function openUploadModal() { document.getElementById('uploadModal').style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }

async function deleteResource(id) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert("Resource deleted!");
            fetchResources();
        }
    } catch (err) { console.error(err); }
}
