document.addEventListener('DOMContentLoaded', async () => {
    if (!window.checkAuth) return;
    const user = await window.checkAuth();
    if (!user) return;

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.logout();
    });

    let currentSkills = [];

    const loadProfile = async () => {
        try {
            const res = await window.api.get(`/api/profile/${user.user_id}`);
            if (res.success) {
                const profile = res.data;
                const userInfo = profile.user;
                const skills = profile.skills || [];
                currentSkills = [...skills];

                // Update View Mode
                document.getElementById('view-name').textContent = userInfo.name;
                document.getElementById('profile-avatar').textContent = userInfo.name.charAt(0).toUpperCase();
                
                const roleBadge = document.getElementById('view-role');
                roleBadge.textContent = userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1);
                roleBadge.className = `badge badge-${userInfo.role}`;

                document.getElementById('view-bio').textContent = profile.bio || 'No bio provided.';
                const locationText = document.getElementById('view-location-text') || document.getElementById('view-location');
                if (locationText) locationText.textContent = profile.location || '';
                document.getElementById('view-experience').textContent = profile.experience || 'Not provided.';
                document.getElementById('view-education').textContent = profile.education || 'Not provided.';

                const skillsContainer = document.getElementById('view-skills');
                skillsContainer.innerHTML = '';
                if (skills.length === 0) {
                    skillsContainer.innerHTML = '<span class="text-muted">No skills added.</span>';
                } else {
                    skills.forEach(skill => {
                        const pill = document.createElement('span');
                        pill.className = 'badge badge-info';
                        pill.textContent = skill;
                        skillsContainer.appendChild(pill);
                    });
                }

                // Links
                const resumeLink = document.getElementById('view-resume');
                if (profile.resume_link) {
                    resumeLink.href = profile.resume_link;
                    resumeLink.style.display = 'inline-block';
                } else {
                    resumeLink.style.display = 'none';
                }

                const linkedinLink = document.getElementById('view-linkedin');
                if (profile.linkedin) {
                    linkedinLink.href = profile.linkedin;
                    linkedinLink.style.display = 'inline-block';
                } else {
                    linkedinLink.style.display = 'none';
                }

                const githubLink = document.getElementById('view-github');
                if (profile.github) {
                    githubLink.href = profile.github;
                    githubLink.style.display = 'inline-block';
                } else {
                    githubLink.style.display = 'none';
                }

                // Populate Edit Form
                document.getElementById('edit-bio').value = profile.bio || '';
                document.getElementById('edit-location').value = profile.location || '';
                document.getElementById('edit-experience').value = profile.experience || '';
                document.getElementById('edit-education').value = profile.education || '';
                document.getElementById('edit-resume').value = profile.resume_link || '';
                document.getElementById('edit-linkedin').value = profile.linkedin || '';
                document.getElementById('edit-github').value = profile.github || '';

                renderEditSkills();
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
            window.showToast("Failed to load profile", "error");
        }
    };

    const renderEditSkills = () => {
        const container = document.getElementById('edit-skills-container');
        container.innerHTML = '';
        currentSkills.forEach((skill, index) => {
            const pill = document.createElement('span');
            pill.className = 'badge badge-info flex items-center gap-2';
            pill.innerHTML = `${skill} <button type="button" class="btn-close" data-index="${index}">&times;</button>`;
            container.appendChild(pill);
        });

        // Add event listeners to remove buttons
        container.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                currentSkills.splice(index, 1);
                renderEditSkills();
            });
        });
    };

    // View/Edit Toggle
    const viewSection = document.getElementById('view-profile');
    const editSection = document.getElementById('edit-profile');
    
    document.getElementById('editBtn').addEventListener('click', () => {
        viewSection.style.display = 'none';
        editSection.style.display = 'block';
        document.getElementById('editBtn').style.display = 'none';
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        editSection.style.display = 'none';
        viewSection.style.display = 'block';
        document.getElementById('editBtn').style.display = 'block';
        loadProfile(); // reset fields
    });

    // Skill Input
    document.getElementById('skill-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !currentSkills.includes(val)) {
                currentSkills.push(val);
                renderEditSkills();
                e.target.value = '';
            }
        }
    });

    // Save Profile
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const profileData = {
                bio: document.getElementById('edit-bio').value,
                location: document.getElementById('edit-location').value,
                experience: document.getElementById('edit-experience').value,
                education: document.getElementById('edit-education').value,
                resume_link: document.getElementById('edit-resume').value,
                linkedin: document.getElementById('edit-linkedin').value,
                github: document.getElementById('edit-github').value
            };

            const profileRes = await window.api.put('/api/profile', profileData);
            
            if (profileRes.success) {
                const skillsRes = await window.api.put('/api/profile/skills', { skills: currentSkills });
                if (skillsRes.success) {
                    window.showToast("Profile updated successfully", "success");
                    editSection.style.display = 'none';
                    viewSection.style.display = 'block';
                    document.getElementById('editBtn').style.display = 'block';
                    loadProfile();
                } else {
                    window.showToast(skillsRes.message || "Failed to update skills", "error");
                }
            } else {
                window.showToast(profileRes.message || "Failed to update profile", "error");
            }
        } catch (error) {
            console.error(error);
            window.showToast("An error occurred while saving", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });

    loadProfile();
});
