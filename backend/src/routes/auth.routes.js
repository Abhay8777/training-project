const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate, loginRateLimiter } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/faculty/login', loginRateLimiter, validate(loginSchema), authController.facultyLogin);
router.post('/student/login', loginRateLimiter, validate(loginSchema), authController.studentLogin);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', loginRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', loginRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
