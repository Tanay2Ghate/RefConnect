const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// All connection routes require authentication
router.use(requireAuth);

// GET /api/connections - List accepted connections for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [connections] = await pool.query(
      `SELECT c.connection_id, c.status, c.created_at,
              CASE WHEN c.sender_id = ? THEN c.receiver_id ELSE c.sender_id END AS connected_user_id,
              CASE WHEN c.sender_id = ? THEN u2.name ELSE u1.name END AS connected_user_name,
              CASE WHEN c.sender_id = ? THEN u2.email ELSE u1.email END AS connected_user_email,
              CASE WHEN c.sender_id = ? THEN u2.role ELSE u1.role END AS connected_user_role
       FROM connections c
       JOIN users u1 ON c.sender_id = u1.user_id
       JOIN users u2 ON c.receiver_id = u2.user_id
       WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
       ORDER BY c.created_at DESC`,
      [userId, userId, userId, userId, userId, userId]
    );

    res.json({ success: true, data: connections });
  } catch (error) {
    console.error('List connections error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// GET /api/connections/requests - Pending incoming requests
router.get('/requests', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [requests] = await pool.query(
      `SELECT c.connection_id, c.sender_id, c.status, c.created_at,
              u.name AS sender_name, u.email AS sender_email, u.role AS sender_role
       FROM connections c
       JOIN users u ON c.sender_id = u.user_id
       WHERE c.receiver_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// GET /api/connections/suggestions - Users not yet connected (limit 20)
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [suggestions] = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role,
              p.bio, p.education, p.location
       FROM users u
       LEFT JOIN profiles p ON u.user_id = p.user_id
       WHERE u.user_id != ?
         AND u.user_id NOT IN (
           SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
           FROM connections
           WHERE (sender_id = ? OR receiver_id = ?)
             AND status IN ('pending', 'accepted')
         )
       ORDER BY u.created_at DESC
       LIMIT 20`,
      [userId, userId, userId, userId]
    );

    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// POST /api/connections/request - Send connection request
router.post('/request', async (req, res) => {
  try {
    const senderId = req.session.userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required.' });
    }

    if (parseInt(receiverId) === senderId) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
    }

    // Check receiver exists
    const [receiver] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [receiverId]);
    if (receiver.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check no existing connection (in either direction)
    const [existing] = await pool.query(
      `SELECT connection_id, status FROM connections
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );

    if (existing.length > 0) {
      const conn = existing[0];
      if (conn.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'You are already connected with this user.' });
      }
      if (conn.status === 'pending') {
        return res.status(400).json({ success: false, message: 'A connection request already exists.' });
      }
      // If rejected, allow re-sending by updating
      if (conn.status === 'rejected') {
        await pool.query(
          'UPDATE connections SET sender_id = ?, receiver_id = ?, status = \'pending\', created_at = NOW() WHERE connection_id = ?',
          [senderId, receiverId, conn.connection_id]
        );
        return res.status(201).json({ success: true, message: 'Connection request re-sent.' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO connections (sender_id, receiver_id, status) VALUES (?, ?, \'pending\')',
      [senderId, receiverId]
    );

    res.status(201).json({
      success: true,
      data: { connectionId: result.insertId, senderId, receiverId, status: 'pending' }
    });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/connections/:id/accept - Accept if receiver
router.put('/:id/accept', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [connections] = await pool.query(
      'SELECT * FROM connections WHERE connection_id = ?',
      [id]
    );

    if (connections.length === 0) {
      return res.status(404).json({ success: false, message: 'Connection request not found.' });
    }

    const connection = connections[0];

    if (connection.receiver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the receiver can accept this request.' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot accept a request with status: ${connection.status}` });
    }

    await pool.query(
      'UPDATE connections SET status = \'accepted\' WHERE connection_id = ?',
      [id]
    );

    res.json({ success: true, message: 'Connection accepted.' });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// PUT /api/connections/:id/reject - Reject if receiver
router.put('/:id/reject', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [connections] = await pool.query(
      'SELECT * FROM connections WHERE connection_id = ?',
      [id]
    );

    if (connections.length === 0) {
      return res.status(404).json({ success: false, message: 'Connection request not found.' });
    }

    const connection = connections[0];

    if (connection.receiver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the receiver can reject this request.' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a request with status: ${connection.status}` });
    }

    await pool.query(
      'UPDATE connections SET status = \'rejected\' WHERE connection_id = ?',
      [id]
    );

    res.json({ success: true, message: 'Connection rejected.' });
  } catch (error) {
    console.error('Reject connection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

module.exports = router;
