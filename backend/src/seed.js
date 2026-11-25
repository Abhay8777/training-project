require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('./config/db');
const {
  User,
  Department,
  Course,
  Semester,
  Faculty,
  ClassModel,
  Student,
  Subject,
  FacultySubject,
  Enrollment,
  AttendanceSession,
  AttendanceRecord,
} = require('./models');

async function upsertDoc(Model, filter, createData, updateData = {}) {
  const existing = await Model.findOne(filter);
  if (existing) {
    if (Object.keys(updateData).length > 0) {
      return Model.findByIdAndUpdate(existing._id, updateData, { new: true });
    }
    return existing;
  }
  return Model.create(createData);
}

async function main() {
  await connectDB();
  console.log('Connected to MongoDB. Resetting and seeding Student Attendance Management System...');
  await mongoose.connection.dropDatabase();

  const saltRounds = 10;
  const facultyPasswordHash = await bcrypt.hash('Faculty@123', saltRounds);
  const studentPasswordHash = await bcrypt.hash('Student@123', saltRounds);

  // 1. Departments (2)
  const csDept = await upsertDoc(
    Department,
    { code: 'CSE' },
    {
      code: 'CSE',
      name: 'Computer Science & Engineering',
      description: 'Department of Computer Science, AI, and Software Systems',
    }
  );

  const eceDept = await upsertDoc(
    Department,
    { code: 'ECE' },
    {
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      description: 'Department of Electronics, Embedded Systems, and VLSI',
    }
  );

  // 2. Courses (2)
  const btechCs = await upsertDoc(
    Course,
    { code: 'BTECH-CS' },
    {
      code: 'BTECH-CS',
      name: 'B.Tech Computer Science',
      durationSemesters: 8,
      departmentId: csDept._id,
    }
  );

  const btechEce = await upsertDoc(
    Course,
    { code: 'BTECH-ECE' },
    {
      code: 'BTECH-ECE',
      name: 'B.Tech Electronics & Communication',
      durationSemesters: 8,
      departmentId: eceDept._id,
    }
  );

  // 3. Semesters
  const sem3 = await upsertDoc(
    Semester,
    { number: 3, academicYear: '2026-2027' },
    {
      number: 3,
      name: 'Semester 3',
      academicYear: '2026-2027',
      isCurrent: true,
    },
    { isCurrent: true }
  );

  await upsertDoc(
    Semester,
    { number: 5, academicYear: '2026-2027' },
    {
      number: 5,
      name: 'Semester 5',
      academicYear: '2026-2027',
      isCurrent: false,
    },
    { isCurrent: false }
  );

  // 4. Classes
  const classCs3A = await upsertDoc(
    ClassModel,
    { courseId: btechCs._id, semesterId: sem3._id, section: 'A', academicYear: '2026-2027' },
    {
      name: 'CS-3A',
      section: 'A',
      academicYear: '2026-2027',
      departmentId: csDept._id,
      courseId: btechCs._id,
      semesterId: sem3._id,
    }
  );

  const classEce3A = await upsertDoc(
    ClassModel,
    { courseId: btechEce._id, semesterId: sem3._id, section: 'A', academicYear: '2026-2027' },
    {
      name: 'ECE-3A',
      section: 'A',
      academicYear: '2026-2027',
      departmentId: eceDept._id,
      courseId: btechEce._id,
      semesterId: sem3._id,
    }
  );

  // 5. Faculty Account (1)
  const facultyUser = await upsertDoc(
    User,
    { email: 'arjun.mehta@campus.edu' },
    {
      email: 'arjun.mehta@campus.edu',
      passwordHash: facultyPasswordHash,
      role: 'FACULTY',
      mustChangePassword: true,
    }
  );

  const faculty = await upsertDoc(
    Faculty,
    { facultyCode: 'FAC-101' },
    {
      userId: facultyUser._id,
      facultyCode: 'FAC-101',
      fullName: 'Dr. Arjun Mehta',
      phone: '+91-9876543200',
      designation: 'Associate Professor',
      departmentId: csDept._id,
    }
  );

  // 6. Subjects (3)
  const subDsa = await upsertDoc(
    Subject,
    { code: 'CS301' },
    {
      code: 'CS301',
      name: 'Data Structures & Algorithms',
      credits: 4,
      departmentId: csDept._id,
      courseId: btechCs._id,
      semesterId: sem3._id,
    }
  );

  const subDbms = await upsertDoc(
    Subject,
    { code: 'CS302' },
    {
      code: 'CS302',
      name: 'Database Management Systems',
      credits: 4,
      departmentId: csDept._id,
      courseId: btechCs._id,
      semesterId: sem3._id,
    }
  );

  const subSignals = await upsertDoc(
    Subject,
    { code: 'EC301' },
    {
      code: 'EC301',
      name: 'Signals & Systems',
      credits: 3,
      departmentId: eceDept._id,
      courseId: btechEce._id,
      semesterId: sem3._id,
    }
  );

  const assignments = [
    { facultyId: faculty._id, subjectId: subDsa._id, classId: classCs3A._id },
    { facultyId: faculty._id, subjectId: subDbms._id, classId: classCs3A._id },
    { facultyId: faculty._id, subjectId: subSignals._id, classId: classEce3A._id },
  ];

  for (const a of assignments) {
    await upsertDoc(FacultySubject, a, a);
  }

  // 7. Students (10)
  const studentSeeds = [
    { code: 'STU-2026-001', name: 'Aarav Sharma', email: 'aarav.sharma@student.edu', phone: '+91-9810011001', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-002', name: 'Diya Patel', email: 'diya.patel@student.edu', phone: '+91-9810011002', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-003', name: 'Rohan Verma', email: 'rohan.verma@student.edu', phone: '+91-9810011003', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-004', name: 'Ananya Iyer', email: 'ananya.iyer@student.edu', phone: '+91-9810011004', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-005', name: 'Kabir Nair', email: 'kabir.nair@student.edu', phone: '+91-9810011005', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-006', name: 'Sneha Reddy', email: 'sneha.reddy@student.edu', phone: '+91-9810011006', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-007', name: 'Vikram Singh', email: 'vikram.singh@student.edu', phone: '+91-9810011007', dept: csDept, course: btechCs, cls: classCs3A, sem: sem3 },
    { code: 'STU-2026-008', name: 'Meera Joshi', email: 'meera.joshi@student.edu', phone: '+91-9810011008', dept: eceDept, course: btechEce, cls: classEce3A, sem: sem3 },
    { code: 'STU-2026-009', name: 'Aditya Kulkarni', email: 'aditya.kulkarni@student.edu', phone: '+91-9810011009', dept: eceDept, course: btechEce, cls: classEce3A, sem: sem3 },
    { code: 'STU-2026-010', name: 'Priya Menon', email: 'priya.menon@student.edu', phone: '+91-9810011010', dept: eceDept, course: btechEce, cls: classEce3A, sem: sem3 },
  ];

  const createdStudents = [];
  for (const s of studentSeeds) {
    const user = await upsertDoc(
      User,
      { email: s.email },
      {
        email: s.email,
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        mustChangePassword: true,
      }
    );

    const student = await upsertDoc(
      Student,
      { studentCode: s.code },
      {
        userId: user._id,
        studentCode: s.code,
        fullName: s.name,
        phone: s.phone,
        departmentId: s.dept._id,
        courseId: s.course._id,
        semesterId: s.sem._id,
        classId: s.cls._id,
        section: 'A',
      }
    );
    createdStudents.push({ student, cls: s.cls, dept: s.dept });

    const subjectsForStudent = s.dept._id.equals(csDept._id) ? [subDsa, subDbms] : [subSignals];
    for (const subj of subjectsForStudent) {
      await upsertDoc(
        Enrollment,
        { studentId: student._id, subjectId: subj._id },
        {
          studentId: student._id,
          subjectId: subj._id,
          classId: s.cls._id,
          semesterId: s.sem._id,
        }
      );
    }
  }

  // 8. Multiple Attendance Sessions & Records
  const csStudents = createdStudents.filter((x) => x.dept._id.equals(csDept._id)).map((x) => x.student);
  const eceStudents = createdStudents.filter((x) => x.dept._id.equals(eceDept._id)).map((x) => x.student);

  const sessionConfigs = [
    { subject: subDsa, cls: classCs3A, students: csStudents, daysAgo: 14, topic: 'Arrays, Linked Lists & Complexity', statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT'] },
    { subject: subDsa, cls: classCs3A, students: csStudents, daysAgo: 10, topic: 'Stacks, Queues & Recursion', statuses: ['PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT'] },
    { subject: subDsa, cls: classCs3A, students: csStudents, daysAgo: 5, topic: 'Binary Search Trees & Traversals', statuses: ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT'] },
    { subject: subDsa, cls: classCs3A, students: csStudents, daysAgo: 1, topic: 'Graph BFS & DFS Algorithms', statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT'] },
    { subject: subDbms, cls: classCs3A, students: csStudents, daysAgo: 12, topic: 'ER Modeling & Relational Algebra', statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT'] },
    { subject: subDbms, cls: classCs3A, students: csStudents, daysAgo: 6, topic: 'SQL Joins, Views & Normalization', statuses: ['PRESENT', 'ABSENT', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE'] },
    { subject: subDbms, cls: classCs3A, students: csStudents, daysAgo: 0, topic: 'ACID Transactions & Indexing', statuses: ['PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT', 'ABSENT'] },
    { subject: subSignals, cls: classEce3A, students: eceStudents, daysAgo: 7, topic: 'Continuous-Time LTI Systems', statuses: ['PRESENT', 'LATE', 'ABSENT'] },
    { subject: subSignals, cls: classEce3A, students: eceStudents, daysAgo: 2, topic: 'Fourier Transform Properties', statuses: ['PRESENT', 'PRESENT', 'LATE'] },
  ];

  for (const cfg of sessionConfigs) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - cfg.daysAgo);

    const session = await upsertDoc(
      AttendanceSession,
      {
        subjectId: cfg.subject._id,
        classId: cfg.cls._id,
        section: cfg.cls.section,
        sessionDate: d,
      },
      {
        subjectId: cfg.subject._id,
        classId: cfg.cls._id,
        facultyId: faculty._id,
        section: cfg.cls.section,
        sessionDate: d,
        topic: cfg.topic,
      },
      { topic: cfg.topic }
    );

    for (let i = 0; i < cfg.students.length; i++) {
      const st = cfg.students[i];
      const status = cfg.statuses[i % cfg.statuses.length];
      await upsertDoc(
        AttendanceRecord,
        { sessionId: session._id, studentId: st._id },
        {
          sessionId: session._id,
          studentId: st._id,
          status,
          markedById: faculty._id,
          remarks: status === 'LATE' ? 'Arrived 10 mins after start' : null,
        },
        { status }
      );
    }
  }

  console.log('MongoDB seed completed successfully.');
  console.log('Demo Faculty: FAC-101 / arjun.mehta@campus.edu | Password: Faculty@123');
  console.log('Demo Student: STU-2026-001 / aarav.sharma@student.edu | Password: Student@123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
