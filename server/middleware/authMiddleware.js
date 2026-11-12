const jwt = require('jsonwebtoken');

function unauthorized(res) {
  return res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
}

function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('Authentication is unavailable because JWT_SECRET is not configured.');
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured',
    });
  }

  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;

  if (!match) {
    return unauthorized(res);
  }

  let payload;
  try {
    payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
  } catch (error) {
    return unauthorized(res);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !/^[1-9]\d*$/.test(payload.sub)
  ) {
    return unauthorized(res);
  }

  req.user = { id: payload.sub };
  return next();
}

module.exports = authMiddleware;
