require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Standalone MongoDB does not support Prisma transactions (used internally by .upsert),
// so we use findUnique + update/create for idempotent seeding.
async function upsertDoc(model, where, create, update = {}) {
  const existing = await model.findUnique({ where });
  if (existing) {
    if (Object.keys(update).length > 0) {
      return model.update({ where: { id: existing.id }, data: update });
    }
    return existing;
  }
  return model.create({ data: create });
}

async function main() {
  console.log('Seeding Student Attendance Management System (MongoDB)...');

  const saltRounds = 10;
  const facultyPasswordHash = await bcrypt.hash('Faculty@123', saltRounds);
  const studentPasswordHash = await bcrypt.hash('Student@123', saltRounds);

  // 1. Departments (2)
  const csDept = await upsertDoc(
    prisma.department,
    { code: 'CSE' },
    {
      code: 'CSE',
      name: 'Computer Science & Engineering',
      description: 'Department of Computer Science, AI, and Software Systems',
    }
  );

  const eceDept = await upsertDoc(
    prisma.department,
    { code: 'ECE' },
    {
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      description: 'Department of Electronics, Embedded Systems, and VLSI',
    }
  );

  // 2. Courses (2)
  const btechCs = await upsertDoc(
    prisma.course,
    { code: 'BTECH-CS' },
    {
      code: 'BTECH-CS',
      name: 'B.Tech Computer Science',
      durationSemesters: 8,
      departmentId: csDept.id,
    }
  );

  const btechEce = await upsertDoc(
    prisma.course,
    { code: 'BTECH-ECE' },
    {
      code: 'BTECH-ECE',
      name: 'B.Tech Electronics & Communication',
      durationSemesters: 8,
      departmentId: eceDept.id,
    }
  );

  // 3. Semesters
  const sem3 = await upsertDoc(
    prisma.semester,
    { number_academicYear: { number: 3, academicYear: '2026-2027' } },
    {
      number: 3,
      name: 'Semester 3',
      academicYear: '2026-2027',
      isCurrent: true,
    },
    { isCurrent: true }
  );

  await upsertDoc(
    prisma.semester,
    { number_academicYear: { number: 5, academicYear: '2026-2027' } },
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
    prisma.class,
    {
      courseId_semesterId_section_academicYear: {
        courseId: btechCs.id,
        semesterId: sem3.id,
        section: 'A',
        academicYear: '2026-2027',
      },
    },
    {
      name: 'CS-3A',
      section: 'A',
      academicYear: '2026-2027',
      departmentId: csDept.id,
      courseId: btechCs.id,
      semesterId: sem3.id,
    }
  );

  const classEce3A = await upsertDoc(
    prisma.class,
    {
      courseId_semesterId_section_academicYear: {
        courseId: btechEce.id,
        semesterId: sem3.id,
        section: 'A',
        academicYear: '2026-2027',
      },
    },
    {
      name: 'ECE-3A',
      section: 'A',
      academicYear: '2026-2027',
      departmentId: eceDept.id,
      courseId: btechEce.id,
      semesterId: sem3.id,
    }
  );

  // 5. Faculty Account (1)
  const facultyUser = await upsertDoc(
    prisma.user,
    { email: 'arjun.mehta@campus.edu' },
    {
      email: 'arjun.mehta@campus.edu',
      passwordHash: facultyPasswordHash,
      role: 'FACULTY',
      mustChangePassword: true,
    }
  );

  const faculty = await upsertDoc(
    prisma.faculty,
    { facultyCode: 'FAC-101' },
    {
      userId: facultyUser.id,
      facultyCode: 'FAC-101',
      fullName: 'Dr. Arjun Mehta',
      phone: '+91-9876543200',
      designation: 'Associate Professor',
      departmentId: csDept.id,
    }
  );

  // 6. Subjects (3)
  const subDsa = await upsertDoc(
    prisma.subject,
    { code: 'CS301' },
    {
      code: 'CS301',
      name: 'Data Structures & Algorithms',
      credits: 4,
      departmentId: csDept.id,
      courseId: btechCs.id,
      semesterId: sem3.id,
    }
  );

  const subDbms = await upsertDoc(
    prisma.subject,
    { code: 'CS302' },
    {
      code: 'CS302',
      name: 'Database Management Systems',
      credits: 4,
      departmentId: csDept.id,
      courseId: btechCs.id,
      semesterId: sem3.id,
    }
  );

  const subSignals = await upsertDoc(
    prisma.subject,
    { code: 'EC301' },
    {
      code: 'EC301',
      name: 'Signals & Systems',
      credits: 3,
      departmentId: eceDept.id,
      courseId: btechEce.id,
      semesterId: sem3.id,
    }
  );

  // Assign subjects to faculty
  const assignments = [
    { facultyId: faculty.id, subjectId: subDsa.id, classId: classCs3A.id },
    { facultyId: faculty.id, subjectId: subDbms.id, classId: classCs3A.id },
    { facultyId: faculty.id, subjectId: subSignals.id, classId: classEce3A.id },
  ];

  for (const a of assignments) {
    await upsertDoc(
      prisma.facultySubject,
      {
        facultyId_subjectId_classId: {
          facultyId: a.facultyId,
          subjectId: a.subjectId,
          classId: a.classId,
        },
      },
      a
    );
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
      prisma.user,
      { email: s.email },
      {
        email: s.email,
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        mustChangePassword: true,
      }
    );

    const student = await upsertDoc(
      prisma.student,
      { studentCode: s.code },
      {
        userId: user.id,
        studentCode: s.code,
        fullName: s.name,
        phone: s.phone,
        departmentId: s.dept.id,
        courseId: s.course.id,
        semesterId: s.sem.id,
        classId: s.cls.id,
        section: 'A',
      }
    );
    createdStudents.push({ student, cls: s.cls, dept: s.dept });

    const subjectsForStudent = s.dept.id === csDept.id ? [subDsa, subDbms] : [subSignals];
    for (const subj of subjectsForStudent) {
      await upsertDoc(
        prisma.enrollment,
        {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: subj.id,
          },
        },
        {
          studentId: student.id,
          subjectId: subj.id,
          classId: s.cls.id,
          semesterId: s.sem.id,
        }
      );
    }
  }

  // 8. Multiple Attendance Sessions & Records
  const csStudents = createdStudents.filter((x) => x.dept.id === csDept.id).map((x) => x.student);
  const eceStudents = createdStudents.filter((x) => x.dept.id === eceDept.id).map((x) => x.student);

  const sessionConfigs = [
    {
      subject: subDsa,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 14,
      topic: 'Arrays, Linked Lists & Complexity',
      statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT'],
    },
    {
      subject: subDsa,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 10,
      topic: 'Stacks, Queues & Recursion',
      statuses: ['PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT'],
    },
    {
      subject: subDsa,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 5,
      topic: 'Binary Search Trees & Traversals',
      statuses: ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT'],
    },
    {
      subject: subDsa,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 1,
      topic: 'Graph BFS & DFS Algorithms',
      statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT'],
    },
    {
      subject: subDbms,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 12,
      topic: 'ER Modeling & Relational Algebra',
      statuses: ['PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT'],
    },
    {
      subject: subDbms,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 6,
      topic: 'SQL Joins, Views & Normalization',
      statuses: ['PRESENT', 'ABSENT', 'ABSENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE'],
    },
    {
      subject: subDbms,
      cls: classCs3A,
      students: csStudents,
      daysAgo: 0,
      topic: 'ACID Transactions & Indexing',
      statuses: ['PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT', 'ABSENT'],
    },
    {
      subject: subSignals,
      cls: classEce3A,
      students: eceStudents,
      daysAgo: 7,
      topic: 'Continuous-Time LTI Systems',
      statuses: ['PRESENT', 'LATE', 'ABSENT'],
    },
    {
      subject: subSignals,
      cls: classEce3A,
      students: eceStudents,
      daysAgo: 2,
      topic: 'Fourier Transform Properties',
      statuses: ['PRESENT', 'PRESENT', 'LATE'],
    },
  ];

  for (const cfg of sessionConfigs) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - cfg.daysAgo);

    const session = await upsertDoc(
      prisma.attendanceSession,
      {
        subjectId_classId_section_sessionDate: {
          subjectId: cfg.subject.id,
          classId: cfg.cls.id,
          section: cfg.cls.section,
          sessionDate: d,
        },
      },
      {
        subjectId: cfg.subject.id,
        classId: cfg.cls.id,
        facultyId: faculty.id,
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
        prisma.attendanceRecord,
        {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: st.id,
          },
        },
        {
          sessionId: session.id,
          studentId: st.id,
          status,
          markedById: faculty.id,
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
    await prisma.$disconnect();
  });
