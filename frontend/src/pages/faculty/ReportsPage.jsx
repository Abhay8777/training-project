import { useCallback, useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import { exportAttendanceToPDF, exportAttendanceToExcel } from '../../utils/exportReports';
import { useToast } from '../../context/ToastContext';

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'subject', label: 'Subject-Wise' },
  { value: 'student', label: 'Student-Wise' },
  { value: 'class', label: 'Class-Wise' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [type, setType] = useState('subject');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/faculty/subjects'), api.get('/faculty/classes')]).then(([sRes, cRes]) => {
      setSubjects(sRes.data.data.subjects || []);
      setClasses(cRes.data.data.classes || []);
    });
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/reports', {
        params: {
          type,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          subjectId: subjectId || undefined,
          classId: classId || undefined,
        },
      });
      setReport(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [type, startDate, endDate, subjectId, classId, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportPDF = () => {
    if (!report?.rows?.length) return;
    exportAttendanceToPDF({
      title: `EduPulse Attendance Report (${type.toUpperCase()})`,
      subtitle: report.latePolicy?.description,
      columns: ['Category', 'Details', 'Total', 'Present', 'Absent', 'Late', 'Percentage'],
      rows: report.rows.map((r) => [
        r.label,
        r.subLabel || '-',
        r.totalClasses,
        r.presentCount,
        r.absentCount,
        r.lateCount,
        `${r.attendancePercentage}%`,
      ]),
      filename: `attendance-${type}-report.pdf`,
    });
    toast.success('PDF report exported.');
  };

  const handleExportExcel = () => {
    if (!report?.rows?.length) return;
    exportAttendanceToExcel({
      sheetName: `${type} report`,
      data: report.rows.map((r) => ({
        Category: r.label,
        Details: r.subLabel || '',
        'Total Classes': r.totalClasses,
        Present: r.presentCount,
        Absent: r.absentCount,
        Late: r.lateCount,
        'Attendance %': r.attendancePercentage,
      })),
      filename: `attendance-${type}-report.xlsx`,
    });
    toast.success('Excel report exported.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Reports &amp; Exports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analyze daily, weekly, monthly, subject, student, and class attendance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            disabled={!report?.rows?.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!report?.rows?.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
          ))}
        </select>

        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          aria-label="Start Date"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          aria-label="End Date"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : !report?.rows?.length ? (
        <EmptyState icon={BarChart3} title="No Report Data" description="No attendance records match the selected filters." />
      ) : (
        <>
          {/* Summary Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h2 className="text-base font-semibold mb-4">Attendance Percentage Comparison</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.rows.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="attendancePercentage" name="Attendance %" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Name / Period</th>
                    <th className="py-3.5 px-5">Total Classes</th>
                    <th className="py-3.5 px-5">Present</th>
                    <th className="py-3.5 px-5">Absent</th>
                    <th className="py-3.5 px-5">Late</th>
                    <th className="py-3.5 px-5">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {report.rows.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900 dark:text-white">{r.label}</p>
                        {r.subLabel && <p className="text-xs text-slate-500">{r.subLabel}</p>}
                      </td>
                      <td className="py-3.5 px-5 font-medium">{r.totalClasses}</td>
                      <td className="py-3.5 px-5 text-emerald-600 font-semibold">{r.presentCount}</td>
                      <td className="py-3.5 px-5 text-rose-600 font-semibold">{r.absentCount}</td>
                      <td className="py-3.5 px-5 text-amber-600 font-semibold">{r.lateCount}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.isLowAttendance
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                          }`}
                        >
                          {r.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
