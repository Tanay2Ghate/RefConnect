/**
 * Middleware to require an authenticated session.
 * Checks for req.session.userId; returns 401 if missing.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * Middleware factory to restrict access to specific roles.
 * Usage: requireRole('recruiter') or requireRole('student', 'alumni')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ success: false, message: `Access denied. Required role(s): ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
