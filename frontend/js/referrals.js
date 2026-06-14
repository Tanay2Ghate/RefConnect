document.addEventListener('DOMContentLoaded', async () => {
    if (!window.checkAuth) return;
    const user = await window.checkAuth();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.logout();
    });

    const loadReferrals = async () => {
        const receivedContainer = document.getElementById('received');
        const sentContainer = document.getElementById('sent');
        
        receivedContainer.innerHTML = '<div class="text-center text-muted">Loading...</div>';
        sentContainer.innerHTML = '<div class="text-center text-muted">Loading...</div>';

        try {
            const res = await window.api.get('/api/referrals');
            if(res.success) {
                receivedContainer.innerHTML = '';
                sentContainer.innerHTML = '';
                
                const received = res.data.filter(r => r.referrer_id === user.user_id);
                const sent = res.data.filter(r => r.applicant_id === user.user_id);

                if(received.length === 0) receivedContainer.innerHTML = '<div class="text-center text-muted py-4">No referral requests received.</div>';
                if(sent.length === 0) sentContainer.innerHTML = '<div class="text-center text-muted py-4">No referral requests sent.</div>';

                received.forEach(r => {
                    const card = document.createElement('div');
                    card.className = 'card glass-card flex justify-between items-center';
                    let actions = '';
                    if(r.status === 'pending') {
                        actions = `
                            <div class="flex gap-2">
                                <button class="btn btn-sm btn-primary accept-btn" data-id="${r.referral_id}">Accept</button>
                                <button class="btn btn-sm btn-danger reject-btn" data-id="${r.referral_id}">Reject</button>
                            </div>
                        `;
                    }
                    card.innerHTML = `
                        <div>
                            <h3 class="font-medium">${r.applicant_name} <span class="text-muted text-sm font-normal">requested a referral for</span></h3>
                            <p class="text-accent font-bold mt-1"><a href="job-detail.html?id=${r.job_id}" class="hover-underline">${r.title} at ${r.company_name}</a></p>
                            ${r.message ? `<p class="text-secondary mt-2 p-3 bg-card rounded text-sm italic">"${r.message}"</p>` : ''}
                            <p class="text-muted text-xs mt-2">${new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex flex-col items-end gap-2">
                            <span class="badge badge-${r.status}">${r.status.toUpperCase()}</span>
                            ${actions}
                        </div>
                    `;
                    receivedContainer.appendChild(card);
                });

                sent.forEach(r => {
                    const card = document.createElement('div');
                    card.className = 'card glass-card flex justify-between items-center';
                    card.innerHTML = `
                        <div>
                            <h3 class="font-medium"><span class="text-muted text-sm font-normal">You asked</span> ${r.referrer_name} <span class="text-muted text-sm font-normal">for</span></h3>
                            <p class="text-accent font-bold mt-1"><a href="job-detail.html?id=${r.job_id}" class="hover-underline">${r.title} at ${r.company_name}</a></p>
                            ${r.message ? `<p class="text-secondary mt-2 p-3 bg-card rounded text-sm italic">"${r.message}"</p>` : ''}
                            <p class="text-muted text-xs mt-2">${new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <span class="badge badge-${r.status}">${r.status.toUpperCase()}</span>
                        </div>
                    `;
                    sentContainer.appendChild(card);
                });

                // Attach event listeners for accept/reject
                document.querySelectorAll('.accept-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const rRes = await window.api.put(`/api/referrals/${id}/accept`);
                        if(rRes.success) { window.showToast("Referral accepted", "success"); loadReferrals(); }
                        else window.showToast(rRes.message, "error");
                    });
                });
                document.querySelectorAll('.reject-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const rRes = await window.api.put(`/api/referrals/${id}/reject`);
                        if(rRes.success) { window.showToast("Referral rejected", "success"); loadReferrals(); }
                        else window.showToast(rRes.message, "error");
                    });
                });
            }
        } catch (e) {
            receivedContainer.innerHTML = '<div class="text-center text-danger">Error loading referrals</div>';
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
            if (target) target.style.display = 'flex';
        });
    });

    loadReferrals();
});
