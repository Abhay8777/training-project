import { useEffect, useState } from 'react';
import {
  Percent,
  BookOpenCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api
      .get('/student/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const st = data?.student || {};
  const ov = data?.overallStats || {};
  const policy = data?.latePolicy;

  return (
    <div className="space-y-6">
      {/* Personalized Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              {st.studentCode} • {st.department?.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Welcome, {st.fullName}</h1>
            <p className="text-sm text-blue-100 mt-1">
              {st.course?.name} • {st.semester?.name} • Section {st.section}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-blue-100 uppercase font-semibold">Overall Attendance</p>
            <p className="text-3xl font-extrabold">{ov.attendancePercentage ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* Low Attendance Alert */}
      {ov.isLowAttendance && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Low Attendance Warning</p>
            <p className="text-xs mt-0.5">
              Your overall attendance ({ov.attendancePercentage}%) is below the required{' '}
              {policy?.threshold ?? 75}% threshold. Please attend upcoming classes regularly.
            </p>
          </div>
        </div>
      )}

      {policy && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Policy:</strong> {policy.description}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance %"
          value={`${ov.attendancePercentage ?? 0}%`}
          subtitle={`Threshold: ${policy?.threshold ?? 75}%`}
          icon={Percent}
          accent={ov.isLowAttendance ? 'rose' : 'blue'}
        />
        <StatCard
          title="Total Classes"
          value={ov.totalClasses ?? 0}
          subtitle="Conducted sessions"
          icon={BookOpenCheck}
          accent="indigo"
        />
        <StatCard
          title="Present Classes"
          value={ov.presentCount ?? 0}
          subtitle={`Late: ${ov.lateCount ?? 0}`}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          title="Absent Classes"
          value={ov.absentCount ?? 0}
          subtitle="Missed sessions"
          icon={UserX}
          accent="rose"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-base font-semibold mb-4">Subject-Wise Attendance</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subjectSummary || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="subjectCode" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="attendancePercentage" name="Attendance %" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-base font-semibold mb-4">Monthly Attendance Graph</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrend || []}>
                <defs>
                  <linearGradient id="stuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="attendancePercentage"
                  name="Attendance %"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#stuGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-semibold mb-4">Recent Attendance History</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data?.recentRecords || []).map((rec) => (
            <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {rec.subject.code} — {rec.subject.name}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(rec.sessionDate).toISOString().slice(0, 10)} • {rec.facultyName}
                  {rec.topic ? ` • ${rec.topic}` : ''}
                </p>
              </div>
              <StatusBadge status={rec.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
