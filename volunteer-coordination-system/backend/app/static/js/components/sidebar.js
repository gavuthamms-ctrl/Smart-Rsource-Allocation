/**
 * Shared Sidebar Component
 * Dynamically renders the sidebar based on user role.
 */

function initSidebar() {
    const userString = localStorage.getItem('user');
    if (!userString) return;

    const user = JSON.parse(userString);
    const role = user.role || 'volunteer';
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Find the nav container (try multiple common classes)
    const nav = sidebar.querySelector('.sidebar-nav') || sidebar.querySelector('.nav-links') || sidebar.querySelector('.nav-items');
    if (!nav) return;

    // Define links for each role
    const linksByRole = {
        volunteer: [
            { label: 'Dashboard Overview', icon: '🏠', href: 'dashboard.html' },
            { label: 'My Matched Tasks', icon: '🎯', href: 'matched-tasks.html' },
            { label: 'My Task History', icon: '📋', href: 'task-history.html' },
            { label: 'Community Chatbox', icon: '💬', href: 'chatbox.html' },
            { label: 'Skill Resources', icon: '📚', href: 'resources.html' },
            { label: 'My Profile', icon: '⚙️', href: 'profile.html' }
        ],
        ngo: [
            { label: 'Dashboard', icon: '🏠', href: 'ngo-dashboard.html' },
            { label: 'Community Chatbox', icon: '💬', href: 'chatbox.html' },
            { label: 'Manage Tasks', icon: '📋', href: 'manage-tasks.html' },
            { label: 'Settings', icon: '⚙️', href: 'ngo-profile.html' }
        ],
        community: [
            { label: 'My Needs', icon: '🏠', href: 'community-dashboard.html' },
            { label: 'Community Chatbox', icon: '💬', href: 'chatbox.html' },
            { label: 'My Profile', icon: '⚙️', href: 'profile.html' }
        ],
        admin: [
            { label: 'Admin Dashboard', icon: '🏠', href: 'admin.html' },
            { label: 'User Management', icon: '👥', href: 'volunteers.html' },
            { label: 'Community Chatbox', icon: '💬', href: 'chatbox.html' },
            { label: 'Analytics', icon: '📊', href: 'analytics.html' },
            { label: 'Data Upload', icon: '📤', href: 'data-upload.html' }
        ]
    };

    const links = linksByRole[role] || linksByRole.volunteer;
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    // Render navigation
    nav.innerHTML = links.map(link => `
        <a href="${link.href}" class="nav-link ${currentPath === link.href ? 'active' : ''}">
            <span class="icon">${link.icon}</span>
            <span class="label">${link.label}</span>
        </a>
    `).join('');

    // Update user info in sidebar footer
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarName) sidebarName.textContent = user.name || 'User';
    if (sidebarAvatar) sidebarAvatar.textContent = (user.name || '?')[0].toUpperCase();
}

// Handle Logout
function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initSidebar);
