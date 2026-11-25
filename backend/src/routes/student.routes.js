const express = require('express');
const { z } = require('zod');
const studentController = require('../controllers/student.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const updateProfileSchema = z.object({
  phone: z.string().trim().max(30).optional().nullable(),
});

const router = express.Router();

// All student routes require authentication + STUDENT role
router.use(authenticate, authorizeRole('STUDENT'));

router.get('/dashboard', studentController.getDashboard);
router.get('/profile', studentController.getProfile);
router.put('/profile', validate(updateProfileSchema), studentController.updateProfile);
router.get('/attendance', studentController.getAttendance);
router.get('/attendance/summary', studentController.getAttendanceSummary);
router.get('/subjects', studentController.getSubjects);

module.exports = router;
