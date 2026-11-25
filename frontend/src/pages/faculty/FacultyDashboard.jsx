import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  School,
  BookOpen,
  UserCheck,
  UserX,
  Percent,
  AlertTriangle,
  ClipboardCheck,
  Info,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    api
      .get('/faculty/dashboard')
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const ov = data?.overview || {};
  const policy = data?.latePolicy;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Faculty Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time campus attendance overview, subject metrics, and alerts
          </p>
        </div>
        <Link
          to="/faculty/attendance"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 transition"
        >
          <ClipboardCheck className="w-4 h-4" />
          Mark Attendance
        </Link>
      </div>

      {/* Policy Banner */}
      {policy && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Attendance Policy:</strong> {policy.description} Low-attendance alert threshold is{' '}
            <strong>{policy.threshold}%</strong>.
          </span>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Students"
          value={ov.totalStudents ?? 0}
          subtitle="Active enrolled students"
          icon={Users}
          accent="blue"
        />
        <StatCard
          title="Total Classes"
          value={ov.totalClasses ?? 0}
          subtitle="Configured class sections"
          icon={School}
          accent="indigo"
        />
        <StatCard
          title="Total Subjects"
          value={ov.totalSubjects ?? 0}
          subtitle="Active curriculum subjects"
          icon={BookOpen}
          accent="blue"
        />
        <StatCard
          title="Today's Present"
          value={ov.todayPresent ?? 0}
          subtitle={`Late today: ${ov.todayLate ?? 0}`}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          title="Today's Absent"
          value={ov.todayAbsent ?? 0}
          subtitle="Marked absent today"
          icon={UserX}
          accent="rose"
        />
        <StatCard
          title="Overall Attendance"
          value={`${ov.overallAttendancePercentage ?? 0}%`}
          subtitle={`Across ${ov.totalRecords ?? 0} recorded entries`}
          icon={Percent}
          accent="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Monthly Attendance Trend
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Percentage trend across conducted sessions
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrend || []}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="attendancePercentage"
                  name="Attendance %"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#attGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Subject-Wise Attendance Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Attendance percentage by subject code
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subjectSummary || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Bar
                  dataKey="attendancePercentage"
                  name="Attendance %"
                  fill="#4f46e5"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Low Attendance Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-blue-600" />
              Recent Attendance Activity
            </h2>
            <Link to="/faculty/reports" className="text-xs font-semibold text-blue-600 hover:underline">
              View Reports
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.recentActivity || []).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No recent sessions recorded.</p>
            ) : (
              data.recentActivity.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {act.subject.code} — {act.subject.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {act.class.name} • {new Date(act.sessionDate).toISOString().slice(0, 10)}
                      {act.topic ? ` • ${act.topic}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {act.attendancePercentage}%
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {act.presentCount}P / {act.absentCount}A / {act.lateCount}L
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Low Attendance Alerts (&lt; {policy?.threshold ?? 75}%)
            </h2>
            <Link to="/faculty/students" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage Students
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.lowAttendanceAlerts || []).length === 0 ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 py-6 text-center">
                All students are currently above the {policy?.threshold ?? 75}% attendance threshold.
              </p>
            ) : (
              data.lowAttendanceAlerts.map((st) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {st.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {st.studentCode} • {st.className}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                    {st.attendancePercentage}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
