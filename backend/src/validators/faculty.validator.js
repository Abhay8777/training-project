const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

const createStudentSchema = z.object({
  studentCode: z.string().trim().min(3).max(30),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().nullable(),
  password: z.string().min(6).optional(),
  departmentId: objectIdSchema,
  courseId: objectIdSchema,
  semesterId: objectIdSchema,
  classId: objectIdSchema.optional().nullable(),
  section: z.string().trim().min(1).max(10).default('A'),
  enrollmentDate: z.string().optional(),
});

const updateStudentSchema = createStudentSchema
  .omit({ password: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

const createSubjectSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  credits: z.coerce.number().int().min(1).max(10).default(3),
  departmentId: objectIdSchema,
  courseId: objectIdSchema,
  semesterId: objectIdSchema,
  assignToMe: z.boolean().optional().default(true),
  classId: objectIdSchema.optional().nullable(),
});

const updateSubjectSchema = createSubjectSchema.omit({ assignToMe: true, classId: true }).partial();

const createClassSchema = z.object({
  name: z.string().trim().min(2).max(50),
  section: z.string().trim().min(1).max(10),
  academicYear: z.string().trim().min(4).max(20).default('2026-2027'),
  departmentId: objectIdSchema,
  courseId: objectIdSchema,
  semesterId: objectIdSchema,
});

const assignClassStudentsSchema = z.object({
  studentIds: z.array(objectIdSchema).min(1, 'Select at least one student'),
});

const updateFacultyProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  designation: z.string().trim().min(2).max(80).optional(),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createClassSchema,
  assignClassStudentsSchema,
  updateFacultyProfileSchema,
};
