/**
 * Community Profile Page Logic
 */

let currentUser = null;
let currentCommunity = null;

window.onload = async function() {
    checkAuth();
    currentUser = JSON.parse(localStorage.getItem('user'));
    currentCommunity = JSON.parse(localStorage.getItem('community'));
    
    updateHeader();
    populateForm();
    await loadActivityHistory();
};

function checkAuth() {
    if (!localStorage.getItem('token')) window.location.href = 'login.html';
}

function updateHeader() {
    document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
    document.getElementById('p-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('p-city').textContent = currentCommunity.city;
}

function populateForm() {
    document.getElementById('editFirstName').value = currentUser.name.split(' ')[0] || '';
    document.getElementById('editLastName').value = currentUser.name.split(' ').slice(1).join(' ') || '';
    document.getElementById('editEmail').value = currentUser.email;
    document.getElementById('editPhone').value = currentCommunity.phone_number;
    document.getElementById('editAddress').value = currentCommunity.address;
    document.getElementById('editCity').value = currentCommunity.city;
    document.getElementById('editNeeds').value = currentCommunity.needs;
    
    const prioRadios = document.getElementsByName('priority');
    prioRadios.forEach(radio => {
        if (radio.value === currentCommunity.priority) radio.checked = true;
    });
}

async function saveProfile() {
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const phone = document.getElementById('editPhone').value;
    const address = document.getElementById('editAddress').value;
    const needs = document.getElementById('editNeeds').value;
    
    let priority = 'Low';
    const prioRadios = document.getElementsByName('priority');
    prioRadios.forEach(radio => { if (radio.checked) priority = radio.value; });

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const response = await fetch('http://localhost:5000/api/community/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name: `${firstName} ${lastName}`.trim(),
                phone_number: phone,
                address: address,
                needs: needs,
                priority: priority
            })
        });

        const data = await response.json();
        if (data.success) {
            showToast("Profile updated successfully!", "success");
            // Update local storage
            currentUser.name = `${firstName} ${lastName}`.trim();
            currentCommunity.phone_number = phone;
            currentCommunity.address = address;
            currentCommunity.needs = needs;
            currentCommunity.priority = priority;
            
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('community', JSON.stringify(currentCommunity));
            
            updateHeader();
        } else {
            showToast(data.message || "Failed to update profile", "error");
        }
    } catch (err) {
        showToast("Server error", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

async function loadActivityHistory() {
    const list = document.getElementById('activityHistoryList');
    list.innerHTML = `
        <div style="border-left: 2px solid #eee; padding-left: 20px; margin-left: 10px;">
            <div style="position: relative; margin-bottom: 24px;">
                <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--community-light);"></div>
                <div style="font-size: 14px; font-weight: 600;">Profile Updated</div>
                <div style="font-size: 12px; color: #999;">Just now</div>
            </div>
            <div style="position: relative; margin-bottom: 24px;">
                <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: #ddd;"></div>
                <div style="font-size: 14px; font-weight: 600;">Need Submitted</div>
                <div style="font-size: 12px; color: #999;">2 days ago</div>
            </div>
            <div style="position: relative;">
                <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: #ddd;"></div>
                <div style="font-size: 14px; font-weight: 600;">Account Created</div>
                <div style="font-size: 12px; color: #999;">Oct 2026</div>
            </div>
        </div>
    `;
}

function showToast(msg, type) {
    const container = document.getElementById('toastWrapper');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
