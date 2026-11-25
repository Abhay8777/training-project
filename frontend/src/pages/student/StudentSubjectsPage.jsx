import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api
      .get('/student/subjects')
      .then((res) => setSubjects(res.data.data.subjects || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load subjects.'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Subject-Wise Attendance
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Detailed attendance breakdown for each enrolled subject
        </p>
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Enrolled Subjects" description="You are not enrolled in any subjects yet." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Subject Name</th>
                  <th className="py-3.5 px-5">Subject Code</th>
                  <th className="py-3.5 px-5">Total Classes</th>
                  <th className="py-3.5 px-5">Present Classes</th>
                  <th className="py-3.5 px-5">Absent Classes</th>
                  <th className="py-3.5 px-5">Late</th>
                  <th className="py-3.5 px-5">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900 dark:text-white">{sub.name}</p>
                      {sub.faculty && (
                        <p className="text-xs text-slate-500">{sub.faculty.fullName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold">{sub.code}</td>
                    <td className="py-3.5 px-5 font-medium">{sub.totalClasses}</td>
                    <td className="py-3.5 px-5 text-emerald-600 font-semibold">{sub.presentCount}</td>
                    <td className="py-3.5 px-5 text-rose-600 font-semibold">{sub.absentCount}</td>
                    <td className="py-3.5 px-5 text-amber-600 font-semibold">{sub.lateCount}</td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          sub.isLowAttendance
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {sub.attendancePercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
