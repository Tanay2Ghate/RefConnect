document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth Check ──────────────────────────────────────────────────────────
    if (!window.checkAuth) {
        console.error("api.js not loaded yet — retrying in 100ms");
        setTimeout(() => window.location.reload(), 100);
        return;
    }

    const user = await window.checkAuth();
    if (!user) return; // checkAuth redirects to login if unauthenticated

    // ── Populate User Info ───────────────────────────────────────────────────
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (roleEl) {
        const role = (user.role || 'user');
        roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleEl.className = `badge badge-${role}`;
    }

    // ── Logout ───────────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.logout();
        });
    }

    // ── Load Dashboard Stats ─────────────────────────────────────────────────
    try {
        const jobEndpoint = (user.role === 'recruiter')
            ? '/api/jobs'
            : '/api/jobs/matched';

        const [connectionsRes, referralsRes, applicationsRes, jobsRes] = await Promise.allSettled([
            window.api.get('/api/connections'),
            window.api.get('/api/referrals'),
            window.api.get('/api/applications'),
            window.api.get(jobEndpoint),
        ]);

        // Connections
        const connEl = document.getElementById('stat-connections');
        if (connEl && connectionsRes.status === 'fulfilled') {
            const d = connectionsRes.value;
            connEl.textContent = (d.data ? d.data.length : d.length) ?? '0';
        }

        // Pending Referrals
        const refEl = document.getElementById('stat-referrals');
        if (refEl && referralsRes.status === 'fulfilled') {
            const d = referralsRes.value;
            const list = d.data ?? d;
            const pending = Array.isArray(list) ? list.filter(r => r.status === 'pending').length : 0;
            refEl.textContent = pending;
        }

        // Applications
        const appEl = document.getElementById('stat-applications');
        if (appEl && applicationsRes.status === 'fulfilled') {
            const d = applicationsRes.value;
            appEl.textContent = (d.data ? d.data.length : d.length) ?? '0';
        }

        // Jobs / My Posts
        const jobEl = document.getElementById('stat-matched-jobs');
        const jobLabel = document.getElementById('matched-jobs-label');
        if (jobEl && jobsRes.status === 'fulfilled') {
            const d = jobsRes.value;
            const list = d.data ?? d;
            if (user.role === 'recruiter') {
                if (jobLabel) jobLabel.textContent = 'My Job Posts';
                const myJobs = Array.isArray(list) ? list.filter(j => j.recruiter_id === user.userId).length : 0;
                jobEl.textContent = myJobs;
            } else {
                jobEl.textContent = Array.isArray(list) ? list.length : '0';
            }
        }

        // ── Build Recent Activity Feed ────────────────────────────────────
        const activities = [];

        if (applicationsRes.status === 'fulfilled') {
            const d = applicationsRes.value;
            const list = d.data ?? d;
            if (Array.isArray(list)) {
                list.forEach(app => {
                    activities.push({
                        icon: '📋',
                        color: 'accent',
                        text: `Applied to <strong>${app.title || 'a job'}</strong> at ${app.company_name || '—'}`,
                        status: app.status,
                        date: new Date(app.created_at)
                    });
                });
            }
        }

        if (referralsRes.status === 'fulfilled') {
            const d = referralsRes.value;
            const list = d.data ?? d;
            if (Array.isArray(list)) {
                list.forEach(ref => {
                    activities.push({
                        icon: '⭐',
                        color: 'warning',
                        text: `Referral for <strong>${ref.title || 'a job'}</strong> at ${ref.company_name || '—'}`,
                        status: ref.status,
                        date: new Date(ref.created_at)
                    });
                });
            }
        }

        activities.sort((a, b) => b.date - a.date);

        const activityContainer = document.getElementById('recent-activity-list');
        if (activityContainer) {
            activityContainer.innerHTML = '';
            if (activities.length === 0) {
                activityContainer.innerHTML = `
                    <div class="empty-state" style="padding: 2rem 1rem;">
                        <div class="empty-state-icon">📭</div>
                        <h3>No recent activity</h3>
                        <p>Start applying to jobs or connecting with people!</p>
                    </div>`;
            } else {
                activities.slice(0, 6).forEach(act => {
                    const div = document.createElement('div');
                    div.className = 'activity-item';
                    div.innerHTML = `
                        <div class="activity-dot ${act.color}"></div>
                        <div style="flex: 1;">
                            <p class="activity-text">${act.icon} ${act.text}</p>
                            <span class="activity-time">${act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <span class="badge ${getBadgeClass(act.status)}">${act.status || ''}</span>
                    `;
                    activityContainer.appendChild(div);
                });
            }
        }

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (window.showToast) window.showToast("Failed to load some dashboard data.", "error");
    }
});

function getBadgeClass(status) {
    const map = {
        pending: 'badge-pending',
        accepted: 'badge-accepted',
        rejected: 'badge-rejected',
        applied: 'badge-applied',
        referred: 'badge-referred',
        interview: 'badge-interview',
        selected: 'badge-selected',
    };
    return map[(status || '').toLowerCase()] || 'badge-info';
}
