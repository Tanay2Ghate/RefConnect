const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// All application routes require authentication
router.use(requireAuth);

// GET /api/applications - List user's applications with job details
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const role = req.session.role;

    let query;
    let params;

    if (role === 'recruiter') {
      // Recruiters see applications for their jobs
      query = `
        SELECT a.application_id, a.applicant_id, a.job_id, a.status, a.created_at,
               u.name AS applicant_name, u.email AS applicant_email, u.role AS applicant_role,
               j.title AS job_title, j.company_name
        FROM applications a
        JOIN users u ON a.applicant_id = u.user_id
        JOIN jobs j ON a.job_id = j.job_id
        WHERE j.recruiter_id = ?
        ORDER BY a.created_at DESC`;
      params = [userId];
    } else {
      // Other users see their own applications
      query = `
        SELECT a.application_id, a.applicant_id, a.job_id, a.status, a.created_at,
               j.title AS job_title, j.company_name, j.location AS job_location,
               j.salary, j.deadline
        FROM applications a
        JOIN jobs j ON a.job_id = j.job_id
        WHERE a.applicant_id = ?
        ORDER BY a.created_at DESC`;
      params = [userId];
    }

    const [applications] = await pool.query(query, params);

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/applications - Apply to a job (check no duplicate)
router.post('/', async (req, res) => {
  try {
    const applicantId = req.session.userId;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'Job ID is required.' });
    }

    // Check job exists
    const [job] = await pool.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Check if deadline has passed
    if (job[0].deadline && new Date(job[0].deadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'The application deadline for this job has passed.' });
    }

    // Check for duplicate application
    const [existing] = await pool.query(
      'SELECT application_id FROM applications WHERE applicant_id = ? AND job_id = ?',
      [applicantId, jobId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already applied to this job.' });
    }

    const [result] = await pool.query(
      'INSERT INTO applications (applicant_id, job_id, status) VALUES (?, ?, \'applied\')',
      [applicantId, jobId]
    );

    res.status(201).json({
      success: true,
      data: {
        applicationId: result.insertId,
        applicantId,
        jobId: parseInt(jobId),
        status: 'applied'
      }
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/applications/:id/status - Recruiter updates application status
router.put('/:id/status', requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.session.userId;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['applied', 'referred', 'interview_scheduled', 'selected', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify the application exists and the recruiter owns the job
    const [applications] = await pool.query(
      `SELECT a.*, j.recruiter_id
       FROM applications a
       JOIN jobs j ON a.job_id = j.job_id
       WHERE a.application_id = ?`,
      [id]
    );

    if (applications.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (applications[0].recruiter_id !== recruiterId) {
      return res.status(403).json({ success: false, message: 'You can only update applications for your own jobs.' });
    }

    await pool.query(
      'UPDATE applications SET status = ? WHERE application_id = ?',
      [status, id]
    );

    res.json({
      success: true,
      data: {
        applicationId: parseInt(id),
        status
      }
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
