document.addEventListener('DOMContentLoaded', async () => {
    if (!window.checkAuth) return;
    const user = await window.checkAuth();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.logout();
    });

    const loadMyConnections = async () => {
        const container = document.getElementById('my-connections');
        container.innerHTML = '<div class="text-center text-muted col-span-full">Loading...</div>';
        try {
            const res = await window.api.get('/api/connections');
            if(res.success) {
                container.innerHTML = '';
                if(res.data.length === 0) {
                    container.innerHTML = '<div class="text-center text-muted col-span-full">You have no connections yet. Go to Discover to find people.</div>';
                    return;
                }
                res.data.forEach(c => {
                    container.innerHTML += `
                        <div class="card glass-card text-center">
                            <div class="avatar-placeholder mx-auto mb-3 text-2xl" style="width:60px; height:60px;">${c.name.charAt(0).toUpperCase()}</div>
                            <h3 class="font-medium">${c.name}</h3>
                            <p class="text-sm text-muted mb-4">${c.role.charAt(0).toUpperCase() + c.role.slice(1)}</p>
                        </div>
                    `;
                });
            }
        } catch(e) {
            container.innerHTML = '<div class="text-center text-danger col-span-full">Error loading connections</div>';
        }
    };

    const loadRequests = async () => {
        const container = document.getElementById('requests');
        const badge = document.getElementById('reqBadge');
        container.innerHTML = '<div class="text-center text-muted col-span-full">Loading...</div>';
        try {
            const res = await window.api.get('/api/connections/requests');
            if(res.success) {
                container.innerHTML = '';
                if(res.data.length === 0) {
                    badge.style.display = 'none';
                    container.innerHTML = '<div class="text-center text-muted col-span-full">No pending requests.</div>';
                    return;
                }
                
                badge.style.display = 'inline-block';
                badge.textContent = res.data.length;

                res.data.forEach(req => {
                    const card = document.createElement('div');
                    card.className = 'card glass-card text-center';
                    card.innerHTML = `
                        <div class="avatar-placeholder mx-auto mb-3 text-2xl" style="width:60px; height:60px;">${req.sender_name.charAt(0).toUpperCase()}</div>
                        <h3 class="font-medium">${req.sender_name}</h3>
                        <p class="text-sm text-muted mb-4">${req.sender_role.charAt(0).toUpperCase() + req.sender_role.slice(1)}</p>
                        <div class="flex gap-2 justify-center">
                            <button class="btn btn-sm btn-primary accept-btn" data-id="${req.connection_id}">Accept</button>
                            <button class="btn btn-sm btn-danger reject-btn" data-id="${req.connection_id}">Reject</button>
                        </div>
                    `;
                    container.appendChild(card);
                });

                document.querySelectorAll('.accept-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const res = await window.api.put(`/api/connections/${id}/accept`);
                        if(res.success) { window.showToast("Accepted"); loadRequests(); loadMyConnections(); }
                    });
                });
                document.querySelectorAll('.reject-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const res = await window.api.put(`/api/connections/${id}/reject`);
                        if(res.success) { window.showToast("Rejected"); loadRequests(); }
                    });
                });
            }
        } catch(e) {
            container.innerHTML = '<div class="text-center text-danger col-span-full">Error loading requests</div>';
        }
    };

    const loadDiscover = async () => {
        const container = document.getElementById('discover');
        container.innerHTML = '<div class="text-center text-muted col-span-full">Loading...</div>';
        try {
            const res = await window.api.get('/api/connections/suggestions');
            if(res.success) {
                container.innerHTML = '';
                if(res.data.length === 0) {
                    container.innerHTML = '<div class="text-center text-muted col-span-full">No suggestions at this time.</div>';
                    return;
                }
                res.data.forEach(u => {
                    const card = document.createElement('div');
                    card.className = 'card glass-card text-center';
                    card.innerHTML = `
                        <div class="avatar-placeholder mx-auto mb-3 text-2xl" style="width:60px; height:60px;">${u.name.charAt(0).toUpperCase()}</div>
                        <h3 class="font-medium">${u.name}</h3>
                        <p class="text-sm text-muted mb-4">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</p>
                        <button class="btn btn-sm btn-outline connect-btn" data-id="${u.user_id}">Connect</button>
                    `;
                    container.appendChild(card);
                });

                document.querySelectorAll('.connect-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.target.disabled = true;
                        e.target.textContent = 'Sending...';
                        const id = e.target.getAttribute('data-id');
                        const res = await window.api.post(`/api/connections/request`, { receiver_id: id });
                        if(res.success) { 
                            window.showToast("Request sent", "success"); 
                            e.target.textContent = 'Sent';
                        } else {
                            window.showToast(res.message, "error");
                            e.target.disabled = false;
                            e.target.textContent = 'Connect';
                        }
                    });
                });
            }
        } catch(e) {
            container.innerHTML = '<div class="text-center text-danger col-span-full">Error loading suggestions</div>';
        }
    };

    // Tabs logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => { c.style.display = 'none'; });

            tab.classList.add('active');
            const target = document.getElementById(tab.getAttribute('data-tab'));
            if (target) target.style.display = 'grid';
        });
    });

    loadMyConnections();
    loadRequests();
    loadDiscover();
});
