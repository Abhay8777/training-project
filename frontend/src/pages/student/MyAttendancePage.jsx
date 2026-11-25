import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, FileDown, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import { exportAttendanceToPDF, exportAttendanceToExcel } from '../../utils/exportReports';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function MyAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/student/subjects').then((res) => setSubjects(res.data.data.subjects || []));
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/student/attendance', {
        params: {
          subjectId: subjectId || undefined,
          status: status || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 15,
        },
      });
      setRecords(data.data.items);
      setPagination(data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [subjectId, status, startDate, endDate, page, toast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleDownloadPDF = () => {
    if (!records.length) return;
    exportAttendanceToPDF({
      title: `My Attendance Report — ${user?.student?.fullName || ''}`,
      subtitle: `Student ID: ${user?.student?.studentCode || ''}`,
      columns: ['Date', 'Subject Code', 'Subject Name', 'Faculty', 'Status'],
      rows: records.map((r) => [
        new Date(r.sessionDate).toISOString().slice(0, 10),
        r.subject.code,
        r.subject.name,
        r.facultyName,
        r.status,
      ]),
      filename: 'my-attendance-report.pdf',
    });
    toast.success('Downloaded PDF report.');
  };

  const handleDownloadExcel = () => {
    if (!records.length) return;
    exportAttendanceToExcel({
      sheetName: 'My Attendance',
      data: records.map((r) => ({
        Date: new Date(r.sessionDate).toISOString().slice(0, 10),
        'Subject Code': r.subject.code,
        'Subject Name': r.subject.name,
        Faculty: r.facultyName,
        Status: r.status,
        Remarks: r.remarks || '',
      })),
      filename: 'my-attendance-report.xlsx',
    });
    toast.success('Downloaded Excel report.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Attendance History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Filter your daily attendance records by subject, status, or date range
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={!records.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={!records.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : records.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No Attendance Records" description="No records match your selected filters." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Subject</th>
                  <th className="py-3.5 px-5">Topic</th>
                  <th className="py-3.5 px-5">Faculty</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-5 font-mono text-xs">
                      {new Date(r.sessionDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900 dark:text-white">{r.subject.name}</p>
                      <p className="text-xs text-slate-500">{r.subject.code}</p>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                      {r.topic || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{r.facultyName}</td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
