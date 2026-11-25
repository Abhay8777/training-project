const mongoose = require('mongoose');

const { Schema } = mongoose;

const baseOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
};

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['FACULTY', 'STUDENT'], required: true, index: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { ...baseOptions, collection: 'users' }
);

const departmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null },
  },
  { ...baseOptions, collection: 'departments' }
);

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    durationSemesters: { type: Number, default: 8 },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  },
  { ...baseOptions, collection: 'courses' }
);

const semesterSchema = new Schema(
  {
    number: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    isCurrent: { type: Boolean, default: false },
  },
  { ...baseOptions, collection: 'semesters' }
);
semesterSchema.index({ number: 1, academicYear: 1 }, { unique: true });

const facultySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    facultyCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, default: null },
    designation: { type: String, default: 'Assistant Professor' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    joiningDate: { type: Date, default: Date.now },
  },
  { ...baseOptions, collection: 'faculty' }
);

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    section: { type: String, required: true, uppercase: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  },
  { ...baseOptions, collection: 'classes' }
);
classSchema.index({ courseId: 1, semesterId: 1, section: 1, academicYear: 1 }, { unique: true });

const studentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true, index: true },
    phone: { type: String, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    section: { type: String, default: 'A', uppercase: true, trim: true },
    enrollmentDate: { type: Date, default: Date.now },
  },
  { ...baseOptions, collection: 'students' }
);

const subjectSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    credits: { type: Number, default: 3 },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  },
  { ...baseOptions, collection: 'subjects' }
);
subjectSchema.index({ courseId: 1, semesterId: 1 });

const facultySubjectSchema = new Schema(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null },
  },
  { ...baseOptions, collection: 'faculty_subjects' }
);
facultySubjectSchema.index({ facultyId: 1, subjectId: 1, classId: 1 }, { unique: true });

const enrollmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    enrolledAt: { type: Date, default: Date.now },
  },
  { ...baseOptions, collection: 'enrollments' }
);
enrollmentSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

const attendanceSessionSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    section: { type: String, required: true, uppercase: true, trim: true },
    sessionDate: { type: Date, required: true, index: true },
    topic: { type: String, default: null },
  },
  { ...baseOptions, collection: 'attendance_sessions' }
);
attendanceSessionSchema.index(
  { subjectId: 1, classId: 1, section: 1, sessionDate: 1 },
  { unique: true }
);

const attendanceRecordSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE'], required: true, index: true },
    remarks: { type: String, default: null },
    markedById: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
  },
  { ...baseOptions, collection: 'attendance_records' }
);
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { ...baseOptions, collection: 'password_reset_tokens' }
);

module.exports = {
  User: mongoose.model('User', userSchema),
  Department: mongoose.model('Department', departmentSchema),
  Course: mongoose.model('Course', courseSchema),
  Semester: mongoose.model('Semester', semesterSchema),
  Faculty: mongoose.model('Faculty', facultySchema),
  ClassModel: mongoose.model('Class', classSchema),
  Student: mongoose.model('Student', studentSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  FacultySubject: mongoose.model('FacultySubject', facultySubjectSchema),
  Enrollment: mongoose.model('Enrollment', enrollmentSchema),
  AttendanceSession: mongoose.model('AttendanceSession', attendanceSessionSchema),
  AttendanceRecord: mongoose.model('AttendanceRecord', attendanceRecordSchema),
  PasswordResetToken: mongoose.model('PasswordResetToken', passwordResetTokenSchema),
};
