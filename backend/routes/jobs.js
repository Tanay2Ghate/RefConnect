const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/jobs - List all jobs with optional search and skill filter
router.get('/', async (req, res) => {
  try {
    const { q, skill } = req.query;

    let query = `
      SELECT j.*, u.name AS recruiter_name
      FROM jobs j
      JOIN users u ON j.recruiter_id = u.user_id
    `;
    const params = [];
    const conditions = [];

    // Skill filter: only return jobs that have the given skill
    if (skill) {
      query = `
        SELECT j.*, u.name AS recruiter_name
        FROM jobs j
        JOIN users u ON j.recruiter_id = u.user_id
        JOIN job_skills js ON j.job_id = js.job_id
        JOIN skills s ON js.skill_id = s.skill_id
      `;
      conditions.push('s.skill_name = ?');
      params.push(skill);
    }

    // Text search on title and company_name
    if (q) {
      conditions.push('(j.title LIKE ? OR j.company_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY j.created_at DESC';

    const [jobs] = await pool.query(query, params);

    // Attach skills to each job
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.job_id);
      const [allSkills] = await pool.query(
        `SELECT js.job_id, s.skill_id, s.skill_name
         FROM job_skills js
         JOIN skills s ON js.skill_id = s.skill_id
         WHERE js.job_id IN (?)`,
        [jobIds]
      );

      const skillMap = {};
      for (const sk of allSkills) {
        if (!skillMap[sk.job_id]) skillMap[sk.job_id] = [];
        skillMap[sk.job_id].push({ skill_id: sk.skill_id, skill_name: sk.skill_name });
      }

      for (const job of jobs) {
        job.skills = skillMap[job.job_id] || [];
      }
    }

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// GET /api/jobs/matched - Jobs matching current user's skills
router.get('/matched', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [jobs] = await pool.query(
      `SELECT DISTINCT j.*, u.name AS recruiter_name
       FROM jobs j
       JOIN users u ON j.recruiter_id = u.user_id
       JOIN job_skills js ON j.job_id = js.job_id
       JOIN user_skills us ON js.skill_id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY j.created_at DESC`,
      [userId]
    );

    // Attach skills to each job
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.job_id);
      const [allSkills] = await pool.query(
        `SELECT js.job_id, s.skill_id, s.skill_name
         FROM job_skills js
         JOIN skills s ON js.skill_id = s.skill_id
         WHERE js.job_id IN (?)`,
        [jobIds]
      );

      const skillMap = {};
      for (const sk of allSkills) {
        if (!skillMap[sk.job_id]) skillMap[sk.job_id] = [];
        skillMap[sk.job_id].push({ skill_id: sk.skill_id, skill_name: sk.skill_name });
      }

      for (const job of jobs) {
        job.skills = skillMap[job.job_id] || [];
      }
    }

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Matched jobs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// GET /api/jobs/:id - Single job with skills and recruiter info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [jobs] = await pool.query(
      `SELECT j.*, u.name AS recruiter_name, u.email AS recruiter_email
       FROM jobs j
       JOIN users u ON j.recruiter_id = u.user_id
       WHERE j.job_id = ?`,
      [id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const job = jobs[0];

    // Get job skills
    const [skills] = await pool.query(
      `SELECT s.skill_id, s.skill_name
       FROM skills s
       JOIN job_skills js ON s.skill_id = js.skill_id
       WHERE js.job_id = ?`,
      [id]
    );

    job.skills = skills;

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/jobs - Create a new job (recruiter only)
router.post('/', requireRole('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.session.userId;
    const { company_name, title, description, location, salary, deadline, skills } = req.body;

    // Validate required fields
    if (!company_name || !title || !description) {
      return res.status(400).json({ success: false, message: 'Company name, title, and description are required.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO jobs (recruiter_id, company_name, title, description, location, salary, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [recruiterId, company_name, title, description, location || null, salary || null, deadline || null]
      );

      const jobId = result.insertId;

      // Add job skills
      if (Array.isArray(skills) && skills.length > 0) {
        for (const skillName of skills) {
          const trimmed = skillName.trim();
          if (!trimmed) continue;

          // Upsert skill
          await connection.query('INSERT IGNORE INTO skills (skill_name) VALUES (?)', [trimmed]);

          const [skillRows] = await connection.query(
            'SELECT skill_id FROM skills WHERE skill_name = ?',
            [trimmed]
          );

          if (skillRows.length > 0) {
            await connection.query(
              'INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)',
              [jobId, skillRows[0].skill_id]
            );
          }
        }
      }

      await connection.commit();

      // Fetch the created job
      const [newJob] = await pool.query(
        `SELECT j.*, u.name AS recruiter_name
         FROM jobs j
         JOIN users u ON j.recruiter_id = u.user_id
         WHERE j.job_id = ?`,
        [jobId]
      );

      const [jobSkills] = await pool.query(
        `SELECT s.skill_id, s.skill_name
         FROM skills s
         JOIN job_skills js ON s.skill_id = js.skill_id
         WHERE js.job_id = ?`,
        [jobId]
      );

      newJob[0].skills = jobSkills;

      res.status(201).json({ success: true, data: newJob[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/jobs/:id - Recruiter updates own job
router.put('/:id', requireRole('recruiter'), async (req, res) => {
  try {
    const { id } = req.params;
    const recruiterId = req.session.userId;

    // Verify ownership
    const [existing] = await pool.query('SELECT * FROM jobs WHERE job_id = ? AND recruiter_id = ?', [id, recruiterId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or you do not own this job.' });
    }

    const { company_name, title, description, location, salary, deadline, skills } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE jobs
         SET company_name = COALESCE(?, company_name),
             title = COALESCE(?, title),
             description = COALESCE(?, description),
             location = COALESCE(?, location),
             salary = COALESCE(?, salary),
             deadline = COALESCE(?, deadline)
         WHERE job_id = ?`,
        [company_name, title, description, location, salary, deadline, id]
      );

      // Update job skills if provided
      if (Array.isArray(skills)) {
        await connection.query('DELETE FROM job_skills WHERE job_id = ?', [id]);

        for (const skillName of skills) {
          const trimmed = skillName.trim();
          if (!trimmed) continue;

          await connection.query('INSERT IGNORE INTO skills (skill_name) VALUES (?)', [trimmed]);

          const [skillRows] = await connection.query(
            'SELECT skill_id FROM skills WHERE skill_name = ?',
            [trimmed]
          );

          if (skillRows.length > 0) {
            await connection.query(
              'INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)',
              [id, skillRows[0].skill_id]
            );
          }
        }
      }

      await connection.commit();

      // Fetch updated job
      const [updatedJob] = await pool.query(
        `SELECT j.*, u.name AS recruiter_name
         FROM jobs j
         JOIN users u ON j.recruiter_id = u.user_id
         WHERE j.job_id = ?`,
        [id]
      );

      const [jobSkills] = await pool.query(
        `SELECT s.skill_id, s.skill_name
         FROM skills s
         JOIN job_skills js ON s.skill_id = js.skill_id
         WHERE js.job_id = ?`,
        [id]
      );

      updatedJob[0].skills = jobSkills;

      res.json({ success: true, data: updatedJob[0] });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// DELETE /api/jobs/:id - Recruiter deletes own job
router.delete('/:id', requireRole('recruiter'), async (req, res) => {
  try {
    const { id } = req.params;
    const recruiterId = req.session.userId;

    // Verify ownership
    const [existing] = await pool.query('SELECT * FROM jobs WHERE job_id = ? AND recruiter_id = ?', [id, recruiterId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or you do not own this job.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete related records first
      await connection.query('DELETE FROM job_skills WHERE job_id = ?', [id]);
      await connection.query('DELETE FROM applications WHERE job_id = ?', [id]);
      await connection.query('DELETE FROM referral_requests WHERE job_id = ?', [id]);
      await connection.query('DELETE FROM jobs WHERE job_id = ?', [id]);

      await connection.commit();

      res.json({ success: true, message: 'Job deleted successfully.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
