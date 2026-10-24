const { sendError } = require('../lib/errors');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'Please log in to continue.');
  }
  next();
}

module.exports = { requireAuth };