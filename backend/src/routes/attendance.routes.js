const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createSessionSchema,
  submitRecordsSchema,
  updateRecordSchema,
} = require('../validators/attendance.validator');

const router = express.Router();

// All attendance management endpoints are restricted to FACULTY
router.use(authenticate, authorizeRole('FACULTY'));

router.post('/sessions', validate(createSessionSchema), attendanceController.createSession);
router.post('/records', validate(submitRecordsSchema), attendanceController.submitRecords);
router.get('/', attendanceController.getAttendance);
router.get('/reports', attendanceController.getAttendanceReports);
router.put('/:id', validate(updateRecordSchema), attendanceController.updateAttendanceRecord);

module.exports = router;
