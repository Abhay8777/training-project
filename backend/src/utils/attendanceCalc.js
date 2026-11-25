const env = require('../config/env');

/**
 * Computes attendance statistics from counts using the configured LATE_WEIGHT policy.
 * @param {object} counts
 * @param {number} counts.presentCount
 * @param {number} counts.absentCount
 * @param {number} counts.lateCount
 * @param {number} [lateWeight] - Weight of a LATE record toward Present (default from env)
 * @returns {{
 *   totalClasses: number,
 *   presentCount: number,
 *   absentCount: number,
 *   lateCount: number,
 *   effectivePresent: number,
 *   attendancePercentage: number,
 *   lateWeight: number,
 *   isLowAttendance: boolean,
 *   threshold: number
 * }}
 */
function calculateAttendanceStats(
  { presentCount = 0, absentCount = 0, lateCount = 0 },
  lateWeight = env.lateWeight
) {
  const safePresent = Math.max(0, Number(presentCount) || 0);
  const safeAbsent = Math.max(0, Number(absentCount) || 0);
  const safeLate = Math.max(0, Number(lateCount) || 0);
  const weight = Math.min(1, Math.max(0, Number(lateWeight ?? env.lateWeight)));

  const totalClasses = safePresent + safeAbsent + safeLate;
  const effectivePresent = Number((safePresent + safeLate * weight).toFixed(2));
  const attendancePercentage =
    totalClasses > 0 ? Number(((effectivePresent / totalClasses) * 100).toFixed(2)) : 0;

  return {
    totalClasses,
    presentCount: safePresent,
    absentCount: safeAbsent,
    lateCount: safeLate,
    effectivePresent,
    attendancePercentage,
    lateWeight: weight,
    isLowAttendance: totalClasses > 0 && attendancePercentage < env.lowAttendanceThreshold,
    threshold: env.lowAttendanceThreshold,
  };
}

/**
 * Aggregates an array of AttendanceRecord objects (with `.status`) into stats.
 */
function aggregateAttendanceRecords(records = [], lateWeight = env.lateWeight) {
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  for (const record of records) {
    if (record.status === 'PRESENT') presentCount += 1;
    else if (record.status === 'ABSENT') absentCount += 1;
    else if (record.status === 'LATE') lateCount += 1;
  }

  return calculateAttendanceStats({ presentCount, absentCount, lateCount }, lateWeight);
}

function getLatePolicyDescription(lateWeight = env.lateWeight) {
  if (lateWeight === 0) return 'Late counts as 0 Present (same as Absent for percentage).';
  if (lateWeight === 1) return 'Late counts as 1.0 Present.';
  return `Late counts as ${lateWeight} of a Present class (${Math.round(lateWeight * 100)}% credit).`;
}

module.exports = {
  calculateAttendanceStats,
  aggregateAttendanceRecords,
  getLatePolicyDescription,
};
