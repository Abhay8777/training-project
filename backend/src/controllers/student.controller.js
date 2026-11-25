const { Student, Enrollment, AttendanceRecord, FacultySubject } = require('../models');
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

async function getStudentEntity(userId) {
  const student = await Student.findOne({ userId })
    .populate('userId', 'email lastLoginAt')
    .populate('departmentId', 'code name')
    .populate('courseId', 'code name')
    .populate('semesterId', 'number name academicYear')
    .populate('classId', 'name section');

  if (!student) {
    throw new AppError('Student profile not found.', 404, 'STUDENT_NOT_FOUND');
  }

  const obj = student.toObject();
  const userRef = toPlainRef(obj.userId);
  return {
    ...obj,
    email: userRef?.email || '',
    lastLoginAt: userRef?.lastLoginAt || null,
    department: toPlainRef(obj.departmentId),
    course: toPlainRef(obj.courseId),
    semester: toPlainRef(obj.semesterId),
    class: toPlainRef(obj.classId),
  };
}

async function getDashboard(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);

    const [rawRecords, enrollments] = await Promise.all([
      AttendanceRecord.find({ studentId: student.id }).populate({
        path: 'sessionId',
        populate: [
          { path: 'subjectId', select: 'code name' },
          { path: 'facultyId', select: 'fullName' },
        ],
      }),
      Enrollment.find({ studentId: student.id }).populate('subjectId', 'code name credits'),
    ]);

    const records = rawRecords
      .filter((r) => r.sessionId)
      .sort((a, b) => new Date(b.sessionId.sessionDate) - new Date(a.sessionId.sessionDate));

    const overallStats = aggregateAttendanceRecords(records);

    const subjectMap = new Map();
    for (const enr of enrollments) {
      const subj = toPlainRef(enr.subjectId);
      if (subj) subjectMap.set(subj.id, { subject: subj, records: [] });
    }
    for (const rec of records) {
      const subj = toPlainRef(rec.sessionId.subjectId);
      if (!subj) continue;
      if (!subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, { subject: subj, records: [] });
      }
      subjectMap.get(subj.id).records.push(rec);
    }

    const subjectSummary = Array.from(subjectMap.values()).map((entry) => ({
      subjectId: entry.subject.id,
      subjectCode: entry.subject.code,
      subjectName: entry.subject.name,
      ...aggregateAttendanceRecords(entry.records),
    }));

    const monthlyMap = new Map();
    for (const rec of records) {
      const dt = new Date(rec.sessionId.sessionDate);
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, []);
      monthlyMap.get(key).push(rec);
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

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          email: student.email,
          phone: student.phone,
          department: student.department,
          course: student.course,
          semester: student.semester,
          class: student.class,
          section: student.section,
          enrollmentDate: student.enrollmentDate,
        },
        overallStats,
        latePolicy: {
          weight: env.lateWeight,
          threshold: env.lowAttendanceThreshold,
          description: getLatePolicyDescription(),
        },
        subjectSummary,
        monthlyTrend,
        recentRecords: records.slice(0, 8).map((r) => ({
          id: r._id.toString(),
          status: r.status,
          remarks: r.remarks,
          sessionDate: r.sessionId.sessionDate,
          topic: r.sessionId.topic,
          subject: toPlainRef(r.sessionId.subjectId),
          facultyName: r.sessionId.facultyId?.fullName || 'Faculty',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);
    res.json({
      success: true,
      data: { profile: student },
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);
    const { phone } = req.body;

    await Student.findByIdAndUpdate(student.id, {
      ...(phone !== undefined ? { phone: phone || null } : {}),
    });

    const updated = await getStudentEntity(req.user.id);
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { profile: updated },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttendance(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);
    const { subjectId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const currentPage = Math.max(1, Number(page) || 1);

    const filter = { studentId: student.id };
    if (status && ['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
      filter.status = status;
    }

    const rawRecords = await AttendanceRecord.find(filter).populate({
      path: 'sessionId',
      populate: [
        { path: 'subjectId', select: 'code name' },
        { path: 'classId', select: 'name section' },
        { path: 'facultyId', select: 'fullName' },
      ],
    });

    const filtered = rawRecords
      .filter((r) => {
        if (!r.sessionId) return false;
        const subj = toPlainRef(r.sessionId.subjectId);
        if (subjectId && subj?.id !== subjectId) return false;
        const dt = new Date(r.sessionId.sessionDate);
        if (startDate && dt < new Date(`${startDate}T00:00:00.000Z`)) return false;
        if (endDate && dt > new Date(`${endDate}T23:59:59.999Z`)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.sessionId.sessionDate) - new Date(a.sessionId.sessionDate));

    const total = filtered.length;
    const paged = filtered.slice((currentPage - 1) * take, currentPage * take);

    res.json({
      success: true,
      data: {
        items: paged.map((r) => ({
          id: r._id.toString(),
          status: r.status,
          remarks: r.remarks,
          sessionDate: r.sessionId.sessionDate,
          topic: r.sessionId.topic,
          subject: toPlainRef(r.sessionId.subjectId),
          class: toPlainRef(r.sessionId.classId),
          facultyName: r.sessionId.facultyId?.fullName || 'Faculty',
        })),
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

async function getAttendanceSummary(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);
    const rawRecords = await AttendanceRecord.find({ studentId: student.id }).populate({
      path: 'sessionId',
      populate: { path: 'subjectId', select: 'code name' },
    });

    const records = rawRecords
      .filter((r) => r.sessionId)
      .sort((a, b) => new Date(a.sessionId.sessionDate) - new Date(b.sessionId.sessionDate));

    const overall = aggregateAttendanceRecords(records);

    const subjectMap = new Map();
    const monthlyMap = new Map();

    for (const rec of records) {
      const subj = toPlainRef(rec.sessionId.subjectId);
      if (subj) {
        if (!subjectMap.has(subj.id)) subjectMap.set(subj.id, { subject: subj, records: [] });
        subjectMap.get(subj.id).records.push(rec);
      }

      const dt = new Date(rec.sessionId.sessionDate);
      const mKey = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(mKey)) monthlyMap.set(mKey, []);
      monthlyMap.get(mKey).push(rec);
    }

    const bySubject = Array.from(subjectMap.values()).map((entry) => ({
      subjectId: entry.subject.id,
      subjectCode: entry.subject.code,
      subjectName: entry.subject.name,
      ...aggregateAttendanceRecords(entry.records),
    }));

    const byMonth = Array.from(monthlyMap.entries()).map(([month, recs]) => ({
      month,
      label: new Date(`${month}-01T00:00:00Z`).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      ...aggregateAttendanceRecords(recs),
    }));

    res.json({
      success: true,
      data: {
        overall,
        bySubject,
        byMonth,
        latePolicy: {
          weight: env.lateWeight,
          threshold: env.lowAttendanceThreshold,
          description: getLatePolicyDescription(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getSubjects(req, res, next) {
  try {
    const student = await getStudentEntity(req.user.id);

    const [enrollments, records] = await Promise.all([
      Enrollment.find({ studentId: student.id }).populate('subjectId', 'code name credits'),
      AttendanceRecord.find({ studentId: student.id }).populate('sessionId', 'subjectId'),
    ]);

    const subjectIds = enrollments.map((e) => e.subjectId?._id).filter(Boolean);
    const facultyAssignments = await FacultySubject.find({ subjectId: { $in: subjectIds } }).populate(
      'facultyId',
      'fullName designation'
    );
    const facMap = new Map();
    for (const fa of facultyAssignments) {
      facMap.set(fa.subjectId.toString(), toPlainRef(fa.facultyId));
    }

    const recordsBySubject = new Map();
    for (const r of records) {
      const sid = r.sessionId?.subjectId?.toString();
      if (!sid) continue;
      if (!recordsBySubject.has(sid)) recordsBySubject.set(sid, []);
      recordsBySubject.get(sid).push(r);
    }

    const subjects = enrollments
      .filter((enr) => enr.subjectId)
      .map((enr) => {
        const subj = toPlainRef(enr.subjectId);
        const stats = aggregateAttendanceRecords(recordsBySubject.get(subj.id) || []);
        return {
          id: subj.id,
          code: subj.code,
          name: subj.name,
          credits: subj.credits,
          faculty: facMap.get(subj.id) || null,
          ...stats,
        };
      });

    res.json({
      success: true,
      data: { subjects },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getAttendance,
  getAttendanceSummary,
  getSubjects,
};
