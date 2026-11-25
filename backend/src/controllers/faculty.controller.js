const bcrypt = require('bcryptjs');
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
} = require('../models');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const {
  aggregateAttendanceRecords,
  getLatePolicyDescription,
} = require('../utils/attendanceCalc');

function toPlainRef(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') return doc.toObject();
  if (doc._id) {
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }
  return doc;
}

async function getDashboard(_req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const [
      totalStudents,
      totalClasses,
      totalSubjects,
      todaySessions,
      allSessions,
      allRecords,
      recentSessions,
      subjects,
      students,
    ] = await Promise.all([
      Student.countDocuments(),
      ClassModel.countDocuments(),
      Subject.countDocuments(),
      AttendanceSession.find({ sessionDate: { $gte: todayStart, $lt: todayEnd } }).select('_id'),
      AttendanceSession.find().select('_id sessionDate subjectId'),
      AttendanceRecord.find().select('status sessionId studentId'),
      AttendanceSession.find()
        .sort({ sessionDate: -1, createdAt: -1 })
        .limit(6)
        .populate('subjectId', 'code name')
        .populate('classId', 'name section')
        .populate('facultyId', 'fullName'),
      Subject.find().sort({ code: 1 }),
      Student.find().populate('classId', 'name'),
    ]);

    const todaySessionIds = new Set(todaySessions.map((s) => s._id.toString()));
    const todayRecords = allRecords.filter((r) => todaySessionIds.has(r.sessionId.toString()));
    const todayPresent = todayRecords.filter((r) => r.status === 'PRESENT').length;
    const todayAbsent = todayRecords.filter((r) => r.status === 'ABSENT').length;
    const todayLate = todayRecords.filter((r) => r.status === 'LATE').length;

    const overallStats = aggregateAttendanceRecords(allRecords);

    const sessionMap = new Map(allSessions.map((s) => [s._id.toString(), s]));
    const monthlyMap = new Map();
    const subjectRecordMap = new Map();
    const studentRecordMap = new Map();
    const sessionRecordMap = new Map();

    for (const rec of allRecords) {
      const sess = sessionMap.get(rec.sessionId.toString());
      if (sess) {
        const dt = new Date(sess.sessionDate);
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(key)) monthlyMap.set(key, []);
        monthlyMap.get(key).push(rec);

        const subjKey = sess.subjectId.toString();
        if (!subjectRecordMap.has(subjKey)) subjectRecordMap.set(subjKey, []);
        subjectRecordMap.get(subjKey).push(rec);
      }

      const stKey = rec.studentId.toString();
      if (!studentRecordMap.has(stKey)) studentRecordMap.set(stKey, []);
      studentRecordMap.get(stKey).push(rec);

      const sKey = rec.sessionId.toString();
      if (!sessionRecordMap.has(sKey)) sessionRecordMap.set(sKey, []);
      sessionRecordMap.get(sKey).push(rec);
    }

    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, recs]) => ({
        month,
        label: new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        ...aggregateAttendanceRecords(recs),
      }));

    const subjectSummary = subjects.map((subj) => {
      const sid = subj._id.toString();
      const recs = subjectRecordMap.get(sid) || [];
      const sessCount = allSessions.filter((s) => s.subjectId.toString() === sid).length;
      return {
        id: sid,
        code: subj.code,
        name: subj.name,
        sessionsCount: sessCount,
        ...aggregateAttendanceRecords(recs),
      };
    });

    const recentActivity = recentSessions.map((s) => {
      const sid = s._id.toString();
      const stats = aggregateAttendanceRecords(sessionRecordMap.get(sid) || []);
      return {
        id: sid,
        sessionDate: s.sessionDate,
        topic: s.topic,
        subject: toPlainRef(s.subjectId),
        class: toPlainRef(s.classId),
        faculty: toPlainRef(s.facultyId),
        ...stats,
      };
    });

    const lowAttendanceAlerts = students
      .map((st) => {
        const recs = studentRecordMap.get(st._id.toString()) || [];
        const stats = aggregateAttendanceRecords(recs);
        return {
          id: st._id.toString(),
          studentCode: st.studentCode,
          fullName: st.fullName,
          className: st.classId?.name || 'Unassigned',
          ...stats,
        };
      })
      .filter((st) => st.isLowAttendance)
      .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
      .slice(0, 8);

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalClasses,
          totalSubjects,
          todayPresent,
          todayAbsent,
          todayLate,
          overallAttendancePercentage: overallStats.attendancePercentage,
          totalRecords: overallStats.totalClasses,
        },
        latePolicy: {
          weight: env.lateWeight,
          threshold: env.lowAttendanceThreshold,
          description: getLatePolicyDescription(),
        },
        monthlyTrend,
        subjectSummary,
        recentActivity,
        lowAttendanceAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAcademicMetadata(_req, res, next) {
  try {
    const [departments, courses, semesters, classes, facultyList, studentCounts] = await Promise.all([
      Department.find().sort({ name: 1 }),
      Course.find().populate('departmentId', 'code name').sort({ name: 1 }),
      Semester.find().sort({ academicYear: -1, number: 1 }),
      ClassModel.find()
        .populate('departmentId', 'code name')
        .populate('courseId', 'code name')
        .populate('semesterId', 'number name academicYear')
        .sort({ name: 1 }),
      Faculty.find().select('facultyCode fullName designation').sort({ fullName: 1 }),
      Student.aggregate([{ $group: { _id: '$classId', count: { $sum: 1 } } }]),
    ]);

    const countMap = new Map(studentCounts.map((c) => [String(c._id), c.count]));

    res.json({
      success: true,
      data: {
        departments: departments.map((d) => d.toObject()),
        courses: courses.map((c) => {
          const obj = c.toObject();
          obj.department = toPlainRef(obj.departmentId);
          obj.departmentId = obj.department?.id || obj.departmentId;
          return obj;
        }),
        semesters: semesters.map((s) => s.toObject()),
        classes: classes.map((c) => {
          const obj = c.toObject();
          obj.department = toPlainRef(obj.departmentId);
          obj.course = toPlainRef(obj.courseId);
          obj.semester = toPlainRef(obj.semesterId);
          obj.departmentId = obj.department?.id || obj.departmentId;
          obj.courseId = obj.course?.id || obj.courseId;
          obj.semesterId = obj.semester?.id || obj.semesterId;
          obj._count = { students: countMap.get(obj.id) || 0 };
          return obj;
        }),
        facultyList: facultyList.map((f) => f.toObject()),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listStudents(req, res, next) {
  try {
    const {
      search = '',
      departmentId,
      courseId,
      semesterId,
      classId,
      section,
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const take = Math.min(100, Math.max(1, Number(limit) || 15));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const filter = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const matchingUsers = await User.find({ email: regex, role: 'STUDENT' }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [{ fullName: regex }, { studentCode: regex }, { userId: { $in: userIds } }];
    }
    if (departmentId) filter.departmentId = departmentId;
    if (courseId) filter.courseId = courseId;
    if (semesterId) filter.semesterId = semesterId;
    if (classId) filter.classId = classId;
    if (section) filter.section = section.toUpperCase();

    const allowedSort = ['fullName', 'studentCode', 'enrollmentDate', 'createdAt'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 1 : -1;

    const [total, students] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .sort({ [orderField]: orderDir })
        .skip(skip)
        .limit(take)
        .populate('userId', 'email isActive')
        .populate('departmentId', 'code name')
        .populate('courseId', 'code name')
        .populate('semesterId', 'number name')
        .populate('classId', 'name section'),
    ]);

    const studentIds = students.map((s) => s._id);
    const records = await AttendanceRecord.find({ studentId: { $in: studentIds } }).select('studentId status');
    const recMap = new Map();
    for (const r of records) {
      const key = r.studentId.toString();
      if (!recMap.has(key)) recMap.set(key, []);
      recMap.get(key).push(r);
    }

    const items = students.map((s) => {
      const obj = s.toObject();
      const userRef = toPlainRef(obj.userId);
      const deptRef = toPlainRef(obj.departmentId);
      const courseRef = toPlainRef(obj.courseId);
      const semRef = toPlainRef(obj.semesterId);
      const clsRef = toPlainRef(obj.classId);
      return {
        ...obj,
        userId: userRef?.id || obj.userId,
        departmentId: deptRef?.id || obj.departmentId,
        courseId: courseRef?.id || obj.courseId,
        semesterId: semRef?.id || obj.semesterId,
        classId: clsRef?.id || obj.classId,
        email: userRef?.email || '',
        isActive: userRef?.isActive ?? true,
        department: deptRef,
        course: courseRef,
        semester: semRef,
        class: clsRef,
        attendanceStats: aggregateAttendanceRecords(recMap.get(obj.id) || []),
      };
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getStudentById(req, res, next) {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'email isActive lastLoginAt')
      .populate('departmentId')
      .populate('courseId')
      .populate('semesterId')
      .populate('classId');

    if (!student) {
      throw new AppError('Student not found.', 404, 'STUDENT_NOT_FOUND');
    }

    const [enrollments, attendanceRecords] = await Promise.all([
      Enrollment.find({ studentId: student._id }).populate('subjectId'),
      AttendanceRecord.find({ studentId: student._id }).populate({
        path: 'sessionId',
        populate: [
          { path: 'subjectId', select: 'code name' },
          { path: 'classId', select: 'name section' },
        ],
      }),
    ]);

    const overallStats = aggregateAttendanceRecords(attendanceRecords);

    const subjectMap = new Map();
    for (const enr of enrollments) {
      const subj = toPlainRef(enr.subjectId);
      if (subj) subjectMap.set(subj.id, { subject: subj, records: [] });
    }
    for (const rec of attendanceRecords) {
      const subj = toPlainRef(rec.sessionId?.subjectId);
      if (!subj) continue;
      if (!subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, { subject: subj, records: [] });
      }
      subjectMap.get(subj.id).records.push(rec);
    }

    const subjectBreakdown = Array.from(subjectMap.values()).map((entry) => ({
      subjectId: entry.subject.id,
      subjectCode: entry.subject.code,
      subjectName: entry.subject.name,
      ...aggregateAttendanceRecords(entry.records),
    }));

    const stObj = student.toObject();
    const userRef = toPlainRef(stObj.userId);

    res.json({
      success: true,
      data: {
        student: {
          ...stObj,
          email: userRef?.email || '',
          isActive: userRef?.isActive ?? true,
          department: toPlainRef(stObj.departmentId),
          course: toPlainRef(stObj.courseId),
          semester: toPlainRef(stObj.semesterId),
          class: toPlainRef(stObj.classId),
        },
        overallStats,
        subjectBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createStudent(req, res, next) {
  try {
    const {
      studentCode,
      fullName,
      email,
      phone,
      password,
      departmentId,
      courseId,
      semesterId,
      classId,
      section,
      enrollmentDate,
    } = req.body;

    const rawPassword = password || 'Student@123';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'STUDENT',
      mustChangePassword: true,
    });

    let created;
    try {
      created = await Student.create({
        userId: user._id,
        studentCode: studentCode.toUpperCase(),
        fullName,
        phone: phone || null,
        departmentId,
        courseId,
        semesterId,
        classId: classId || null,
        section: section || 'A',
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      });
    } catch (err) {
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw err;
    }

    if (classId) {
      const subjects = await Subject.find({ courseId, semesterId }).select('_id');
      for (const subj of subjects) {
        await Enrollment.create({
          studentId: created._id,
          subjectId: subj._id,
          classId,
          semesterId,
        }).catch(() => {});
      }
    }

    const populated = await Student.findById(created._id)
      .populate('userId', 'email isActive')
      .populate('departmentId', 'code name')
      .populate('courseId', 'code name')
      .populate('semesterId', 'number name')
      .populate('classId', 'name section');

    const obj = populated.toObject();
    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data: {
        student: {
          ...obj,
          email: toPlainRef(obj.userId)?.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await Student.findById(id);
    if (!existing) {
      throw new AppError('Student not found.', 404, 'STUDENT_NOT_FOUND');
    }

    const {
      studentCode,
      fullName,
      email,
      phone,
      departmentId,
      courseId,
      semesterId,
      classId,
      section,
      enrollmentDate,
      isActive,
    } = req.body;

    if (email !== undefined || isActive !== undefined) {
      await User.findByIdAndUpdate(existing.userId, {
        ...(email !== undefined ? { email: email.toLowerCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      });
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      {
        ...(studentCode !== undefined ? { studentCode: studentCode.toUpperCase() } : {}),
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(courseId !== undefined ? { courseId } : {}),
        ...(semesterId !== undefined ? { semesterId } : {}),
        ...(classId !== undefined ? { classId: classId || null } : {}),
        ...(section !== undefined ? { section } : {}),
        ...(enrollmentDate !== undefined ? { enrollmentDate: new Date(enrollmentDate) } : {}),
      },
      { new: true }
    )
      .populate('userId', 'email isActive')
      .populate('departmentId', 'code name')
      .populate('courseId', 'code name')
      .populate('semesterId', 'number name')
      .populate('classId', 'name section');

    const obj = updated.toObject();
    const userRef = toPlainRef(obj.userId);

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: {
        student: {
          ...obj,
          email: userRef?.email,
          isActive: userRef?.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      throw new AppError('Student not found.', 404, 'STUDENT_NOT_FOUND');
    }

    await Promise.all([
      AttendanceRecord.deleteMany({ studentId: student._id }),
      Enrollment.deleteMany({ studentId: student._id }),
      Student.findByIdAndDelete(student._id),
      User.findByIdAndDelete(student.userId),
    ]);

    res.json({
      success: true,
      message: 'Student deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function listSubjects(req, res, next) {
  try {
    const { departmentId, courseId, semesterId, assignedOnly } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (courseId) filter.courseId = courseId;
    if (semesterId) filter.semesterId = semesterId;

    if (assignedOnly === 'true' && req.user.faculty) {
      const assigned = await FacultySubject.find({ facultyId: req.user.faculty.id }).select('subjectId');
      filter._id = { $in: assigned.map((a) => a.subjectId) };
    }

    const [subjects, sessionCounts, enrollmentCounts] = await Promise.all([
      Subject.find(filter)
        .populate('departmentId', 'code name')
        .populate('courseId', 'code name')
        .populate('semesterId', 'number name')
        .sort({ code: 1 }),
      AttendanceSession.aggregate([{ $group: { _id: '$subjectId', count: { $sum: 1 } } }]),
      Enrollment.aggregate([{ $group: { _id: '$subjectId', count: { $sum: 1 } } }]),
    ]);

    const sessMap = new Map(sessionCounts.map((s) => [String(s._id), s.count]));
    const enrMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

    const formatted = subjects.map((s) => {
      const obj = s.toObject();
      obj.department = toPlainRef(obj.departmentId);
      obj.course = toPlainRef(obj.courseId);
      obj.semester = toPlainRef(obj.semesterId);
      obj.departmentId = obj.department?.id || obj.departmentId;
      obj.courseId = obj.course?.id || obj.courseId;
      obj.semesterId = obj.semester?.id || obj.semesterId;
      obj._count = {
        sessions: sessMap.get(obj.id) || 0,
        enrollments: enrMap.get(obj.id) || 0,
      };
      return obj;
    });

    res.json({ success: true, data: { subjects: formatted } });
  } catch (error) {
    next(error);
  }
}

async function createSubject(req, res, next) {
  try {
    const { code, name, credits, departmentId, courseId, semesterId, assignToMe, classId } = req.body;

    const created = await Subject.create({
      code: code.toUpperCase(),
      name,
      credits: credits || 3,
      departmentId,
      courseId,
      semesterId,
    });

    if (assignToMe && req.user.faculty) {
      await FacultySubject.create({
        facultyId: req.user.faculty.id,
        subjectId: created._id,
        classId: classId || null,
      }).catch(() => {});
    }

    const populated = await Subject.findById(created._id)
      .populate('departmentId', 'code name')
      .populate('courseId', 'code name')
      .populate('semesterId', 'number name');

    res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: { subject: populated.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, credits, departmentId, courseId, semesterId } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      id,
      {
        ...(code !== undefined ? { code: code.toUpperCase() } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(credits !== undefined ? { credits } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(courseId !== undefined ? { courseId } : {}),
        ...(semesterId !== undefined ? { semesterId } : {}),
      },
      { new: true }
    )
      .populate('departmentId', 'code name')
      .populate('courseId', 'code name')
      .populate('semesterId', 'number name');

    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Subject updated successfully.',
      data: { subject: subject.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;
    const sessionCount = await AttendanceSession.countDocuments({ subjectId: id });
    if (sessionCount > 0) {
      throw new AppError('Cannot delete subject with existing attendance sessions.', 400, 'SUBJECT_IN_USE');
    }
    await Promise.all([
      FacultySubject.deleteMany({ subjectId: id }),
      Enrollment.deleteMany({ subjectId: id }),
      Subject.findByIdAndDelete(id),
    ]);
    res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function assignSubjectToFaculty(req, res, next) {
  try {
    const { id: subjectId } = req.params;
    const facultyId = req.body.facultyId || req.user.faculty?.id;
    const classId = req.body.classId || null;

    if (!facultyId) {
      throw new AppError('Faculty ID is required.', 400, 'FACULTY_REQUIRED');
    }

    const assignment = await FacultySubject.create({ facultyId, subjectId, classId });
    res.status(201).json({
      success: true,
      message: 'Subject assigned to faculty.',
      data: { assignment: assignment.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function listClasses(_req, res, next) {
  try {
    const [classes, students] = await Promise.all([
      ClassModel.find()
        .populate('departmentId', 'code name')
        .populate('courseId', 'code name')
        .populate('semesterId', 'number name academicYear')
        .sort({ name: 1 }),
      Student.find()
        .select('studentCode fullName section classId userId')
        .populate('userId', 'email')
        .sort({ studentCode: 1 }),
    ]);

    const studentsByClass = new Map();
    for (const st of students) {
      if (!st.classId) continue;
      const key = st.classId.toString();
      if (!studentsByClass.has(key)) studentsByClass.set(key, []);
      const obj = st.toObject();
      obj.user = toPlainRef(obj.userId);
      studentsByClass.get(key).push(obj);
    }

    const formatted = classes.map((c) => {
      const obj = c.toObject();
      const roster = studentsByClass.get(obj.id) || [];
      obj.department = toPlainRef(obj.departmentId);
      obj.course = toPlainRef(obj.courseId);
      obj.semester = toPlainRef(obj.semesterId);
      obj.students = roster;
      obj._count = { students: roster.length };
      return obj;
    });

    res.json({ success: true, data: { classes: formatted } });
  } catch (error) {
    next(error);
  }
}

async function createClass(req, res, next) {
  try {
    const { name, section, academicYear, departmentId, courseId, semesterId } = req.body;
    const created = await ClassModel.create({
      name,
      section: section.toUpperCase(),
      academicYear,
      departmentId,
      courseId,
      semesterId,
    });

    res.status(201).json({
      success: true,
      message: 'Class created successfully.',
      data: { class: created.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function assignStudentsToClass(req, res, next) {
  try {
    const { id: classId } = req.params;
    const { studentIds } = req.body;

    const targetClass = await ClassModel.findById(classId);
    if (!targetClass) {
      throw new AppError('Class not found.', 404, 'CLASS_NOT_FOUND');
    }

    await Student.updateMany(
      { _id: { $in: studentIds } },
      {
        $set: {
          classId: targetClass._id,
          section: targetClass.section,
          semesterId: targetClass.semesterId,
          courseId: targetClass.courseId,
          departmentId: targetClass.departmentId,
        },
      }
    );

    res.json({
      success: true,
      message: `${studentIds.length} student(s) assigned to ${targetClass.name}.`,
    });
  } catch (error) {
    next(error);
  }
}

async function updateFacultyProfile(req, res, next) {
  try {
    if (!req.user.faculty) {
      throw new AppError('Faculty profile not found.', 404, 'NOT_FOUND');
    }

    const { fullName, phone, designation } = req.body;
    const updated = await Faculty.findByIdAndUpdate(
      req.user.faculty.id,
      {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(designation !== undefined ? { designation } : {}),
      },
      { new: true }
    ).populate('departmentId', 'code name');

    res.json({
      success: true,
      message: 'Faculty profile updated.',
      data: { faculty: updated.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getAcademicMetadata,
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectToFaculty,
  listClasses,
  createClass,
  assignStudentsToClass,
  updateFacultyProfile,
};
