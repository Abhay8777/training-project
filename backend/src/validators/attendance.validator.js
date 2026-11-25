const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

const createSessionSchema = z.object({
  subjectId: objectIdSchema,
  classId: objectIdSchema,
  section: z.string().trim().min(1).max(10).default('A'),
  sessionDate: z.string().min(8, 'Valid session date is required'),
  topic: z.string().trim().max(200).optional().nullable(),
});

const submitRecordsSchema = z.object({
  sessionId: objectIdSchema,
  allowUpdate: z.boolean().optional().default(false),
  records: z
    .array(
      z.object({
        studentId: objectIdSchema,
        status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
        remarks: z.string().trim().max(250).optional().nullable(),
      })
    )
    .min(1, 'At least one student attendance record is required'),
});

const updateRecordSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  remarks: z.string().trim().max(250).optional().nullable(),
});

module.exports = {
  createSessionSchema,
  submitRecordsSchema,
  updateRecordSchema,
};
