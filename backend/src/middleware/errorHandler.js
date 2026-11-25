const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // MongoDB duplicate key error
  if (err && err.code === 11000) {
    const fields = err.keyPattern ? Object.keys(err.keyPattern).join(', ') : 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields} already exists.`,
      code: 'DUPLICATE_RECORD',
    });
  }

  // Mongoose invalid ObjectId CastError
  if (err && err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path || 'ID'} format.`,
      code: 'INVALID_ID',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
