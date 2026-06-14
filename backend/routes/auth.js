const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required: name, email, password, role.' });
    }

    // Validate role
    const validRoles = ['student', 'alumni', 'employee', 'recruiter'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    const userId = result.insertId;

    // Create blank profile
    await pool.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);

    // Start session
    req.session.userId = userId;
    req.session.name = name;
    req.session.email = email;
    req.session.role = role;

    res.status(201).json({
      success: true,
      data: { userId, name, email, role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find user by email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Start session
    req.session.userId = user.user_id;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.role = user.role;

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  res.json({
    success: true,
    data: {
      userId: req.session.userId,
      name: req.session.name,
      email: req.session.email,
      role: req.session.role
    }
  });
});

module.exports = router;
