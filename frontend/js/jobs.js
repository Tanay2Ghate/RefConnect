document.addEventListener('DOMContentLoaded', async () => {
    if (!window.checkAuth) return;
    const user = await window.checkAuth();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.logout();
    });

    const jobsGrid = document.getElementById('jobs-grid');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const postJobBtn = document.getElementById('postJobBtn');
    const modal = document.getElementById('jobModal');

    // Show recruiter specific elements
    if (user.role === 'recruiter') {
        postJobBtn.style.display = 'block';
        document.getElementById('myPostsOption').style.display = 'block';
    }

    const fetchJobs = async () => {
        try {
            jobsGrid.innerHTML = '<div class="text-center text-muted col-span-full">Loading jobs...</div>';
            
            const q = searchInput.value.trim();
            const filter = filterSelect.value;
            
            let url = '/api/jobs';
            if (filter === 'matched' && user.role !== 'recruiter') {
                url = '/api/jobs/matched';
            }
            
            if (q) {
                url += `?q=${encodeURIComponent(q)}`;
            }

            const res = await window.api.get(url);
            if (!res.success) {
                throw new Error(res.message);
            }

            let jobs = res.data;
            
            // Client side filter for "My Posts"
            if (filter === 'my_posts' && user.role === 'recruiter') {
                jobs = jobs.filter(j => j.recruiter_id === user.user_id);
            }

            renderJobs(jobs);

        } catch (error) {
            console.error(error);
            jobsGrid.innerHTML = '<div class="text-center text-danger col-span-full">Failed to load jobs.</div>';
        }
    };

    const renderJobs = (jobs) => {
        jobsGrid.innerHTML = '';
        if (jobs.length === 0) {
            jobsGrid.innerHTML = '<div class="text-center text-muted col-span-full py-8">No jobs found matching your criteria.</div>';
            return;
        }

        jobs.forEach(job => {
            const card = document.createElement('div');
            card.className = 'card glass-card flex flex-col justify-between';
            card.style.cursor = 'pointer';
            
            const skillsHtml = (job.skills || []).slice(0, 3).map(s => `<span class="badge badge-info">${s}</span>`).join('');
            const moreSkills = (job.skills && job.skills.length > 3) ? `<span class="text-muted text-sm">+${job.skills.length - 3}</span>` : '';

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-lg font-bold">${job.title}</h3>
                        ${job.recruiter_id === user.user_id ? '<span class="badge badge-success">My Post</span>' : ''}
                    </div>
                    <p class="text-accent font-medium">${job.company_name}</p>
                    <p class="text-muted text-sm mt-1">📍 ${job.location}</p>
                    <p class="text-muted text-sm mt-1">💰 ₹${job.salary ? job.salary.toLocaleString() : 'Not specified'}</p>
                    <div class="flex gap-2 flex-wrap mt-4 mb-4">
                        ${skillsHtml} ${moreSkills}
                    </div>
                </div>
                <div>
                    <p class="text-sm text-muted mb-3">Deadline: ${new Date(job.deadline).toLocaleDateString()}</p>
                    <a href="job-detail.html?id=${job.job_id}" class="btn btn-outline w-full text-center">View Details</a>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if(e.target.tagName !== 'A') {
                    window.location.href = `job-detail.html?id=${job.job_id}`;
                }
            });

            jobsGrid.appendChild(card);
        });
    };

    // Event Listeners
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchJobs, 300);
    });

    filterSelect.addEventListener('change', fetchJobs);

    postJobBtn.addEventListener('click', () => {
        document.getElementById('jobForm').reset();
        modal.style.display = 'flex';
    });

    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const cancelJobBtn = document.getElementById('cancelJobBtn');
    if (cancelJobBtn) {
        cancelJobBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Close modal on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.getElementById('jobForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveJobBtn');
        btn.disabled = true;
        btn.textContent = 'Posting...';

        try {
            const body = {
                title: document.getElementById('job-title').value,
                company_name: document.getElementById('job-company').value,
                location: document.getElementById('job-location').value,
                salary: document.getElementById('job-salary').value || null,
                deadline: document.getElementById('job-deadline').value,
                description: document.getElementById('job-description').value,
                skills: document.getElementById('job-skills').value.split(',').map(s => s.trim()).filter(Boolean)
            };

            const res = await window.api.post('/api/jobs', body);
            if (res.success) {
                window.showToast("Job posted successfully!", "success");
                modal.style.display = 'none';
                fetchJobs();
            } else {
                window.showToast(res.message, "error");
            }
        } catch (error) {
            window.showToast("An error occurred", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Post Job';
        }
    });

    // Initial load
    fetchJobs();
});
