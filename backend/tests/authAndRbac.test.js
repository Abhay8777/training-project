import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const env = require('../src/config/env');
const { User, Faculty, Student, AttendanceSession, AttendanceRecord } = require('../src/models');
const app = require('../src/app');

function mockDoc(obj) {
  return {
    ...obj,
    _id: obj.id,
    toObject: () => ({ ...obj }),
    save: vi.fn().mockResolvedValue(true),
  };
}

describe('Authentication, RBAC, and Duplicate Prevention API (MongoDB)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/health returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  it('rejects unauthenticated access to protected routes with 401', async () => {
    const res1 = await request(app).get('/api/faculty/dashboard');
    const res2 = await request(app).get('/api/student/dashboard');
    const res3 = await request(app).get('/api/attendance/reports');

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(res3.status).toBe(401);
  });

  it('rejects invalid credentials on faculty login with 401', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(Faculty, 'findOne').mockResolvedValue(null);

    const res = await request(app).post('/api/auth/faculty/login').send({
      identifier: 'FAC-999',
      password: 'WrongPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('authenticates faculty with valid credentials and returns JWT', async () => {
    const hash = await bcrypt.hash('Faculty@123', 10);
    const userDoc = mockDoc({
      id: '507f1f77bcf86cd799439001',
      email: 'arjun.mehta@campus.edu',
      passwordHash: hash,
      role: 'FACULTY',
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: null,
    });

    vi.spyOn(User, 'findOne').mockResolvedValue(userDoc);
    vi.spyOn(Faculty, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(
        mockDoc({
          id: '507f1f77bcf86cd799439002',
          facultyCode: 'FAC-101',
          fullName: 'Dr. Arjun Mehta',
          departmentId: { _id: '507f1f77bcf86cd799439003', code: 'CSE', name: 'CSE' },
        })
      ),
    });

    const res = await request(app).post('/api/auth/faculty/login').send({
      identifier: 'arjun.mehta@campus.edu',
      password: 'Faculty@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('FACULTY');
  });

  it('blocks STUDENT token from accessing Faculty or Attendance endpoints (403 Forbidden)', async () => {
    const studentToken = jwt.sign({ sub: '507f1f77bcf86cd799439010', role: 'STUDENT' }, env.jwtSecret);
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(
        mockDoc({
          id: '507f1f77bcf86cd799439010',
          email: 'aarav@student.edu',
          role: 'STUDENT',
          isActive: true,
        })
      ),
    });
    vi.spyOn(Student, 'findOne').mockResolvedValue(
      mockDoc({ id: '507f1f77bcf86cd799439011', studentCode: 'STU-2026-001', fullName: 'Aarav Sharma' })
    );

    const facRes = await request(app)
      .get('/api/faculty/students')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(facRes.status).toBe(403);

    const attRes = await request(app)
      .post('/api/attendance/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        subjectId: '507f1f77bcf86cd799439011',
        classId: '507f1f77bcf86cd799439012',
        section: 'A',
        sessionDate: '2026-11-25',
      });
    expect(attRes.status).toBe(403);
  });

  it('blocks FACULTY token from accessing Student-only endpoints (403 Forbidden)', async () => {
    const facultyToken = jwt.sign({ sub: '507f1f77bcf86cd799439001', role: 'FACULTY' }, env.jwtSecret);
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(
        mockDoc({
          id: '507f1f77bcf86cd799439001',
          email: 'arjun.mehta@campus.edu',
          role: 'FACULTY',
          isActive: true,
        })
      ),
    });
    vi.spyOn(Faculty, 'findOne').mockResolvedValue(
      mockDoc({ id: '507f1f77bcf86cd799439002', facultyCode: 'FAC-101', fullName: 'Dr. Arjun Mehta' })
    );

    const stuRes = await request(app)
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${facultyToken}`);
    expect(stuRes.status).toBe(403);
  });

  it('prevents duplicate attendance submission for the same session when allowUpdate is false (409 Conflict)', async () => {
    const facultyToken = jwt.sign({ sub: '507f1f77bcf86cd799439001', role: 'FACULTY' }, env.jwtSecret);
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(
        mockDoc({
          id: '507f1f77bcf86cd799439001',
          email: 'arjun.mehta@campus.edu',
          role: 'FACULTY',
          isActive: true,
        })
      ),
    });
    vi.spyOn(Faculty, 'findOne').mockResolvedValue(
      mockDoc({ id: '507f1f77bcf86cd799439002', facultyCode: 'FAC-101', fullName: 'Dr. Arjun Mehta' })
    );

    const studentId = '507f1f77bcf86cd799439013';
    const sessionId = '507f1f77bcf86cd799439014';

    vi.spyOn(AttendanceSession, 'findById').mockResolvedValue(mockDoc({ id: sessionId }));
    vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([{ studentId }]),
    });

    const res = await request(app)
      .post('/api/attendance/records')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        sessionId,
        allowUpdate: false,
        records: [{ studentId, status: 'PRESENT' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ATTENDANCE');
  });
});
