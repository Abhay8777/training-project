const express = require('express');
const facultyController = require('../controllers/faculty.controller');
const { authenticate, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createStudentSchema,
  updateStudentSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createClassSchema,
  assignClassStudentsSchema,
  updateFacultyProfileSchema,
} = require('../validators/faculty.validator');

const router = express.Router();

// All faculty routes require authentication + FACULTY role
router.use(authenticate, authorizeRole('FACULTY'));

router.get('/dashboard', facultyController.getDashboard);
router.get('/metadata', facultyController.getAcademicMetadata);
router.put('/profile', validate(updateFacultyProfileSchema), facultyController.updateFacultyProfile);

// Student Management
router.get('/students', facultyController.listStudents);
router.get('/students/:id', facultyController.getStudentById);
router.post('/students', validate(createStudentSchema), facultyController.createStudent);
router.put('/students/:id', validate(updateStudentSchema), facultyController.updateStudent);
router.delete('/students/:id', facultyController.deleteStudent);

// Subject Management
router.get('/subjects', facultyController.listSubjects);
router.post('/subjects', validate(createSubjectSchema), facultyController.createSubject);
router.put('/subjects/:id', validate(updateSubjectSchema), facultyController.updateSubject);
router.delete('/subjects/:id', facultyController.deleteSubject);
router.post('/subjects/:id/assign', facultyController.assignSubjectToFaculty);

// Class Management
router.get('/classes', facultyController.listClasses);
router.post('/classes', validate(createClassSchema), facultyController.createClass);
router.post('/classes/:id/students', validate(assignClassStudentsSchema), facultyController.assignStudentsToClass);

module.exports = router;
