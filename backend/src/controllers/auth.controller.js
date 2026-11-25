const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Faculty, Student, PasswordResetToken } = require('../models');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function signToken(user) {
  return jwt.sign({ sub: user.id || user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function sanitizeUserResponse(userObj) {
  return {
    id: userObj.id,
    email: userObj.email,
    role: userObj.role,
    mustChangePassword: userObj.mustChangePassword,
    lastLoginAt: userObj.lastLoginAt,
    faculty: userObj.faculty || null,
    student: userObj.student || null,
  };
}

function formatRef(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') return doc.toObject();
  if (doc._id) {
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
  }
  return doc;
}

async function loadFullUser(userDoc) {
  const userObj = userDoc.toObject();
  if (userObj.role === 'FACULTY') {
    const fac = await Faculty.findOne({ userId: userDoc._id }).populate('departmentId', 'code name');
    if (fac) {
      const f = fac.toObject();
      f.department = formatRef(f.departmentId);
      f.departmentId = f.department?.id || f.departmentId;
      userObj.faculty = f;
    } else {
      userObj.faculty = null;
    }
    userObj.student = null;
  } else {
    const stu = await Student.findOne({ userId: userDoc._id })
      .populate('departmentId', 'code name')
      .populate('courseId', 'code name')
      .populate('semesterId', 'number name academicYear')
      .populate('classId', 'name section');
    if (stu) {
      const s = stu.toObject();
      s.department = formatRef(s.departmentId);
      s.course = formatRef(s.courseId);
      s.semester = formatRef(s.semesterId);
      s.class = formatRef(s.classId);
      s.departmentId = s.department?.id || s.departmentId;
      s.courseId = s.course?.id || s.courseId;
      s.semesterId = s.semester?.id || s.semesterId;
      s.classId = s.class?.id || s.classId;
      userObj.student = s;
    } else {
      userObj.student = null;
    }
    userObj.faculty = null;
  }
  return userObj;
}

async function facultyLogin(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const normalized = identifier.trim();

    let userDoc = await User.findOne({
      role: 'FACULTY',
      email: normalized.toLowerCase(),
    });

    if (!userDoc) {
      const fac = await Faculty.findOne({ facultyCode: normalized.toUpperCase() });
      if (fac) {
        userDoc = await User.findOne({ _id: fac.userId, role: 'FACULTY' });
      }
    }

    if (!userDoc || !(await bcrypt.compare(password, userDoc.passwordHash))) {
      throw new AppError('Invalid Faculty ID/Email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!userDoc.isActive) {
      throw new AppError('Your faculty account is deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    userDoc.lastLoginAt = new Date();
    await userDoc.save();

    const fullUser = await loadFullUser(userDoc);
    const token = signToken(fullUser);

    res.json({
      success: true,
      message: 'Faculty login successful.',
      data: {
        token,
        user: sanitizeUserResponse(fullUser),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function studentLogin(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const normalized = identifier.trim();

    let userDoc = await User.findOne({
      role: 'STUDENT',
      email: normalized.toLowerCase(),
    });

    if (!userDoc) {
      const stu = await Student.findOne({ studentCode: normalized.toUpperCase() });
      if (stu) {
        userDoc = await User.findOne({ _id: stu.userId, role: 'STUDENT' });
      }
    }

    if (!userDoc || !(await bcrypt.compare(password, userDoc.passwordHash))) {
      throw new AppError('Invalid Student ID/Email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!userDoc.isActive) {
      throw new AppError('Your student account is deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    userDoc.lastLoginAt = new Date();
    await userDoc.save();

    const fullUser = await loadFullUser(userDoc);
    const token = signToken(fullUser);

    res.json({
      success: true,
      message: 'Student login successful.',
      data: {
        token,
        user: sanitizeUserResponse(fullUser),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(_req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

async function getMe(req, res, next) {
  try {
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    const fullUser = await loadFullUser(userDoc);
    res.json({
      success: true,
      data: { user: sanitizeUserResponse(fullUser) },
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userDoc = await User.findById(req.user.id);

    if (!userDoc || !(await bcrypt.compare(currentPassword, userDoc.passwordHash))) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    userDoc.passwordHash = await bcrypt.hash(newPassword, 10);
    userDoc.mustChangePassword = false;
    await userDoc.save();

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const userDoc = await User.findOne({ email: email.toLowerCase() });

    if (!userDoc) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been generated.',
      });
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await PasswordResetToken.create({
      userId: userDoc._id,
      tokenHash,
      expiresAt,
    });

    res.json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been generated.',
      ...(env.nodeEnv !== 'production' ? { devResetToken: rawToken } : {}),
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await PasswordResetToken.findOne({ tokenHash });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('Reset token is invalid or has expired.', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(record.userId, {
      passwordHash,
      mustChangePassword: false,
    });
    record.usedAt = new Date();
    await record.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  facultyLogin,
  studentLogin,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
