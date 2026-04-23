/**
 * Smart Resource Allocation - Reports & Analytics Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfileInfo();
    fetchReportData();
    fetchTopVolunteers();
});

const API_BASE_URL = 'http://localhost:5000/api';
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
 * Fetch and Render Analytics Data
 */
async function fetchReportData() {
    const range = document.getElementById('dateRange').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/reports/stats?range=${range}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            const s = data.data;
            
            // Stat Cards
            animateValue('statTotalImpact', s.total_people_helped);
            document.getElementById('statSuccessRate').textContent = `${s.success_rate}%`;
            document.getElementById('statAvgResponse').textContent = '4.2 hrs'; // Mocked
            animateValue('statActiveVolunteers', 18); // Mocked
            animateValue('statTotalHours', s.total_hours);
            animateValue('statResourceViews', 145); // Mocked

            // Monthly Activity Chart (Vertical Bars)
            renderActivityChart(s.monthly_activity);

            // Availability Stacked Bar
            renderAvailabilityStackedBar();

            // Prio Horizontal Chart
            renderPrioChart();

            // Impact Lists
            renderImpactHighlights();
        }
    } catch (err) { console.error(err); }
}

function renderActivityChart(activity) {
    const chart = document.getElementById('activityChart');
    const labels = document.getElementById('activityLabels');
    chart.innerHTML = '';
    labels.innerHTML = '';

    const maxTasks = Math.max(...activity.map(a => a.tasks)) || 1;
    activity.forEach(a => {
        const h = (a.tasks / maxTasks) * 100;
        chart.innerHTML += `<div class="act-bar" data-val="${a.tasks}" style="height: ${h}%"></div>`;
        labels.innerHTML += `<span>${a.month}</span>`;
    });
}

function renderAvailabilityStackedBar() {
    // Mocking breakdown 65% Avail, 25% Busy, 10% Leave
    document.getElementById('segAvailable').style.width = '65%';
    document.getElementById('segBusy').style.width = '25%';
    document.getElementById('segOnLeave').style.width = '10%';
}

function renderPrioChart() {
    const chart = document.getElementById('prioBarChart');
    const data = [
        { lbl: 'Critical', count: 12, color: '#f44336' },
        { lbl: 'High', count: 28, color: '#ff9800' },
        { lbl: 'Medium', count: 45, color: '#2196f3' },
        { lbl: 'Low', count: 18, color: '#9e9e9e' }
    ];
    chart.innerHTML = '';
    const max = 45;
    data.forEach(d => {
        chart.innerHTML += `
            <div class="prio-item">
                <div class="prio-lbl"><span>${d.lbl}</span> <span>${d.count}</span></div>
                <div class="prio-bg"><div class="prio-fill" style="width: ${(d.count/max)*100}%; background: ${d.color}"></div></div>
            </div>
        `;
    });
}

/**
 * Top Volunteers Table
 */
async function fetchTopVolunteers() {
    // We already have some logic in ngo_controller to fetch volunteers, 
    // we'll assume a /reports/top-volunteers endpoint or reuse get_volunteers with sort.
    try {
        const response = await fetch(`${API_BASE_URL}/ngo/volunteers?sort=tasks&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            const tbody = document.getElementById('topVolunteersBody');
            tbody.innerHTML = '';
            data.data.forEach((v, index) => {
                const badge = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
                tbody.innerHTML += `
                    <tr>
                        <td>${badge} ${index + 1}</td>
                        <td style="font-weight:600;">${v.name}</td>
                        <td>${v.location}</td>
                        <td>${v.tasks_completed}</td>
                        <td>${v.people_helped}</td>
                        <td>${v.hours_volunteered}</td>
                        <td><span style="color:var(--ngo-color); font-weight:700;">${v.match_score}</span></td>
                    </tr>
                `;
            });
        }
    } catch (err) { console.error(err); }
}

function renderImpactHighlights() {
    const needsLi = document.getElementById('topNeedsList');
    needsLi.innerHTML = `
        <li><span>Medical/Health</span> <span>34%</span></li>
        <li><span>Water Supply</span> <span>22%</span></li>
        <li><span>Disaster Relief</span> <span>18%</span></li>
    `;

    const areasLi = document.getElementById('topAreasList');
    areasLi.innerHTML = `
        <li><span>Palladam</span> <span>45 tasks</span></li>
        <li><span>Ukkadam</span> <span>32 tasks</span></li>
        <li><span>Peelamedu</span> <span>28 tasks</span></li>
    `;

    document.getElementById('growthIndicator').innerHTML = `
        <span style="color:#4caf50; font-size:24px; font-weight:700;">+12%</span>
        <p style="font-size:11px; color:#888;">vs last month</p>
    `;

    document.getElementById('skillGapText').textContent = "Highly needing: Electrical Work (40% gap), First Aid (25% gap). Suggest uploading more resources in these areas.";
}

/**
 * Utils
 */
function animateValue(id, value) {
    const obj = document.getElementById(id);
    let start = 0;
    const end = parseInt(value);
    const duration = 1000;
    const step = (end / duration) * 10;
    
    const timer = setInterval(() => {
        start += step;
        obj.textContent = Math.floor(start);
        if (start >= end) {
            obj.textContent = end;
            clearInterval(timer);
        }
    }, 10);
}

function exportData() {
    alert("Exporting CSV report...");
    // Logic to generate CSV and trigger download
}

function handleLogout() { localStorage.clear(); window.location.href = 'login.html'; }
