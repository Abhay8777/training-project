const { AttendanceSession, AttendanceRecord, Student } = require('../models');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const {
  aggregateAttendanceRecords,
  calculateAttendanceStats,
  getLatePolicyDescription,
} = require('../utils/attendanceCalc');

function normalizeUtcDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Invalid date format.', 400, 'INVALID_DATE');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toPlainRef(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') return doc.toObject();
  if (doc._id) {
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }
  return doc;
}

async function createSession(req, res, next) {
  try {
    const { subjectId, classId, section, sessionDate, topic } = req.body;
    const facultyId = req.user.faculty?.id;
    if (!facultyId) {
      throw new AppError('Faculty profile not found.', 403, 'FORBIDDEN');
    }

    const normalizedDate = normalizeUtcDate(sessionDate);
    const normalizedSection = section.toUpperCase();

    let session = await AttendanceSession.findOne({
      subjectId,
      classId,
      section: normalizedSection,
      sessionDate: normalizedDate,
    })
      .populate('subjectId', 'code name')
      .populate('classId', 'name section');

    const isExisting = Boolean(session);
    if (!session) {
      const created = await AttendanceSession.create({
        subjectId,
        classId,
        facultyId,
        section: normalizedSection,
        sessionDate: normalizedDate,
        topic: topic || null,
      });
      session = await AttendanceSession.findById(created._id)
        .populate('subjectId', 'code name')
        .populate('classId', 'name section');
    } else if (topic !== undefined && topic !== session.topic) {
      session.topic = topic || null;
      await session.save();
    }

    const [existingRecords, students] = await Promise.all([
      AttendanceRecord.find({ sessionId: session._id }).select('studentId status remarks'),
      Student.find({ classId, section: normalizedSection })
        .select('studentCode fullName section')
        .sort({ studentCode: 1 }),
    ]);

    const existingMap = new Map(existingRecords.map((r) => [r.studentId.toString(), r]));
    const roster = students.map((st) => {
      const stId = st._id.toString();
      const existingRec = existingMap.get(stId);
      return {
        studentId: stId,
        studentCode: st.studentCode,
        fullName: st.fullName,
        section: st.section,
        recordId: existingRec?._id?.toString() || null,
        status: existingRec?.status || 'PRESENT',
        remarks: existingRec?.remarks || '',
        alreadyMarked: Boolean(existingRec),
      };
    });

    const sessionObj = session.toObject();
    sessionObj.subject = toPlainRef(sessionObj.subjectId);
    sessionObj.class = toPlainRef(sessionObj.classId);

    res.status(isExisting ? 200 : 201).json({
      success: true,
      message: isExisting
        ? 'Loaded existing attendance session for this date.'
        : 'Attendance session initialized.',
      data: {
        session: sessionObj,
        isExistingSession: isExisting,
        hasExistingRecords: existingRecords.length > 0,
        roster,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function submitRecords(req, res, next) {
  try {
    const { sessionId, records, allowUpdate } = req.body;
    const facultyId = req.user.faculty?.id;
    if (!facultyId) {
      throw new AppError('Faculty profile not found.', 403, 'FORBIDDEN');
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      throw new AppError('Attendance session not found.', 404, 'SESSION_NOT_FOUND');
    }

    const seen = new Set();
    for (const item of records) {
      if (seen.has(item.studentId)) {
        throw new AppError(
          'Duplicate student entry detected in attendance payload.',
          400,
          'DUPLICATE_PAYLOAD_STUDENT'
        );
      }
      seen.add(item.studentId);
    }

    const existingRecords = await AttendanceRecord.find({ sessionId }).select('studentId');
    if (!allowUpdate && existingRecords.length > 0) {
      const existingStudentIds = new Set(existingRecords.map((r) => r.studentId.toString()));
      const duplicates = records.filter((r) => existingStudentIds.has(r.studentId));
      if (duplicates.length > 0) {
        throw new AppError(
          'Attendance has already been recorded for this session. Enable edit mode to update existing records.',
          409,
          'DUPLICATE_ATTENDANCE'
        );
      }
    }

    const saved = [];
    for (const item of records) {
      const existingRec = await AttendanceRecord.findOne({
        sessionId,
        studentId: item.studentId,
      });

      const rec = existingRec
        ? await AttendanceRecord.findByIdAndUpdate(
            existingRec._id,
            {
              status: item.status,
              remarks: item.remarks || null,
              markedById: facultyId,
            },
            { new: true }
          )
        : await AttendanceRecord.create({
            sessionId,
            studentId: item.studentId,
            status: item.status,
            remarks: item.remarks || null,
            markedById: facultyId,
          });
      saved.push(rec);
    }

    const stats = aggregateAttendanceRecords(saved);

    res.status(201).json({
      success: true,
      message: `Saved ${saved.length} attendance record(s) successfully.`,
      data: {
        count: saved.length,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttendance(req, res, next) {
  try {
    const { subjectId, classId, section, date, startDate, endDate, studentId } = req.query;

    const sessionFilter = {};
    if (subjectId) sessionFilter.subjectId = subjectId;
    if (classId) sessionFilter.classId = classId;
    if (section) sessionFilter.section = section.toUpperCase();
    if (date) {
      sessionFilter.sessionDate = normalizeUtcDate(date);
    } else if (startDate || endDate) {
      sessionFilter.sessionDate = {};
      if (startDate) sessionFilter.sessionDate.$gte = normalizeUtcDate(startDate);
      if (endDate) sessionFilter.sessionDate.$lte = normalizeUtcDate(endDate);
    }

    const sessions = await AttendanceSession.find(sessionFilter)
      .sort({ sessionDate: -1, createdAt: -1 })
      .populate('subjectId', 'code name')
      .populate('classId', 'name section')
      .populate('facultyId', 'facultyCode fullName');

    const sessionIds = sessions.map((s) => s._id);
    const recFilter = { sessionId: { $in: sessionIds } };
    if (studentId) recFilter.studentId = studentId;

    const allRecords = await AttendanceRecord.find(recFilter).populate(
      'studentId',
      'studentCode fullName section'
    );

    const recMap = new Map();
    for (const r of allRecords) {
      const key = r.sessionId.toString();
      if (!recMap.has(key)) recMap.set(key, []);
      const obj = r.toObject();
      obj.student = toPlainRef(obj.studentId);
      recMap.get(key).push(obj);
    }

    const formatted = sessions.map((s) => {
      const obj = s.toObject();
      const recs = recMap.get(obj.id) || [];
      return {
        ...obj,
        subject: toPlainRef(obj.subjectId),
        class: toPlainRef(obj.classId),
        faculty: toPlainRef(obj.facultyId),
        records: recs,
        stats: aggregateAttendanceRecords(recs),
      };
    });

    res.json({
      success: true,
      data: { sessions: formatted },
    });
  } catch (error) {
    next(error);
  }
}

async function updateAttendanceRecord(req, res, next) {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const facultyId = req.user.faculty?.id;

    const existing = await AttendanceRecord.findById(id);
    if (!existing) {
      throw new AppError('Attendance record not found.', 404, 'RECORD_NOT_FOUND');
    }

    const updated = await AttendanceRecord.findByIdAndUpdate(
      id,
      {
        status,
        ...(remarks !== undefined ? { remarks: remarks || null } : {}),
        ...(facultyId ? { markedById: facultyId } : {}),
      },
      { new: true }
    ).populate('studentId', 'studentCode fullName');

    res.json({
      success: true,
      message: 'Attendance record updated.',
      data: { record: updated.toObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttendanceReports(req, res, next) {
  try {
    const { type = 'subject', startDate, endDate, subjectId, classId, studentId } = req.query;

    const sessionFilter = {};
    if (subjectId) sessionFilter.subjectId = subjectId;
    if (classId) sessionFilter.classId = classId;
    if (startDate || endDate) {
      sessionFilter.sessionDate = {};
      if (startDate) sessionFilter.sessionDate.$gte = normalizeUtcDate(startDate);
      if (endDate) sessionFilter.sessionDate.$lte = normalizeUtcDate(endDate);
    }

    const sessions = await AttendanceSession.find(sessionFilter)
      .sort({ sessionDate: -1 })
      .populate('subjectId', 'code name')
      .populate('classId', 'name section');

    const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));
    const recFilter = { sessionId: { $in: sessions.map((s) => s._id) } };
    if (studentId) recFilter.studentId = studentId;

    const records = await AttendanceRecord.find(recFilter).populate({
      path: 'studentId',
      select: 'studentCode fullName classId',
      populate: { path: 'classId', select: 'name section' },
    });

    const overall = aggregateAttendanceRecords(records);
    const groups = new Map();

    for (const rec of records) {
      const sess = sessionMap.get(rec.sessionId.toString());
      if (!sess) continue;
      const subj = toPlainRef(sess.subjectId);
      const cls = toPlainRef(sess.classId);
      const stu = toPlainRef(rec.studentId);

      const dt = new Date(sess.sessionDate);
      const isoDay = dt.toISOString().slice(0, 10);

      let key;
      let label;
      let subLabel = '';

      if (type === 'daily') {
        key = isoDay;
        label = isoDay;
        subLabel = `${subj?.code || ''} - ${cls?.name || ''}`;
      } else if (type === 'weekly') {
        const temp = new Date(dt);
        const day = temp.getUTCDay();
        const diff = temp.getUTCDate() - day + (day === 0 ? -6 : 1);
        temp.setUTCDate(diff);
        const weekStart = temp.toISOString().slice(0, 10);
        key = weekStart;
        label = `Week of ${weekStart}`;
        subLabel = 'Weekly Summary';
      } else if (type === 'monthly') {
        const monthKey = isoDay.slice(0, 7);
        key = monthKey;
        label = new Date(`${monthKey}-01T00:00:00Z`).toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
        subLabel = monthKey;
      } else if (type === 'student') {
        key = stu?.id || 'unknown';
        label = stu?.fullName || 'Unknown';
        subLabel = `${stu?.studentCode || ''} (${stu?.classId?.name || 'N/A'})`;
      } else if (type === 'class') {
        key = cls?.id || 'unknown';
        label = cls?.name || 'Unknown';
        subLabel = `Section ${cls?.section || ''}`;
      } else {
        key = subj?.id || 'unknown';
        label = subj?.name || 'Unknown';
        subLabel = subj?.code || '';
      }

      if (!groups.has(key)) {
        groups.set(key, { key, label, subLabel, records: [] });
      }
      groups.get(key).records.push(rec);
    }

    const rows = Array.from(groups.values()).map((g) => ({
      key: g.key,
      label: g.label,
      subLabel: g.subLabel,
      ...aggregateAttendanceRecords(g.records),
    }));

    res.json({
      success: true,
      data: {
        type,
        latePolicy: {
          weight: env.lateWeight,
          threshold: env.lowAttendanceThreshold,
          description: getLatePolicyDescription(),
        },
        overall,
        rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSession,
  submitRecords,
  getAttendance,
  updateAttendanceRecord,
  getAttendanceReports,
  calculateAttendanceStats,
};
