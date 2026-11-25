import { describe, it, expect } from 'vitest';
const {
  calculateAttendanceStats,
  aggregateAttendanceRecords,
  getLatePolicyDescription,
} = require('../src/utils/attendanceCalc');

describe('Attendance Calculation Utility', () => {
  it('calculates exact percentage when there are only Present and Absent', () => {
    const stats = calculateAttendanceStats({ presentCount: 32, absentCount: 8, lateCount: 0 }, 0.5);
    expect(stats.totalClasses).toBe(40);
    expect(stats.effectivePresent).toBe(32);
    expect(stats.attendancePercentage).toBe(80);
    expect(stats.isLowAttendance).toBe(false);
  });

  it('handles zero conducted classes safely without NaN or division errors', () => {
    const stats = calculateAttendanceStats({ presentCount: 0, absentCount: 0, lateCount: 0 });
    expect(stats.totalClasses).toBe(0);
    expect(stats.effectivePresent).toBe(0);
    expect(stats.attendancePercentage).toBe(0);
    expect(Number.isNaN(stats.attendancePercentage)).toBe(false);
    expect(stats.isLowAttendance).toBe(false);
  });

  it('applies configurable LATE_WEIGHT policy instead of silently counting Late as Present', () => {
    const records = [
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'LATE' },
      { status: 'ABSENT' },
    ];

    // Weight 0.5 => (2 + 0.5) / 4 = 62.5%
    const halfCredit = aggregateAttendanceRecords(records, 0.5);
    expect(halfCredit.totalClasses).toBe(4);
    expect(halfCredit.presentCount).toBe(2);
    expect(halfCredit.lateCount).toBe(1);
    expect(halfCredit.absentCount).toBe(1);
    expect(halfCredit.effectivePresent).toBe(2.5);
    expect(halfCredit.attendancePercentage).toBe(62.5);
    expect(halfCredit.isLowAttendance).toBe(true);

    // Weight 0 => 2 / 4 = 50%
    const zeroCredit = aggregateAttendanceRecords(records, 0);
    expect(zeroCredit.attendancePercentage).toBe(50);

    // Weight 1 => 3 / 4 = 75%
    const fullCredit = aggregateAttendanceRecords(records, 1);
    expect(fullCredit.attendancePercentage).toBe(75);
    expect(fullCredit.isLowAttendance).toBe(false);
  });

  it('provides human-readable policy descriptions', () => {
    expect(getLatePolicyDescription(0.5)).toContain('0.5');
    expect(getLatePolicyDescription(0)).toContain('0 Present');
    expect(getLatePolicyDescription(1)).toContain('1.0 Present');
  });
});
