const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Faculty, Student } = require('../models');
const env = require('../config/env');
const AppError = require('../utils/AppError');

async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('Invalid authentication token.', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (_err) {
      throw new AppError('Session expired or invalid token. Please log in again.', 401, 'TOKEN_INVALID');
    }

    const userDoc = await User.findById(decoded.sub).select('-passwordHash');
    if (!userDoc || !userDoc.isActive) {
      throw new AppError('Account is inactive or no longer exists.', 401, 'ACCOUNT_INACTIVE');
    }

    const user = userDoc.toObject();
    if (user.role === 'FACULTY') {
      const fac = await Faculty.findOne({ userId: userDoc._id });
      user.faculty = fac ? fac.toObject() : null;
      user.student = null;
    } else {
      const stu = await Student.findOne({ userId: userDoc._id });
      user.student = stu ? stu.toObject() : null;
      user.faculty = null;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function authorizeRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to access this resource.', 403, 'FORBIDDEN')
      );
    }
    return next();
  };
}

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMITED',
  },
});

module.exports = {
  authenticate,
  authorizeRole,
  loginRateLimiter,
};
