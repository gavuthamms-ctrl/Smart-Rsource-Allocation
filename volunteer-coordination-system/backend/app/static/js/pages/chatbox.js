/**
 * COMMUNITY CHATBOX LOGIC - LIVE & DYNAMIC
 * Supports Volunteer, NGO, and Community Member roles.
 */

// ══════════════════════════════════════════════
// STATE VARIABLES
// ══════════════════════════════════════════════
let currentRoomId = null
let currentUser = null
let allRooms = []
let allMessages = {}
let pollingInterval = null
let isUrgentMode = false
let isAnnounceMode = false
let replyToId = null
let replyToSender = null
let replyToPreview = null
let typingTimeout = null
let emojiPickerOpen = false
let selectedUrgency = 'critical'
let lastMessageTimestamps = {}

// Emoji sets
const EMOJI_SETS = {
    smileys: ['😊', '😂', '😍', '🥰', '😎', '🤔', '😢',
        '😡', '🤗', '😴', '🤯', '😇', '🥳', '😤',
        '🙄', '😬', '🤭', '😏', '😳', '🥺'],
    gestures: ['👍', '👎', '👋', '🤝', '🙌', '👏', '💪',
        '🙏', '👌', '✌️', '🤞', '🖐️', '👈', '👉',
        '☝️', '🤜', '🤛', '🤙', '👐', '🤲'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤',
        '🤍', '💕', '💞', '💓', '💗', '💖', '💘',
        '💝', '❣️', '💔', '🔥', '✨', '⭐'],
    objects: ['🏆', '🎯', '🚨', '📢', '✅', '❌', '⚡',
        '🔥', '📋', '🗺️', '💬', '📞', '🏥', '🚑',
        '🔧', '🩺', '🛠️', '📱', '💡', '🎁'],
    nature: ['🌍', '🌱', '🌊', '⛅', '🌈', '🌸', '🍃',
        '🌺', '🦋', '🐾', '🌻', '🍀', '🌾', '🌿',
        '🏔️', '🌴', '🐬', '🦁', '🌙', '☀️']
}

// ══════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════
window.onload = function () {
    checkAuth()
    currentUser = getCurrentUser()
    buildSidebar()
    buildNavbar()
    loadRooms()
    loadOnlineMembers()
    loadActiveAlerts()
    loadPinnedMessages()
    buildQuickActions()
    buildRoleSpecificSection()
    selectRoom(getDefaultRoomId())
    startPolling()
    buildRoomsUserCard()
}

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
function checkAuth() {
    const token = localStorage.getItem('token')
    const user = JSON.parse(
        localStorage.getItem('user') || 'null')
    if (!token || !user) {
        window.location.href = '../pages/login.html'
        return
    }
    // Allow volunteer, ngo, community
    if (!['volunteer', 'ngo', 'community']
        .includes(user.role)) {
        window.location.href = '../pages/login.html'
    }
}

function getCurrentUser() {
    return JSON.parse(
        localStorage.getItem('user') || '{}')
}
function getVolunteer() {
    return JSON.parse(
        localStorage.getItem('volunteer') || '{}')
}
function getNGO() {
    return JSON.parse(
        localStorage.getItem('ngo') || '{}')
}
function getCommunity() {
    return JSON.parse(
        localStorage.getItem('community') || '{}')
}
function getToken() {
    return localStorage.getItem('token')
}
function getAuthHeaders() {
    return {
        'Authorization': 'Bearer ' + getToken(),
        'Content-Type': 'application/json'
    }
}

// ══════════════════════════════════════════════
// BUILD SIDEBAR (role-aware)
// ══════════════════════════════════════════════
function buildSidebar() {
    const role = currentUser.role
    const vol = getVolunteer()
    const ngo = getNGO()
    const com = getCommunity()

    const sidebar = document.getElementById('sidebar')
    if (!sidebar) return;

    // Set sidebar background by role
    if (role === 'community') {
        sidebar.style.background = '#1b5e20'
    } else {
        sidebar.style.background = '#1a237e'
    }

    // Role badge
    const badgeEl = document.getElementById(
        'sidebarRoleBadge')
    if (badgeEl) {
        if (role === 'volunteer') {
            const score = vol.match_score || 74
            badgeEl.innerHTML = `
                <span class="sidebar-match-badge">
                    🎯 ${score}% Match
                </span>`
        } else if (role === 'ngo') {
            const ngoName = ngo.ngo_name ||
                'Gavutham Foundation'
            badgeEl.innerHTML = `
                <span class="role-badge-pill">
                    🏢 ${ngoName}
                </span>`
        } else if (role === 'community') {
            badgeEl.innerHTML = `
                <span class="role-badge-pill">
                    🌍 Community Member
                </span>`
        }
    }

    // Nav links by role
    const navEl = document.getElementById('sidebarNav')
    if (!navEl) return;
    let links = []

    if (role === 'volunteer') {
        links = [
            {
                icon: '🏠', text: 'Dashboard Overview',
                href: 'dashboard.html'
            },
            {
                icon: '🎯', text: 'My Matched Tasks',
                href: 'matched-tasks.html'
            },
            {
                icon: '📋', text: 'My Task History',
                href: 'task-history.html'
            },
            {
                icon: '💬', text: 'Community Chatbox',
                href: 'chatbox.html', active: true
            },
            
            {
                icon: '⚙️', text: 'My Profile',
                href: 'profile.html'
            }
        ]
    } else if (role === 'ngo') {
        links = [
            {
                icon: '🏠', text: 'Dashboard',
                href: 'ngo-dashboard.html'
            },
            {
                icon: '🙋', text: 'Volunteers',
                href: 'ngo-volunteers.html'
            },
            {
                icon: '✅', text: 'Task Management',
                href: 'ngo-tasks.html'
            },
            {
                icon: '🌍', text: 'Community Needs',
                href: 'ngo-community.html'
            },
            {
                icon: '📊', text: 'Reports & Analytics',
                href: 'ngo-reports.html'
            },
            
            {
                icon: '💬', text: 'Community Chatbox',
                href: 'ngo-chatbox.html', active: true
            },
            {
                icon: '⚙️', text: 'NGO Settings',
                href: 'ngo-profile.html'
            }
        ]
    } else if (role === 'community') {
        links = [
            {
                icon: '🏠', text: 'My Dashboard',
                href: 'community-dashboard.html'
            },
            {
                icon: '🆘', text: 'My Needs',
                href: 'community-needs.html'
            },
            {
                icon: '🙋', text: 'Find Volunteers',
                href: 'community-volunteers.html'
            },
            {
                icon: '💬', text: 'Community Chatbox',
                href: 'chatbox.html', active: true
            },
            {
                icon: '⚙️', text: 'My Profile',
                href: 'community-profile.html'
            }
        ]
    }

    navEl.innerHTML = links.map(link => `
        <a href="../pages/${link.href}"
           class="nav-link ${link.active ? 'active' : ''}">
            <span class="nav-link-icon">
                ${link.icon}
            </span>
            <span>${link.text}</span>
        </a>
    `).join('')
}

// ══════════════════════════════════════════════
// BUILD NAVBAR (role-aware)
// ══════════════════════════════════════════════
function buildNavbar() {
    const role = currentUser.role
    const navRight = document.getElementById('navbarRight')
    if (!navRight) return;

    let avatarColor = '#1a237e'  // blue for volunteer
    let avatarLetter = (currentUser.name || 'U')
        .charAt(0).toUpperCase()
    let nameText = currentUser.name || 'User'
    let roleText = 'User'
    let rightHTML = ''

    if (role === 'volunteer') {
        avatarColor = '#1a237e'
        roleText = 'Volunteer'
        rightHTML = `
            <span class="navbar-bell">
                🔔
                <span class="bell-badge" id="bellBadge">
                    3
                </span>
            </span>
            <div class="navbar-avatar"
                 style="background:${avatarColor}">
                ${avatarLetter}
            </div>
            <div class="navbar-user-info">
                <span class="navbar-user-name">
                    ${nameText}
                </span>
                <span class="navbar-user-role">
                    ${roleText}
                </span>
            </div>`

    } else if (role === 'ngo') {
        avatarColor = '#e65100'  // orange for NGO
        avatarLetter = 'G'
        nameText = currentUser.name || 'Gavutham'
        roleText = 'NGO Admin'
        rightHTML = `
            <span class="navbar-bell">
                🔔
                <span class="bell-badge" id="bellBadge">
                    0
                </span>
            </span>
            <button class="navbar-urgent-btn"
                    onclick="openUrgentModeFromNavbar()">
                🚨 Post Urgent Alert
            </button>
            <div class="navbar-avatar"
                 style="background:${avatarColor}">
                ${avatarLetter}
            </div>
            <div class="navbar-user-info">
                <span class="navbar-user-name">
                    ${nameText}
                </span>
                <span class="navbar-user-role">
                    ${roleText}
                </span>
            </div>`

    } else if (role === 'community') {
        avatarColor = '#2e7d32'  // green for community
        roleText = 'Community Member'
        rightHTML = `
            <span class="navbar-bell">
                🔔
                <span class="bell-badge" id="bellBadge">
                    0
                </span>
            </span>
            <button class="navbar-urgent-btn"
                    onclick="openUrgentNeedFromNavbar()">
                🆘 Report Urgent Need
            </button>
            <div class="navbar-avatar"
                 style="background:${avatarColor}">
                ${avatarLetter}
            </div>
            <div class="navbar-user-info">
                <span class="navbar-user-name">
                    ${nameText}
                </span>
                <span class="navbar-user-role">
                    ${roleText}
                </span>
            </div>`
    }

    navRight.innerHTML = rightHTML
}

// ══════════════════════════════════════════════
// BUILD ROLE-SPECIFIC UI ELEMENTS
// ══════════════════════════════════════════════
function initRoleBasedUI() {
    const role = currentUser.role

    // Add Room button (NGO only)
    const addRoomBtn = document.getElementById('addRoomBtn')
    if (addRoomBtn) {
        addRoomBtn.style.display =
            role === 'ngo' ? 'flex' : 'none'
    }

    // Announce button in input bar (NGO only)
    const announceBtn = document.getElementById(
        'announceInputBtn')
    if (announceBtn) {
        announceBtn.style.display =
            role === 'ngo' ? 'flex' : 'none'
    }
}

// ══════════════════════════════════════════════
// ROOMS
// ══════════════════════════════════════════════
async function loadRooms() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/chat/rooms', {
            headers: getAuthHeaders()
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                allRooms = data.data.rooms
                renderRoomsList(allRooms)
            }
        } else {
            // Fallback to mock for UI demonstration if API fails
            allRooms = getMockRooms()
            renderRoomsList(allRooms)
        }
    } catch (e) {
        allRooms = getMockRooms()
        renderRoomsList(allRooms)
    }
    initRoleBasedUI()
}

function getMockRooms() {
    return [
        {
            id: 1, name: 'General Community',
            description: 'Open discussion for everyone',
            unread: 0, last_msg: '', last_time: ''
        },
        {
            id: 2, name: 'Urgent Alerts',
            description: 'Post critical emergencies here',
            unread: 0, last_msg: '', last_time: ''
        },
        {
            id: 3, name: 'NGO Announcements',
            description: 'Official NGO announcements',
            unread: 0, last_msg: '', last_time: ''
        }
    ]
}

function getRoomIconColor(type) {
    const colors = {
        general: '#1565c0',
        urgent: '#c62828',
        announcements: '#e65100',
        volunteers_only: '#2e7d32',
        location_based: '#00695c',
        ngo_community: '#6a1b9a'
    }
    return colors[type] || '#546e7a'
}

function getRoomIcon(type) {
    const icons = {
        general: '🌐',
        urgent: '🚨',
        announcements: '📢',
        volunteers_only: '🙋',
        location_based: '📍',
        ngo_community: '🤝'
    }
    return icons[type] || '💬'
}

function renderRoomsList(rooms) {
    const listEl = document.getElementById('roomsList')
    if (!listEl) return

    const vol = getVolunteer()
    const com = getCommunity()
    const userLocation = (
        vol.location || com.area_name || ''
    ).toLowerCase()

    const pinned = rooms.filter(r =>
        ['general', 'urgent', 'announcements']
            .includes(r.type))
    const roleRooms = rooms.filter(r =>
        ['volunteers_only', 'ngo_community']
            .includes(r.type))
    const localRooms = rooms.filter(r =>
        r.type === 'location_based')

    function buildGroup(label, groupRooms) {
        if (!groupRooms.length) return ''
        return `
            <div class="room-category-header">
                ${label}
            </div>
            ${groupRooms.map(r =>
            buildRoomItem(r, userLocation)
        ).join('')}
        `
    }

    listEl.innerHTML =
        buildGroup('📌 PINNED', pinned) +
        buildGroup('👥 ROLE ROOMS', roleRooms) +
        buildGroup('📍 LOCAL ROOMS', localRooms)
}

function buildRoomItem(room, userLocation) {
    const isActive = room.id === currentRoomId
    const isLocal = room.type === 'location_based'
    const isYourArea = isLocal &&
        room.location &&
        room.location.toLowerCase() === userLocation

    const color = getRoomIconColor(room.type)
    const icon = getRoomIcon(room.type)
    const isUrgentType = room.type === 'urgent'

    return `
        <div class="room-item ${isActive ? 'active' : ''}"
             onclick="selectRoom(${room.id})">
            <div class="room-icon
                 ${isUrgentType ? 'type-urgent' : ''}"
                 style="background:${color}">
                ${icon}
            </div>
            <div class="room-info">
                <span class="room-name">
                    ${room.name}
                </span>
                <span class="room-last-msg">
                    ${room.last_msg || room.description}
                </span>
            </div>
            <div class="room-right">
                <span class="room-time">
                    ${room.last_time || ''}
                </span>
                ${room.unread > 0 ? `
                    <span class="unread-badge">
                        ${room.unread}
                    </span>` : ''}
            </div>
            ${isYourArea ? `
                <span class="your-area-tag">
                    YOUR AREA
                </span>` : ''}
        </div>
    `
}

function filterRooms(term) {
    if (!term.trim()) {
        renderRoomsList(allRooms)
        return
    }
    const filtered = allRooms.filter(r =>
        r.name.toLowerCase().includes(
            term.toLowerCase()) ||
        r.description.toLowerCase().includes(
            term.toLowerCase())
    )
    renderRoomsList(filtered)
}

// ══════════════════════════════════════════════
// DEFAULT ROOM BY ROLE
// ══════════════════════════════════════════════
function getDefaultRoomId() {
    const role = currentUser.role
    const vol = getVolunteer()
    const com = getCommunity()

    if (role === 'ngo') {
        // NGO defaults to Announcements room
        return 3
    }

    if (role === 'volunteer') {
        const locMap = {
            'palladam': 5,
            'ukkadam': 6,
            'peelamedu': 7
        }
        const loc = (vol.location || '').toLowerCase()
        return locMap[loc] || 1
    }

    if (role === 'community') {
        const locMap = {
            'palladam': 5,
            'ukkadam': 6,
            'peelamedu': 7
        }
        const loc = (com.area_name || '').toLowerCase()
        return locMap[loc] || 1
    }

    return 1
}

// ══════════════════════════════════════════════
// SELECT ROOM
// ══════════════════════════════════════════════
function selectRoom(roomId) {
    currentRoomId = roomId
    const room = allRooms.find(r => r.id === roomId)
    if (!room) return

    // Update rooms list UI (mark active)
    renderRoomsList(allRooms)

    // Update chat header
    const iconEl = document.getElementById('chatRoomIcon')
    const nameEl = document.getElementById('chatRoomName')
    const descEl = document.getElementById('chatRoomDesc')

    if (iconEl) {
        iconEl.style.background = getRoomIconColor(room.type)
        iconEl.textContent = getRoomIcon(room.type || 'general')
    }
    if (nameEl) nameEl.textContent = room.name
    if (descEl) descEl.textContent = room.description

    // Show/hide urgent banner
    const banner = document.getElementById('urgentBanner')
    if (banner) {
        banner.style.display = room.type === 'urgent' ? 'flex' : 'none'
    }

    // Load messages
    loadMessages(roomId)

    // Clear unread badge
    const roomInList = allRooms.find(r => r.id === roomId)
    if (roomInList) roomInList.unread = 0
    renderRoomsList(allRooms)

    const textarea = document.getElementById('messageInput')
    if (textarea) textarea.focus()
}

// ══════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════
async function loadMessages(roomId) {
    const feed = document.getElementById('messagesFeed')
    if (feed) feed.innerHTML = '<div class="loading-state">Loading messages...</div>'

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/chat/rooms/${roomId}/messages`, {
            headers: getAuthHeaders()
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                allMessages[roomId] = data.data.messages
                renderMessages(data.data.messages)

                // Track last message timestamp for polling
                if (data.data.messages.length > 0) {
                    lastMessageTimestamps[roomId] = data.data.messages[data.data.messages.length - 1].created_at
                }
            }
        } else {
            const mock = getMockMessages(roomId)
            allMessages[roomId] = mock
            renderMessages(mock)
        }
    } catch (e) {
        const mock = getMockMessages(roomId)
        allMessages[roomId] = mock
        renderMessages(mock)
    }
    setTimeout(() => scrollToBottom(false), 100)
}

function getMockMessages(roomId) {
    const MOCK = {
        1: [ // General Community
            {
                id: 1, room_id: 1, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'Welcome everyone to the SmartResource Community Chatbox! This is your space to coordinate and make an impact together. 🤝',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 5, user_reacted: false }, { emoji: '👍', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:28 PM',
                date_display: 'Today'
            },
            {
                id: 2, room_id: 1, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Hi everyone! Dharun here — doctor from Palladam. Available for medical assistance Mon-Sat! 🩺',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:30 PM',
                date_display: 'Today'
            },
            {
                id: 3, room_id: 1, user_id: 5,
                sender_name: 'Prasanna',
                sender_role: 'community',
                message: 'Hello! My father needs a doctor for a home visit. Can any volunteer help?',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '4:32 PM',
                date_display: 'Today'
            },
            {
                id: 4, room_id: 1, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Hi Prasanna! I can help. Please share the details and I will visit tomorrow morning.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '🙏', count: 3, user_reacted: false }],
                reply_to_id: 3,
                reply_to_sender: 'Prasanna',
                reply_to_preview: 'Hello! My father needs a doctor...',
                time_display: '4:33 PM',
                date_display: 'Today'
            },
            {
                id: 5, room_id: 1, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'Annamalai here — electrician from Ukkadam. If anyone needs electrical work, reach out! ⚡',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 1, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:35 PM',
                date_display: 'Today'
            },
            {
                id: 6, room_id: 1, user_id: 6,
                sender_name: 'Harishkumar',
                sender_role: 'community',
                message: 'The community hall in Ukkadam has a complete power outage. We need urgent help! 200+ residents affected.',
                message_type: 'text',
                urgency_level: 'high',
                reactions: [],
                reply_to_id: null,
                time_display: '4:37 PM',
                date_display: 'Today'
            },
            {
                id: 7, room_id: 1, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'Saw your message Harishkumar — I am on my way to Ukkadam community hall right now! ⚡',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 2, user_reacted: false }, { emoji: '👍', count: 4, user_reacted: false }],
                reply_to_id: 6,
                reply_to_sender: 'Harishkumar',
                reply_to_preview: 'The community hall has power outage...',
                time_display: '4:38 PM',
                date_display: 'Today'
            },
            {
                id: 8, room_id: 1, user_id: 3,
                sender_name: 'Deenadhayalan',
                sender_role: 'volunteer',
                message: 'Deenadhayalan here. Water levels near Peelamedu bus stand are rising after heavy rain. Monitoring closely.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '4:40 PM',
                date_display: 'Today'
            }
        ],
        2: [ // Urgent Alerts
            {
                id: 9, room_id: 2, user_id: 6,
                sender_name: 'Harishkumar',
                sender_role: 'community',
                message: 'URGENT: Complete power failure at Ukkadam Community Hall. 200+ residents affected. Need electrician IMMEDIATELY.',
                message_type: 'urgent_alert',
                urgency_level: 'critical',
                reactions: [],
                reply_to_id: null,
                time_display: '4:15 PM',
                date_display: 'Today'
            },
            {
                id: 10, room_id: 2, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: '✅ RESPONDING: Annamalai (Electrician, Ukkadam) is on the way. ETA 20 minutes.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 5, user_reacted: false }, { emoji: '❤️', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:16 PM',
                date_display: 'Today'
            },
            {
                id: 11, room_id: 2, user_id: 5,
                sender_name: 'Prasanna',
                sender_role: 'community',
                message: 'URGENT: Elderly man collapsed near Palladam market. Need medical help NOW. Location: Near Palladam Bus Stand.',
                message_type: 'urgent_alert',
                urgency_level: 'critical',
                reactions: [],
                reply_to_id: null,
                time_display: '4:20 PM',
                date_display: 'Today'
            },
            {
                id: 12, room_id: 2, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: '✅ RESPONDING: Dr. Dharun responding. On my way. Call 8220302457 for updates.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '🙏', count: 4, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:21 PM',
                date_display: 'Today'
            },
            {
                id: 13, room_id: 2, user_id: 7,
                sender_name: 'Bharath',
                sender_role: 'community',
                message: 'HIGH ALERT: Road near Peelamedu school badly damaged. School reopens Monday. Urgent repair needed.',
                message_type: 'urgent_alert',
                urgency_level: 'high',
                reactions: [],
                reply_to_id: null,
                time_display: '4:25 PM',
                date_display: 'Today'
            },
            {
                id: 14, room_id: 2, user_id: 3,
                sender_name: 'Deenadhayalan',
                sender_role: 'volunteer',
                message: '✅ RESPONDING: Deenadhayalan (Road Work) will assess damage tomorrow morning.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '4:26 PM',
                date_display: 'Today'
            },
            {
                id: 15, room_id: 2, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'NOTICE from Gavutham Foundation: Mobilizing resources for all 3 urgent situations. Volunteers please stay on standby.',
                message_type: 'announcement',
                urgency_level: 'high',
                reactions: [{ emoji: '👍', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '4:27 PM',
                date_display: 'Today'
            }
        ],
        3: [ // NGO Announcements
            {
                id: 16, room_id: 3, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: '📢 ANNOUNCEMENT: Organizing a Medical Camp in Palladam this Saturday April 13. Volunteers with medical skills please confirm availability.',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '3:00 PM',
                date_display: 'Today'
            },
            {
                id: 17, room_id: 3, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Confirmed! Dr. Dharun available Saturday morning. 🙋',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 1, user_reacted: false }],
                reply_to_id: null,
                time_display: '3:05 PM',
                date_display: 'Today'
            },
            {
                id: 18, room_id: 3, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: '📢 ANNOUNCEMENT: Monthly food distribution drive in Coimbatore on April 20. Need 5 volunteers with driving skills.',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '3:10 PM',
                date_display: 'Today'
            },
            {
                id: 19, room_id: 3, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: '📢 IMPORTANT: Field reports for last week must be submitted by today 5PM. Use Task History page.',
                message_type: 'announcement',
                urgency_level: 'high',
                reactions: [],
                reply_to_id: null,
                time_display: '3:15 PM',
                date_display: 'Today'
            },
            {
                id: 20, room_id: 3, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'Report submitted for electrical repair! Thank you for the reminder. 🙏',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '3:20 PM',
                date_display: 'Today'
            }
        ],
        4: [ // Volunteers Hub
            {
                id: 21, room_id: 4, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Fellow volunteers — tip: Always carry your volunteer ID when going to assignments. NGOs verify identity.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '2:30 PM',
                date_display: 'Today'
            },
            {
                id: 22, room_id: 4, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'Good tip Dharun! Also take before/after photos for field reports. NGO approval is faster with photos.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '2:35 PM',
                date_display: 'Today'
            },
            {
                id: 23, room_id: 4, user_id: 3,
                sender_name: 'Deenadhayalan',
                sender_role: 'volunteer',
                message: 'Anyone else facing waterlogging in their area? Rain has been very heavy this week in Peelamedu.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '2:40 PM',
                date_display: 'Today'
            },
            {
                id: 24, room_id: 4, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Yes — roads near Palladam are very bad. Be careful if driving to field assignments.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '2:45 PM',
                date_display: 'Today'
            },
            {
                id: 25, room_id: 4, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'My match score improved from 68% to 74% after I updated my profile with more skills! Everyone should update.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 3, user_reacted: false }, { emoji: '❤️', count: 1, user_reacted: false }],
                reply_to_id: null,
                time_display: '2:50 PM',
                date_display: 'Today'
            }
        ],
        5: [ // Palladam Local
            {
                id: 26, room_id: 5, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Palladam residents — I am Dr. Dharun, volunteer doctor. Available Mon-Sat for home visits. 🩺',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '1:00 PM',
                date_display: 'Today'
            },
            {
                id: 27, room_id: 5, user_id: 5,
                sender_name: 'Prasanna',
                sender_role: 'community',
                message: 'Thank you Dr. Dharun! My mother needs BP check. Can you visit Tuesday morning?',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '1:05 PM',
                date_display: 'Today'
            },
            {
                id: 28, room_id: 5, user_id: 1,
                sender_name: 'Dharun',
                sender_role: 'volunteer',
                message: 'Yes Prasanna — visiting Tuesday 9AM. Keep her prescriptions and BP diary ready.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: 27,
                reply_to_sender: 'Prasanna',
                reply_to_preview: 'My mother needs BP check...',
                time_display: '1:07 PM',
                date_display: 'Today'
            },
            {
                id: 29, room_id: 5, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'Medical camp this Saturday at Palladam Community Center, 9AM-2PM. FREE checkup for all! 🏥',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 4, user_reacted: false }, { emoji: '❤️', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '1:10 PM',
                date_display: 'Today'
            }
        ],
        6: [ // Ukkadam Local
            {
                id: 30, room_id: 6, user_id: 2,
                sender_name: 'Annamalai',
                sender_role: 'volunteer',
                message: 'Ukkadam UPDATE: Power restored at community hall! Took 3 hours. Hall is now fully open. ✅',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 5, user_reacted: false }, { emoji: '👍', count: 4, user_reacted: false }],
                reply_to_id: null,
                time_display: '12:30 PM',
                date_display: 'Today'
            },
            {
                id: 31, room_id: 6, user_id: 6,
                sender_name: 'Harishkumar',
                sender_role: 'community',
                message: 'Thank you so much Annamalai! The evening program can go ahead now. Everyone is grateful! ❤️',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 2, user_reacted: false }],
                reply_to_id: null,
                time_display: '12:35 PM',
                date_display: 'Today'
            },
            {
                id: 32, room_id: 6, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'Outstanding emergency response by Annamalai! Gavutham Foundation recognizes your rapid response. 🏆',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '👍', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '12:40 PM',
                date_display: 'Today'
            }
        ],
        7: [ // Peelamedu Local
            {
                id: 33, room_id: 7, user_id: 3,
                sender_name: 'Deenadhayalan',
                sender_role: 'volunteer',
                message: 'PEELAMEDU: Water contamination risk near bus stand. Use BOTTLED WATER until further notice. Monitoring in progress.',
                message_type: 'urgent_alert',
                urgency_level: 'high',
                reactions: [{ emoji: '🙏', count: 4, user_reacted: false }],
                reply_to_id: null,
                time_display: '11:00 AM',
                date_display: 'Today'
            },
            {
                id: 34, room_id: 7, user_id: 7,
                sender_name: 'Bharath',
                sender_role: 'community',
                message: 'Thank you for the warning! When will tap water be safe again? We have small children.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '11:05 AM',
                date_display: 'Today'
            },
            {
                id: 35, room_id: 7, user_id: 3,
                sender_name: 'Deenadhayalan',
                sender_role: 'volunteer',
                message: 'Bharath — expect 2-3 days. Setting up filtration unit tomorrow morning. Gavutham Foundation distributes water packets.',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: 34,
                reply_to_sender: 'Bharath',
                reply_to_preview: 'When will tap water be safe...',
                time_display: '11:08 AM',
                date_display: 'Today'
            },
            {
                id: 36, room_id: 7, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'Water packets distributed in Peelamedu tomorrow 8AM near bus stand. Bring containers. Enough for 200 families. 💧',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [{ emoji: '🙏', count: 4, user_reacted: false }, { emoji: '❤️', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '11:10 AM',
                date_display: 'Today'
            }
        ],
        8: [ // NGO Community Channel
            {
                id: 37, room_id: 8, user_id: 4,
                sender_name: 'Gavutham',
                sender_role: 'ngo',
                message: 'Welcome to the NGO Community Channel. Post your needs here for official review and assistance from Gavutham Foundation.',
                message_type: 'announcement',
                urgency_level: 'normal',
                reactions: [],
                reply_to_id: null,
                time_display: '10:00 AM',
                date_display: 'Today'
            },
            {
                id: 38, room_id: 8, user_id: 5,
                sender_name: 'Prasanna',
                sender_role: 'community',
                message: 'Thank you for sending Dr. Dharun to our area. My father is much better after the home visit. Truly grateful!',
                message_type: 'text',
                urgency_level: 'normal',
                reactions: [{ emoji: '❤️', count: 3, user_reacted: false }],
                reply_to_id: null,
                time_display: '10:05 AM',
                date_display: 'Today'
            }
        ]
    }
    return MOCK[roomId] || []
}

function renderMessages(messages) {
    const feed = document.getElementById('messagesFeed')
    if (!feed) return

    feed.innerHTML = ''

    if (!messages || messages.length === 0) {
        feed.innerHTML = `
            <div class="messages-welcome">
                <span class="welcome-icon">💬</span>
                <p>No messages yet. Start the
                   conversation!</p>
            </div>`
        return
    }

    let lastDate = null
    messages.forEach(msg => {
        const msgDateLabel = formatLocalDate(msg.created_at)
        if (msgDateLabel !== lastDate) {
            const sep = document.createElement('div')
            sep.className = 'date-separator'
            sep.innerHTML = `<span>${msgDateLabel}</span>`
            feed.appendChild(sep)
            lastDate = msgDateLabel
        }
        const el = buildMessageElement(msg)
        feed.appendChild(el)
    })
}

function buildMessageElement(msg) {
    const isOwn = msg.user_id === currentUser.id
    const wrapper = document.createElement('div')

    if (msg.message_type === 'urgent_alert') {
        wrapper.className = ''
        wrapper.innerHTML = buildUrgentCard(msg)
        return wrapper
    }

    if (msg.message_type === 'announcement') {
        wrapper.className = ''
        wrapper.innerHTML = buildAnnouncementCard(msg)
        return wrapper
    }

    wrapper.className =
        `message-wrapper ${isOwn ? 'own' : 'others'}`
    wrapper.dataset.messageId = msg.id
    wrapper.innerHTML = buildRegularBubble(msg, isOwn)
    return wrapper
}

function buildRegularBubble(msg, isOwn) {
    const roleColor = getRoleColor(msg.sender_role)
    const initial = (msg.sender_name || 'U')
        .charAt(0).toUpperCase()

    const senderAvatar = isOwn ? '' : `
        <div class="sender-avatar"
             style="background:${roleColor}">
            ${initial}
        </div>`

    const senderInfo = isOwn ? '' : `
        <div class="sender-info-row">
            <span class="sender-name">
                ${msg.sender_name}
            </span>
            <span class="role-badge
                  ${msg.sender_role}">
                ${getRoleLabel(msg.sender_role)}
            </span>
        </div>`

    const replyQuote = msg.reply_to_id ? `
        <div class="reply-quote-bubble">
            <span class="reply-quote-name">
                ${msg.reply_to_sender || 'Someone'}
            </span>
            <span class="reply-quote-text">
                ${msg.reply_to_preview || '...'}
            </span>
        </div>` : ''

    const reactions = (msg.reactions || []).length > 0
        ? `<div class="reactions-row">
            ${msg.reactions.map(r => `
                <span class="reaction-pill
                      ${r.user_reacted ? 'reacted' : ''}"
                      onclick="toggleReaction(
                          ${msg.id},'${r.emoji}')">
                    ${r.emoji} ${r.count}
                </span>`).join('')}
           </div>` : ''

    return `
        ${senderAvatar}
        <div class="message-column">
            ${senderInfo}
            ${replyQuote}
            <div class="message-bubble">
                ${msg.message}
            </div>
            <div class="timestamp-row">
                ${formatLocalTime(msg.created_at) || msg.time_display || ''}
            </div>
            ${reactions}
            <div class="hover-actions">
                ${['👍', '❤️', '😂', '🙏', '😮'].map(e =>
        `<button class="hover-emoji-btn"
                             onclick="toggleReaction(
                                 ${msg.id},'${e}')">
                        ${e}
                     </button>`
    ).join('')}
                <button class="hover-emoji-btn"
                        onclick="openReplyMode(${msg.id})">
                    ↩
                </button>
            </div>
        </div>`
}

function buildUrgentCard(msg) {
    const roleColor = getRoleColor(msg.sender_role)
    const initial = (msg.sender_name || 'U')
        .charAt(0).toUpperCase()

    return `
        <div class="urgent-card">
            <div class="urgent-card-header">
                <span class="urgent-label">
                    🚨 URGENT ALERT
                </span>
                <span class="urgent-label"
                      style="background:#e65100">
                    ${(msg.urgency_level ||
            'HIGH').toUpperCase()}
                </span>
                <span style="margin-left:auto;
                             font-size:11px;
                             color:#9e9e9e">
                    ${formatLocalTime(msg.created_at) || msg.time_display || ''}
                </span>
            </div>
            <div class="urgent-card-sender">
                <div class="urgent-sender-avatar"
                     style="background:${roleColor}">
                    ${initial}
                </div>
                <span style="font-size:13px;
                             font-weight:700">
                    ${msg.sender_name}
                </span>
                <span class="role-badge
                      ${msg.sender_role}">
                    ${getRoleLabel(msg.sender_role)}
                </span>
            </div>
            <div class="urgent-msg-text">
                ${msg.message}
            </div>
            <div class="urgent-card-actions">
                <button class="btn-responding"
                        onclick="sendQuickResponse(
                            ${msg.id})">
                    ✅ I'm Responding
                </button>
                <button class="btn-seen">
                    👁 Seen
                </button>
                <span class="responder-count">
                    2 volunteers responding
                </span>
            </div>
        </div>`
}

function buildAnnouncementCard(msg) {
    const initial = (msg.sender_name || 'N')
        .charAt(0).toUpperCase()
    return `
        <div class="announcement-card">
            <div class="announce-card-header">
                <span class="announce-label">
                    📢 ANNOUNCEMENT
                </span>
                <span style="font-size:12px;
                             font-weight:700;
                             color:#e65100;
                             margin-left:8px">
                    ${msg.sender_name}
                </span>
                <span style="margin-left:auto;
                             font-size:11px;
                             color:#9e9e9e">
                    ${formatLocalTime(msg.created_at) || msg.time_display || ''}
                </span>
            </div>
            <div class="announce-msg-text">
                ${msg.message}
            </div>
        </div>`
}

// ══════════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════════
function sendMessage() {
    const input = document.getElementById('messageInput')
    if (!input) return
    const text = input.value.trim()
    if (!text && !selectedImageFile) return

    const msgType = isUrgentMode ? 'urgent_alert' :
        isAnnounceMode ? 'announcement' : 'text'

    const newMsg = {
        id: Date.now(),
        room_id: currentRoomId,
        user_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message: text,
        message_type: msgType,
        urgency_level: isUrgentMode ? 'critical' : 'normal',
        reply_to_id: replyToId,
        reply_to_sender: replyToSender,
        reply_to_preview: replyToPreview,
        reactions: [],
        time_display: new Date().toLocaleTimeString(
            'en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }),
        date_display: 'Today'
    }

    if (!allMessages[currentRoomId]) {
        allMessages[currentRoomId] = []
    }
    allMessages[currentRoomId].push(newMsg)

    const el = buildMessageElement(newMsg)
    const feed = document.getElementById('messagesFeed')
    if (feed) feed.appendChild(el)

    input.value = ''
    input.style.height = 'auto'
    const sendBtn = document.getElementById('sendBtn')
    if (sendBtn) sendBtn.disabled = true

    cancelReply()
    resetModes()
    scrollToBottom(true)
    updateRoomLastMessage(currentRoomId, text)
    tryApiSend(newMsg)
}

async function tryApiSend(msg) {
    try {
        await fetch(
            'http://127.0.0.1:5000/api/chat/messages',
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    room_id: msg.room_id,
                    message: msg.message,
                    message_type: msg.message_type,
                    urgency_level: msg.urgency_level,
                    reply_to_id: msg.reply_to_id || null
                })
            }
        )
    } catch (e) {
        // Silent fail — message shown optimistically
    }
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
    }
    handleTypingIndicator()
}

function handleInputChange() {
    const ta = document.getElementById('messageInput')
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(
        ta.scrollHeight, 120) + 'px'
    const sendBtn = document.getElementById('sendBtn')
    if (sendBtn) {
        sendBtn.disabled = ta.value.trim() === ''
    }
}

function handleTypingIndicator() {
    clearTimeout(typingTimeout)
    const ti = document.getElementById('typingIndicator')
    if (ti) ti.style.display = 'flex'
    typingTimeout = setTimeout(() => {
        if (ti) ti.style.display = 'none'
    }, 2000)
}

// ══════════════════════════════════════════════
// MODES (URGENT / ANNOUNCE)
// ══════════════════════════════════════════════
function toggleUrgentMode() {
    isUrgentMode = !isUrgentMode
    isAnnounceMode = false
    const btn = document.getElementById('urgentInputBtn')
    const ta = document.getElementById('messageInput')
    const aBtn = document.getElementById('announceInputBtn')
    if (btn) btn.classList.toggle('urgent-active',
        isUrgentMode)
    if (aBtn) aBtn.classList.remove('announce-active')
    if (ta) {
        ta.classList.toggle('input-urgent', isUrgentMode)
        ta.classList.remove('input-announce')
        ta.placeholder = isUrgentMode
            ? '🚨 Type your URGENT message...'
            : `Message ${getRoomName(currentRoomId)}...`
        if (isUrgentMode && currentRoomId !== 2) {
            selectRoom(2)
            showToast('Switched to Urgent Alerts room',
                'info')
        }
        ta.focus()
    }
}

function toggleAnnounceMode() {
    if (currentUser.role !== 'ngo') {
        showToast('Only NGOs can post announcements',
            'error')
        return
    }
    isAnnounceMode = !isAnnounceMode
    isUrgentMode = false
    const btn = document.getElementById(
        'announceInputBtn')
    const uBtn = document.getElementById('urgentInputBtn')
    const ta = document.getElementById('messageInput')
    if (btn) btn.classList.toggle('announce-active',
        isAnnounceMode)
    if (uBtn) uBtn.classList.remove('urgent-active')
    if (ta) {
        ta.classList.toggle('input-announce',
            isAnnounceMode)
        ta.classList.remove('input-urgent')
        ta.placeholder = isAnnounceMode
            ? '📢 Type your announcement...'
            : `Message ${getRoomName(currentRoomId)}...`
        if (isAnnounceMode && currentRoomId !== 3) {
            selectRoom(3)
        }
        ta.focus()
    }
}

function resetModes() {
    isUrgentMode = false
    isAnnounceMode = false
    const uBtn = document.getElementById('urgentInputBtn')
    const aBtn = document.getElementById('announceInputBtn')
    const ta = document.getElementById('messageInput')
    if (uBtn) uBtn.classList.remove('urgent-active')
    if (aBtn) aBtn.classList.remove('announce-active')
    if (ta) {
        ta.classList.remove('input-urgent', 'input-announce')
    }
}

function getRoomName(roomId) {
    const room = allRooms.find(r => r.id === roomId)
    return room ? room.name : 'this room'
}

// ══════════════════════════════════════════════
// REPLY
// ══════════════════════════════════════════════
function openReplyMode(messageId) {
    const msgs = allMessages[currentRoomId] || []
    const orig = msgs.find(m => m.id === messageId)
    if (!orig) return
    replyToId = messageId
    replyToSender = orig.sender_name
    replyToPreview = orig.message.substring(0, 60)
    const bar = document.getElementById('replyBar')
    const nameEl = document.getElementById('replyToName')
    const prevEl = document.getElementById('replyPreview')
    if (bar) bar.style.display = 'flex'
    if (nameEl) nameEl.textContent = orig.sender_name
    if (prevEl) prevEl.textContent =
        replyToPreview +
        (orig.message.length > 60 ? '...' : '')
    const ta = document.getElementById('messageInput')
    if (ta) ta.focus()
}

function cancelReply() {
    replyToId = null
    replyToSender = null
    replyToPreview = null
    const bar = document.getElementById('replyBar')
    if (bar) bar.style.display = 'none'
}

// ══════════════════════════════════════════════
// REACTIONS
// ══════════════════════════════════════════════
async function toggleReaction(messageId, emoji) {
    // Optimistic UI update
    const msgs = allMessages[currentRoomId] || []
    const msg = msgs.find(m => m.id === messageId)
    if (!msg) return

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/chat/messages/${messageId}/react`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ emoji })
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                msg.reactions = data.data.reactions
                renderMessages(msgs)
            }
        }
    } catch (e) {
        console.error('Reaction failed:', e)
    }
}

// ══════════════════════════════════════════════
// QUICK RESPONSE
// ══════════════════════════════════════════════
function sendQuickResponse(messageId) {
    const vol = getVolunteer()
    const user = currentUser
    let response = ''

    if (user.role === 'volunteer' && vol.skills) {
        response = `✅ RESPONDING: ${user.name} (${vol.skills}, ${vol.location || 'nearby'}) is on the way.`
    } else if (user.role === 'ngo') {
        const ngo = getNGO()
        response = `✅ ACKNOWLEDGED: ${ngo.ngo_name || 'NGO'} has noted this alert and is coordinating response.`
    } else {
        response = `✅ ACKNOWLEDGED: ${user.name} has seen this alert.`
    }

    const ta = document.getElementById('messageInput')
    if (ta) {
        ta.value = response
        ta.dispatchEvent(new Event('input'))
        handleInputChange()
        ta.focus()
    }
}

// ══════════════════════════════════════════════
// QUICK ACTIONS (members panel, role-based)
// ══════════════════════════════════════════════
function buildQuickActions() {
    const role = currentUser.role
    const el = document.getElementById(
        'quickActionsList')
    if (!el) return

    let html = ''

    // All roles: urgent
    html += `
        <button class="quick-action-btn qa-urgent"
                onclick="postUrgentAlert()">
            🚨 Post Urgent Alert
        </button>`

    if (role === 'ngo') {
        html += `
        <button class="quick-action-btn qa-announce"
                onclick="postAnnouncement()">
                📢 Post Announcement
            </button>`
    }

    if (role === 'volunteer') {
        html += `
        <button class="quick-action-btn qa-available"
                onclick="markMeAvailable()">
                🙋 Mark Me Available
            </button>`
    }

    if (role !== 'volunteer') {
        html += `
        <button class="quick-action-btn qa-request"
                onclick="openRequestVolunteer()">
                📋 Request Volunteer
            </button>`
    }

    el.innerHTML = html
}

function postUrgentAlert() {
    if (currentRoomId !== 2) {
        selectRoom(2)
        setTimeout(() => toggleUrgentMode(), 300)
    } else {
        toggleUrgentMode()
    }
}

function postAnnouncement() {
    if (currentUser.role !== 'ngo') {
        showToast('Only NGOs can post announcements',
            'error')
        return
    }
    if (currentRoomId !== 3) {
        selectRoom(3)
        setTimeout(() => toggleAnnounceMode(), 300)
    } else {
        toggleAnnounceMode()
    }
}

function markMeAvailable() {
    if (currentUser.role !== 'volunteer') {
        showToast('Only volunteers can use this',
            'error')
        return
    }
    const vol = getVolunteer()
    const user = currentUser
    const msg = `🙋 AVAILABLE NOW: ${user.name} is Available in ${vol.location || 'my area'}.Skills: ${vol.skills || 'General'}. Contact for urgent tasks!`
    if (currentRoomId !== 4) selectRoom(4)
    const ta = document.getElementById('messageInput')
    if (ta) {
        ta.value = msg
        handleInputChange()
    }
}

function openRequestVolunteer() {
    showToast('Switching to Urgent Alerts to post request...', 'info')
    setTimeout(() => {
        selectRoom(2)
        toggleUrgentMode()
    }, 500)
}

function openUrgentModeFromNavbar() {
    selectRoom(2)
    setTimeout(() => toggleUrgentMode(), 300)
}

function openUrgentNeedFromNavbar() {
    selectRoom(2)
    setTimeout(() => toggleUrgentMode(), 300)
}

// ══════════════════════════════════════════════
// ROLE-SPECIFIC SECTION (members panel bottom)
// ══════════════════════════════════════════════
function buildRoleSpecificSection() {
    const role = currentUser.role
    const el = document.getElementById(
        'roleSpecificSection')
    if (!el) return

    if (role === 'ngo') {
        el.innerHTML = `
        <div class="panel-section-header">
            <span class="panel-section-title">
                ⚡ NGO Actions
            </span>
        </div>
            <div class="ngo-action-card ngo-broadcast"
                 onclick="postUrgentAlert()">
                🚨 Broadcast Alert
            </div>
            <div class="ngo-action-card ngo-announce-card"
                 onclick="postAnnouncement()">
                📢 Post Announcement
            </div>`
    } else if (role === 'volunteer') {
        const vol = getVolunteer()
        const skills = (vol.skills || '')
            .split(',').map(s => s.trim())
        el.innerHTML = `
        <div class="panel-section-header">
            <span class="panel-section-title">
                🎯 Your Skill Match
            </span>
        </div>
        <p style="font-size:12px;
                      color:#757575;
                      margin-bottom:8px">
            Rooms mentioning your skills:
        </p>
            ${skills.map(s => `
                <div style="display:flex;
                            justify-content:space-between;
                            font-size:12px;
                            padding:4px 0">
                    <span>${s}</span>
                    <span style="color:#1a237e;
                                 font-weight:600">
                        Active
                    </span>
                </div>`).join('')
            } `
    } else if (role === 'community') {
        const com = getCommunity()
        el.innerHTML = `
        <div class="panel-section-header">
            <span class="panel-section-title">
                🌍 Your Area
            </span>
        </div>
        <p style="font-size:12px; color:#757575">
            Local rooms are active for your area
        </p>`
    }
}

// ══════════════════════════════════════════════
// ONLINE MEMBERS
// ══════════════════════════════════════════════
async function loadOnlineMembers() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/chat/online-members', {
            headers: getAuthHeaders()
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                renderOnlineMembers(data.data.members)
            }
        }
    } catch (e) {
        renderOnlineMembers(getMockMembers())
    }
}

function getMockMembers() {
    return [
        {
            id: 4, name: 'Gavutham', role: 'ngo',
            online: true, location: 'Coimbatore'
        },
        {
            id: 1, name: 'Dharun', role: 'volunteer',
            online: true, location: 'Palladam',
            availability: 'Available',
            skills: 'Doctor, Driving'
        },
        {
            id: 2, name: 'Annamalai', role: 'volunteer',
            online: true, location: 'Ukkadam',
            availability: 'Busy',
            skills: 'Counselling, Electrical Work'
        },
        {
            id: 3, name: 'Deenadhayalan', role: 'volunteer',
            online: false, location: 'Peelamedu',
            availability: 'Available',
            skills: 'Water Treatment, Road Work'
        },
        {
            id: 5, name: 'Prasanna', role: 'community',
            online: true, location: 'Palladam'
        },
        {
            id: 6, name: 'Harishkumar', role: 'community',
            online: false, location: 'Ukkadam'
        },
        {
            id: 7, name: 'Bharath', role: 'community',
            online: true, location: 'Peelamedu'
        }
    ]
}

function renderOnlineMembers(members) {
    const el = document.getElementById('membersList')
    if (!el) return

    const onlineCount = members.filter(
        m => m.online).length
    const badge = document.getElementById(
        'onlineCountBadge')
    if (badge) badge.textContent = onlineCount

    const ngos = members.filter(m => m.role === 'ngo')
    const vols = members.filter(m => m.role === 'volunteer')
    const coms = members.filter(m => m.role === 'community')

    function buildGroup(label, group) {
        if (!group.length) return ''
        return `
            <div class="role-group-header">${label}</div>
                ${group.map(m => buildMemberItem(m)).join('')}`
    }

    el.innerHTML =
        buildGroup('🏢 NGO', ngos) +
        buildGroup('🙋 Volunteers', vols) +
        buildGroup('🌍 Community', coms)
}

function buildMemberItem(member) {
    const color = getRoleColor(member.role)
    const initial = (member.name || 'U')
        .charAt(0).toUpperCase()
    const availBadge = member.availability
        ? `<span class="member-avail-badge avail-${member.availability.toLowerCase().replace(' ', '-')}">
               ${member.availability}
           </span>` : ''

    return `
    <div class="member-item" onclick="showMemberProfile(${member.id})">
            <div class="member-avatar"
                 style="background:${color}">
                ${initial}
            </div>
            <div class="member-info">
                <span class="member-name">
                    ${member.name}
                </span>
                <span class="member-location">
                    📍 ${member.location || ''}
                </span>
            </div>
            ${availBadge}
            <div class="online-indicator ${member.online ? 'online' : 'offline'}"></div>
        </div>`
}

function showMemberProfile(userId) {
    const members = getMockMembers()
    const member = members.find(m => m.id === userId)
    if (!member) return
    const color = getRoleColor(member.role)
    const initial = member.name.charAt(0).toUpperCase()
    const popup = document.getElementById('memberPopup')
    if (!popup) return
    popup.innerHTML = `
    <div style="display:flex;justify-content:flex-end">
        <button onclick="document.getElementById('memberPopup').style.display='none'"
            style="background:none;border:none; font-size:18px;cursor:pointer; color:#9e9e9e">✕</button>
        </div>
    <div style="text-align:center;padding:8px 0 12px">
        <div style="width:56px;height:56px;
                        border-radius:50%;
                        background:${color};
                        color:white;font-size:22px;
                        font-weight:700;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        margin:0 auto 8px">
            ${initial}
        </div>
        <div style="font-size:15px;font-weight:700">
            ${member.name}
        </div>
        <div class="role-badge ${member.role}"
            style="display:inline-block;
                        margin:4px 0">
            ${getRoleLabel(member.role)}
        </div>
        <div style="font-size:12px;color:#757575;
                        margin-top:4px">
            📍 ${member.location || ''}
        </div>
        ${member.skills ? `
                <div style="font-size:12px;
                            color:#757575;
                            margin-top:4px">
                    🔧 ${member.skills}
                </div>` : ''}
        <div style="margin-top:4px">
            <span class="online-indicator
                      ${member.online ? 'online' : 'offline'}"
                style="display:inline-block">
            </span>
            <span style="font-size:11px;
                             color:#9e9e9e">
                ${member.online ? 'Online' : 'Offline'}
            </span>
        </div>
    </div>`
    popup.style.display = 'block'
    popup.style.position = 'fixed'
    popup.style.bottom = '80px'
    popup.style.right = '280px'
    popup.style.zIndex = '1000'
}

// ══════════════════════════════════════════════
// ACTIVE ALERTS & PINNED
// ══════════════════════════════════════════════
async function loadActiveAlerts() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/chat/pinned-messages', {
            headers: getAuthHeaders()
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                const alerts = data.data.pinned.filter(m => m.message_type === 'urgent_alert')
                renderActiveAlerts(alerts)
            }
        }
    } catch (e) {
        // Fallback or silent
    }
}

function renderActiveAlerts(urgentMsgs) {
    const el = document.getElementById('activeAlertsList')
    if (!el) return
    if (!urgentMsgs.length) {
        el.innerHTML = `
        <p class="no-alerts-msg">
                ✅ No active emergencies
            </p>`
        return
    }
    el.innerHTML = urgentMsgs.map(m => `
    <div class="alert-item"
onclick= "selectRoom(${m.room_id})">
            <div class="alert-item-header">
                <span class="alert-priority">
                    ${(m.urgency_level || 'HIGH').toUpperCase()}
                </span>
                <span class="alert-time">
                    ${m.time_display || ''}
                </span>
            </div>
            <div class="alert-sender">
                ${m.sender_name}
            </div>
            <div class="alert-preview">
                ${m.message}
            </div>
            <a class="alert-view-link">View →</a>
        </div>`).join('')
}

async function loadPinnedMessages() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/chat/pinned-messages', {
            headers: getAuthHeaders()
        })
        if (res.ok) {
            const data = await res.json()
            if (data.success) {
                renderPinnedMessages(data.data.pinned)
            }
        }
    } catch (e) {
        // Fallback
    }
}

function renderPinnedMessages(pinned) {
    const el = document.getElementById('pinnedMessagesList')
    if (!el) return
    if (!pinned || pinned.length === 0) {
        el.innerHTML = '<p class="no-pinned-msg">No pinned messages</p>'
        return
    }
    el.innerHTML = pinned.map(m => `
        <div class="pinned-item">
            <span class="pinned-room-badge">
                ${m.room_name || 'Notice'}
            </span>
            <div class="pinned-sender">${m.sender_name}</div>
            <div class="pinned-preview">
                ${m.message.substring(0, 60)}${m.message.length > 60 ? '...' : ''}
            </div>
            <span class="pinned-goto"
                  onclick="selectRoom(${m.room_id})">
                Go to →
            </span>
        </div>`).join('')
}

// ══════════════════════════════════════════════
// ROOMS USER CARD (bottom of rooms panel)
// ══════════════════════════════════════════════
function buildRoomsUserCard() {
    const el = document.getElementById('roomsUserCard')
    if (!el) return
    const role = currentUser.role
    const color = getRoleColor(role)
    const initial = (currentUser.name || 'U')
        .charAt(0).toUpperCase()

    el.innerHTML = `
        <div class="rooms-user-avatar" style="background:${color}">
            ${initial}
        </div>
        <span class="rooms-user-name">
            ${currentUser.name || 'User'}
        </span>
        <span class="rooms-user-role"
              style="background:${color}20;
                     color:${color}">
            ${getRoleLabel(role)}
        </span>
        <div class="online-dot-small"></div>`
}

// ══════════════════════════════════════════════
// UPDATE ROOM LAST MESSAGE
// ══════════════════════════════════════════════
function updateRoomLastMessage(roomId, text) {
    const room = allRooms.find(r => r.id === roomId)
    if (room) {
        room.last_msg =
            currentUser.name + ': ' +
            text.substring(0, 40)
        room.last_time = new Date().toLocaleTimeString(
            'en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }
    renderRoomsList(allRooms)
}

// ══════════════════════════════════════════════
// EMOJI PICKER
// ══════════════════════════════════════════════
function toggleEmojiPicker() {
    emojiPickerOpen = !emojiPickerOpen
    const picker = document.getElementById('emojiPicker')
    if (!picker) return
    picker.style.display = emojiPickerOpen
        ? 'flex' : 'none'
    if (emojiPickerOpen) showEmojiCat('smileys',
        document.querySelector('.emoji-tab'))
}

function showEmojiCat(cat, tabEl) {
    const emojis = EMOJI_SETS[cat] || []
    const grid = document.getElementById('emojiGrid')
    if (grid) {
        grid.innerHTML = emojis.map(e =>
            `<button class="emoji-cell" onclick="insertEmoji('${e}')">
                ${e}
             </button>`
        ).join('')
    }
    document.querySelectorAll('.emoji-tab')
        .forEach(t => t.classList.remove('active'))
    if (tabEl) tabEl.classList.add('active')
}

function insertEmoji(emoji) {
    const ta = document.getElementById('messageInput')
    if (!ta) return
    const pos = ta.selectionStart || 0
    const val = ta.value
    ta.value = val.slice(0, pos) + emoji +
        val.slice(pos)
    ta.selectionStart = ta.selectionEnd =
        pos + emoji.length
    ta.focus()
    emojiPickerOpen = false
    const picker = document.getElementById('emojiPicker')
    if (picker) picker.style.display = 'none'
    handleInputChange()
}

// ══════════════════════════════════════════════
// IMAGE ATTACH
// ══════════════════════════════════════════════
let selectedImageFile = null

function handleImageSelect(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Max 5MB.', 'error')
        return
    }
    selectedImageFile = file
    const reader = new FileReader()
    reader.onload = e => {
        const thumb = document.getElementById(
            'inputImageThumb')
        const name = document.getElementById(
            'inputImageName')
        const prev = document.getElementById(
            'inputImagePreview')
        if (thumb) thumb.src = e.target.result
        if (name) name.textContent = file.name
        if (prev) prev.style.display = 'flex'
        const sendBtn = document.getElementById('sendBtn')
        if (sendBtn) sendBtn.disabled = false
    }
    reader.readAsDataURL(file)
}

function removeImage() {
    selectedImageFile = null
    const input = document.getElementById('imageFileInput')
    const prev = document.getElementById(
        'inputImagePreview')
    if (input) input.value = ''
    if (prev) prev.style.display = 'none'
    const ta = document.getElementById('messageInput')
    const sendBtn = document.getElementById('sendBtn')
    if (sendBtn && ta) {
        sendBtn.disabled = ta.value.trim() === ''
    }
}

// ══════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════
function toggleSearchBar() {
    const bar = document.getElementById('messageSearchBar')
    if (!bar) return
    const isHidden = bar.style.display === 'none'
    bar.style.display = isHidden ? 'flex' : 'none'
    if (isHidden) {
        const input = document.getElementById(
            'messageSearchInput')
        if (input) input.focus()
    }
}

function searchMessages(term) {
    if (!term.trim()) {
        clearHighlights()
        const countEl = document.getElementById(
            'searchResultCount')
        if (countEl) countEl.textContent = ''
        return
    }
    const bubbles = document.querySelectorAll(
        '.message-bubble')
    let count = 0
    bubbles.forEach(b => {
        const matches = b.textContent.toLowerCase()
            .includes(term.toLowerCase())
        b.style.background = matches
            ? (b.closest('.message-wrapper.own')
                ? '#0d47a1' : '#fff9c4')
            : ''
        if (matches) count++
    })
    const countEl = document.getElementById(
        'searchResultCount')
    if (countEl) {
        countEl.textContent = count > 0
            ? `${count} results` : 'No results'
    }
}

function clearHighlights() {
    document.querySelectorAll('.message-bubble')
        .forEach(b => b.style.background = '')
}

// ══════════════════════════════════════════════
// POLLING (simulate real-time)
// ══════════════════════════════════════════════
function startPolling() {
    pollingInterval = setInterval(async () => {
        await tryApiPoll()
    }, 5000)
}

async function tryApiPoll() {
    if (!currentRoomId) return
    try {
        const res = await fetch(
            `http://127.0.0.1:5000/api/chat/rooms/${currentRoomId}/messages`,
            { headers: getAuthHeaders() }
        )
        if (res.ok) {
            const data = await res.json()
            if (data.success && data.data.messages.length > 0) {
                const current = allMessages[currentRoomId] || []
                const currentIds = new Set(current.map(m => m.id))

                const newMsgs = data.data.messages
                    .filter(m => !currentIds.has(m.id))

                if (newMsgs.length > 0) {
                    newMsgs.forEach(msg => {
                        allMessages[currentRoomId].push(msg)
                        const el = buildMessageElement(msg)
                        const feed = document.getElementById('messagesFeed')
                        if (feed) {
                            feed.appendChild(el)
                            playNotificationSound()
                            updateBellBadge()
                        }
                    })
                    scrollToBottom(true)
                }
            }
        }
    } catch (e) {
        // Silent
    }
}

// ══════════════════════════════════════════════
// SIDEBAR TOGGLE (mobile)
// ══════════════════════════════════════════════
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById(
        'sidebarOverlay')
    if (!sidebar) return
    const isOpen = sidebar.classList.contains('open')
    sidebar.classList.toggle('open', !isOpen)
    if (overlay) {
        overlay.style.display = isOpen ? 'none' : 'block'
    }
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function getRoleColor(role) {
    const colors = {
        volunteer: '#1a237e',
        ngo: '#e65100',
        community: '#2e7d32',
        admin: '#6a1b9a'
    }
    return colors[role] || '#546e7a'
}

function getRoleLabel(role) {
    const labels = {
        volunteer: 'VOLUNTEER',
        ngo: 'NGO',
        community: 'COMMUNITY',
        admin: 'ADMIN'
    }
    return labels[role] || role.toUpperCase()
}

function generateAvatarColor(name) {
    const colors = [
        '#1a237e', '#006064', '#1b5e20',
        '#4a148c', '#e65100', '#880e4f',
        '#0d47a1', '#33691e', '#bf360c', '#37474f'
    ]
    let hash = 0
    for (const c of (name || '')) {
        hash += c.charCodeAt(0)
    }
    return colors[hash % colors.length]
}

function showToast(message, type, duration) {
    const container = document.getElementById(
        'toastContainer')
    if (!container) return
    const toast = document.createElement('div')
    toast.className = `toast ${type || ''}`
    const icons = {
        success: '✅', error: '❌',
        info: 'ℹ️', warning: '⚠️'
    }
    toast.innerHTML = `
        <span>${icons[type] || '💬'}</span>
        <span>${message}</span>`
    container.appendChild(toast)
    setTimeout(() => toast.remove(), duration || 3000)
}

function handleLogout() {
    clearInterval(pollingInterval)
    localStorage.clear();
    window.location.href = '../pages/login.html'
}

// Close emoji picker on outside click
document.addEventListener('click', e => {
    const picker = document.getElementById('emojiPicker')
    if (picker && !picker.contains(e.target) &&
        e.target.className !== 'emoji-input-btn') {
        picker.style.display = 'none'
        emojiPickerOpen = false
    }
})


// Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const popup = document.getElementById('memberPopup')
        if (popup) popup.style.display = 'none'
        const picker = document.getElementById('emojiPicker')
        if (picker) picker.style.display = 'none'
        emojiPickerOpen = false
    }
})

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 440
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
    } catch (e) { }
}

function updateBellBadge() {
    const badge = document.getElementById('onlineCountBadge')
    if (!badge) return
    const current = parseInt(badge.textContent) || 0
    badge.textContent = current + 1
    badge.style.display = 'flex'
}

function scrollToBottom(smooth = true) {
    const feed = document.getElementById('messagesFeed')
    if (!feed) return
    feed.scrollTo({
        top: feed.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
    })
}

/**
 * Time Helpers for Real-Time Display
 */
function formatLocalTime(isoString) {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    })
}

function formatLocalDate(isoString) {
    if (!isoString) return 'Today'
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    } else {
        return date.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    }
}
