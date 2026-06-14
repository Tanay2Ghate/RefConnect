document.addEventListener('DOMContentLoaded', async () => {
    if (!window.checkAuth) return;
    const user = await window.checkAuth();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.logout();
    });

    const isRecruiter = user.role === 'recruiter';
    
    if (isRecruiter) {
        document.getElementById('page-title').textContent = "Applications for My Jobs";
        document.getElementById('col-name').textContent = "Applicant Name";
        document.getElementById('col-company').textContent = "Job Title";
        document.getElementById('col-actions').style.display = "table-cell";
    }

    const loadApplications = async () => {
        const tbody = document.getElementById('app-tbody');
        try {
            const res = await window.api.get('/api/applications');
            if(res.success) {
                tbody.innerHTML = '';
                if(res.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-muted">No applications found.</td></tr>`;
                    return;
                }

                res.data.forEach(app => {
                    const tr = document.createElement('tr');
                    tr.className = "border-b border-glass hover:bg-card-hover transition-colors";
                    
                    let col1 = `<a href="job-detail.html?id=${app.job_id}" class="hover-underline text-accent font-medium">${app.title}</a>`;
                    let col2 = app.company_name;
                    let actions = '';

                    if (isRecruiter) {
                        col1 = `<a href="profile.html?id=${app.applicant_id}" class="hover-underline text-accent font-medium">${app.applicant_name}</a>`;
                        col2 = `<a href="job-detail.html?id=${app.job_id}" class="hover-underline">${app.title}</a>`;
                        
                        actions = `
                            <td class="p-4">
                                <select class="form-select status-select" style="min-width: 150px;" data-id="${app.application_id}">
                                    <option value="applied" ${app.status==='applied'?'selected':''}>Applied</option>
                                    <option value="referred" ${app.status==='referred'?'selected':''}>Referred</option>
                                    <option value="interview_scheduled" ${app.status==='interview_scheduled'?'selected':''}>Interview Scheduled</option>
                                    <option value="selected" ${app.status==='selected'?'selected':''}>Selected</option>
                                    <option value="rejected" ${app.status==='rejected'?'selected':''}>Rejected</option>
                                </select>
                            </td>
                        `;
                    }

                    tr.innerHTML = `
                        <td class="p-4">${col1}</td>
                        <td class="p-4">${col2}</td>
                        <td class="p-4 text-muted">${new Date(app.created_at).toLocaleDateString()}</td>
                        <td class="p-4"><span class="badge badge-${app.status}">${app.status.replace('_', ' ').toUpperCase()}</span></td>
                        ${isRecruiter ? actions : ''}
                    `;
                    tbody.appendChild(tr);
                });

                if (isRecruiter) {
                    document.querySelectorAll('.status-select').forEach(select => {
                        select.addEventListener('change', async (e) => {
                            const appId = e.target.getAttribute('data-id');
                            const newStatus = e.target.value;
                            e.target.disabled = true;
                            const res = await window.api.put(`/api/applications/${appId}/status`, { status: newStatus });
                            if(res.success) {
                                window.showToast("Status updated", "success");
                                loadApplications();
                            } else {
                                window.showToast(res.message, "error");
                                e.target.disabled = false;
                            }
                        });
                    });
                }
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-danger">Failed to load applications.</td></tr>`;
        }
    };

    loadApplications();
});
