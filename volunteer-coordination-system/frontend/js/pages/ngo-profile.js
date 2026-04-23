/**
 * NGO Profile Management Logic
 */

const API_BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileData();
    
    document.getElementById('ngoProfileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('adminAccountForm').addEventListener('submit', handleProfileUpdate);
});

function checkAuth() {
    if (!token) window.location.href = 'login.html';
}

async function loadProfileData() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok) {
            const { user, ngo } = result.data;
            populateUI(user, ngo);
        } else {
            console.error("Failed to load profile:", result.message);
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }
}

function populateUI(user, ngo) {
    // Sidebar & Header info
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarAvatar').textContent = user.name.charAt(0);
    document.getElementById('profileInitials').textContent = ngo.ngo_name.charAt(0);
    document.getElementById('ngoNameText').textContent = ngo.ngo_name;
    document.getElementById('profileOrgName').textContent = ngo.ngo_name;
    
    // Quick Info
    document.getElementById('infoCity').textContent = ngo.city || 'Not Set';
    document.getElementById('infoFocus').textContent = ngo.focus_area || 'Not Set';
    document.getElementById('infoWebsite').textContent = ngo.website || 'Not Set';

    // Form fields - Organization
    document.getElementById('inputNgoName').value = ngo.ngo_name;
    document.getElementById('inputFocusArea').value = ngo.focus_area || '';
    document.getElementById('inputPhone').value = ngo.phone_number || '';
    document.getElementById('inputCity').value = ngo.city || '';
    document.getElementById('inputWebsite').value = ngo.website || '';
    document.getElementById('inputAddress').value = ngo.address || '';

    // Form fields - Admin
    document.getElementById('inputAdminName').value = user.name;
    document.getElementById('inputAdminEmail').value = user.email;
    
    // Load some stats (Mocked or fetched from dashboard stats)
    fetchImpactStats();
}

async function fetchImpactStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('statCompleted').textContent = data.data.completed_tasks;
            document.getElementById('statImpact').textContent = data.data.total_people_helped;
        }
    } catch (err) {}
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/ngo/profile`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(body)
        });
        
        const result = await response.json();
        if (response.ok) {
            alert("Profile updated successfully!");
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(result.data.user));
            localStorage.setItem('ngo', JSON.stringify(result.data.ngo));
            
            // Reload UI components
            populateUI(result.data.user, result.data.ngo);
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        alert("Server error. Please try again.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
