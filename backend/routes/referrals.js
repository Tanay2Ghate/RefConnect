const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// All referral routes require authentication
router.use(requireAuth);

// GET /api/referrals - All referrals where user is applicant or referrer
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [referrals] = await pool.query(
      `SELECT r.referral_id, r.applicant_id, r.referrer_id, r.job_id,
              r.status, r.message, r.created_at,
              applicant.name AS applicant_name, applicant.email AS applicant_email,
              referrer.name AS referrer_name, referrer.email AS referrer_email,
              j.title AS job_title, j.company_name
       FROM referral_requests r
       JOIN users applicant ON r.applicant_id = applicant.user_id
       JOIN users referrer ON r.referrer_id = referrer.user_id
       JOIN jobs j ON r.job_id = j.job_id
       WHERE r.applicant_id = ? OR r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [userId, userId]
    );

    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('List referrals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/referrals/request - Create referral request (must be connected)
router.post('/request', async (req, res) => {
  try {
    const applicantId = req.session.userId;
    const { referrerId, jobId, message } = req.body;

    if (!referrerId || !jobId) {
      return res.status(400).json({ success: false, message: 'Referrer ID and Job ID are required.' });
    }

    if (parseInt(referrerId) === applicantId) {
      return res.status(400).json({ success: false, message: 'You cannot request a referral from yourself.' });
    }

    // Check that the referrer exists
    const [referrer] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [referrerId]);
    if (referrer.length === 0) {
      return res.status(404).json({ success: false, message: 'Referrer not found.' });
    }

    // Check that the job exists
    const [job] = await pool.query('SELECT job_id FROM jobs WHERE job_id = ?', [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Check that users are connected
    const [connection] = await pool.query(
      `SELECT connection_id FROM connections
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND status = 'accepted'`,
      [applicantId, referrerId, referrerId, applicantId]
    );

    if (connection.length === 0) {
      return res.status(400).json({ success: false, message: 'You must be connected with the referrer to request a referral.' });
    }

    // Check for duplicate referral request
    const [existing] = await pool.query(
      `SELECT referral_id FROM referral_requests
       WHERE applicant_id = ? AND referrer_id = ? AND job_id = ? AND status = 'pending'`,
      [applicantId, referrerId, jobId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A pending referral request already exists for this job and referrer.' });
    }

    const [result] = await pool.query(
      'INSERT INTO referral_requests (applicant_id, referrer_id, job_id, status, message) VALUES (?, ?, ?, \'pending\', ?)',
      [applicantId, referrerId, jobId, message || null]
    );

    res.status(201).json({
      success: true,
      data: {
        referralId: result.insertId,
        applicantId,
        referrerId: parseInt(referrerId),
        jobId: parseInt(jobId),
        status: 'pending',
        message: message || null
      }
    });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/referrals/:id/accept - Referrer accepts
router.put('/:id/accept', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [referrals] = await pool.query(
      'SELECT * FROM referral_requests WHERE referral_id = ?',
      [id]
    );

    if (referrals.length === 0) {
      return res.status(404).json({ success: false, message: 'Referral request not found.' });
    }

    const referral = referrals[0];

    if (referral.referrer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the referrer can accept this request.' });
    }

    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot accept a referral with status: ${referral.status}` });
    }

    await pool.query(
      'UPDATE referral_requests SET status = \'accepted\' WHERE referral_id = ?',
      [id]
    );

    // Optionally update the application status to 'referred' if one exists
    await pool.query(
      `UPDATE applications SET status = 'referred'
       WHERE applicant_id = ? AND job_id = ? AND status = 'applied'`,
      [referral.applicant_id, referral.job_id]
    );

    res.json({ success: true, message: 'Referral accepted.' });
  } catch (error) {
    console.error('Accept referral error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/referrals/:id/reject - Referrer rejects
router.put('/:id/reject', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [referrals] = await pool.query(
      'SELECT * FROM referral_requests WHERE referral_id = ?',
      [id]
    );

    if (referrals.length === 0) {
      return res.status(404).json({ success: false, message: 'Referral request not found.' });
    }

    const referral = referrals[0];

    if (referral.referrer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the referrer can reject this request.' });
    }

    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a referral with status: ${referral.status}` });
    }

    await pool.query(
      'UPDATE referral_requests SET status = \'rejected\' WHERE referral_id = ?',
      [id]
    );

    res.json({ success: true, message: 'Referral rejected.' });
  } catch (error) {
    console.error('Reject referral error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
