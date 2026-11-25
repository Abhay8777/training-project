require('dotenv').config();

const parseNumber = (val, fallback) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

const env = {
  port: parseNumber(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-attendance-super-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  lateWeight: Math.min(1, Math.max(0, parseNumber(process.env.LATE_WEIGHT, 0.5))),
  lowAttendanceThreshold: parseNumber(process.env.LOW_ATTENDANCE_THRESHOLD, 75),
};

module.exports = env;
