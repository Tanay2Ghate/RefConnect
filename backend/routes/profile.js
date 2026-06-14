const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/profile/:userId - Get profile + user info + skills for any user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user + profile info
    const [rows] = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
              p.profile_id, p.bio, p.education, p.experience,
              p.resume_link, p.linkedin, p.github, p.location
       FROM users u
       LEFT JOIN profiles p ON u.user_id = p.user_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const profile = rows[0];

    // Get user skills
    const [skills] = await pool.query(
      `SELECT s.skill_id, s.skill_name
       FROM skills s
       JOIN user_skills us ON s.skill_id = us.skill_id
       WHERE us.user_id = ?`,
      [userId]
    );

    profile.skills = skills;

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/profile - Update own profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { bio, education, experience, resume_link, linkedin, github, location } = req.body;

    // Check if profile exists
    const [existing] = await pool.query('SELECT profile_id FROM profiles WHERE user_id = ?', [userId]);

    if (existing.length === 0) {
      // Create profile if it doesn't exist
      await pool.query(
        `INSERT INTO profiles (user_id, bio, education, experience, resume_link, linkedin, github, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, bio || null, education || null, experience || null, resume_link || null, linkedin || null, github || null, location || null]
      );
    } else {
      // Update existing profile
      await pool.query(
        `UPDATE profiles
         SET bio = ?, education = ?, experience = ?, resume_link = ?,
             linkedin = ?, github = ?, location = ?
         WHERE user_id = ?`,
        [bio || null, education || null, experience || null, resume_link || null, linkedin || null, github || null, location || null, userId]
      );
    }

    // Fetch updated profile
    const [updated] = await pool.query(
      `SELECT p.*, u.name, u.email, u.role
       FROM profiles p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.user_id = ?`,
      [userId]
    );

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/profile/skills - Update own skills
router.put('/skills', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ success: false, message: 'Skills must be an array of skill names.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Remove existing user_skills
      await connection.query('DELETE FROM user_skills WHERE user_id = ?', [userId]);

      if (skills.length > 0) {
        // Upsert each skill and link to user
        for (const skillName of skills) {
          const trimmed = skillName.trim();
          if (!trimmed) continue;

          // Insert skill if it doesn't exist
          await connection.query(
            'INSERT IGNORE INTO skills (skill_name) VALUES (?)',
            [trimmed]
          );

          // Get the skill_id
          const [skillRows] = await connection.query(
            'SELECT skill_id FROM skills WHERE skill_name = ?',
            [trimmed]
          );

          if (skillRows.length > 0) {
            await connection.query(
              'INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)',
              [userId, skillRows[0].skill_id]
            );
          }
        }
      }

      await connection.commit();

      // Fetch updated skills
      const [updatedSkills] = await pool.query(
        `SELECT s.skill_id, s.skill_name
         FROM skills s
         JOIN user_skills us ON s.skill_id = us.skill_id
         WHERE us.user_id = ?`,
        [userId]
      );

      res.json({ success: true, data: updatedSkills });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
