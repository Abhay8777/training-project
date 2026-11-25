import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Save,
  Calendar,
  Edit3,
  ClipboardList,
} from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function MarkAttendance() {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('A');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('');

  const [session, setSession] = useState(null);
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [roster, setRoster] = useState([]);
  const [initialRoster, setInitialRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/faculty/subjects'), api.get('/faculty/classes')])
      .then(([subRes, clsRes]) => {
        const subs = subRes.data.data.subjects || [];
        const clss = clsRes.data.data.classes || [];
        setSubjects(subs);
        setClasses(clss);
        if (subs.length > 0) setSubjectId(subs[0].id);
        if (clss.length > 0) {
          setClassId(clss[0].id);
          setSection(clss[0].section || 'A');
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load subjects/classes'))
      .finally(() => setMetaLoading(false));
  }, [toast]);

  const handleClassChange = (id) => {
    setClassId(id);
    const found = classes.find((c) => c.id === id);
    if (found) setSection(found.section || 'A');
  };

  const loadSession = async (e) => {
    if (e) e.preventDefault();
    if (!subjectId || !classId || !sessionDate) {
      toast.error('Please select subject, class, and date.');
      return;
    }
    setLoadingRoster(true);
    try {
      const { data } = await api.post('/attendance/sessions', {
        subjectId,
        classId,
        section,
        sessionDate,
        topic: topic.trim() || null,
      });
      const payload = data.data;
      setSession(payload.session);
      setHasExistingRecords(payload.hasExistingRecords);
      setEditMode(!payload.hasExistingRecords);
      setRoster(payload.roster);
      setInitialRoster(payload.roster.map((r) => ({ ...r })));
      if (payload.session.topic) setTopic(payload.session.topic);
      toast.info(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load attendance session.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const setStudentStatus = (studentId, status) => {
    setRoster((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row))
    );
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((row) => ({ ...row, status })));
  };

  const resetRoster = () => {
    setRoster(initialRoster.map((r) => ({ ...r })));
    toast.info('Attendance selection reset.');
  };

  const handleSaveConfirmed = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const { data } = await api.post('/attendance/records', {
        sessionId: session.id,
        allowUpdate: editMode,
        records: roster.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks || null,
        })),
      });
      toast.success(data.message);
      setHasExistingRecords(true);
      setEditMode(false);
      setInitialRoster(roster.map((r) => ({ ...r, alreadyMarked: true })));
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
  const absentCount = roster.filter((r) => r.status === 'ABSENT').length;
  const lateCount = roster.filter((r) => r.status === 'LATE').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mark Attendance
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select subject, class, section, and date to record or edit session attendance
        </p>
      </div>

      {/* Session Selector */}
      <form
        onSubmit={loadSession}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Subject
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={metaLoading}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Class
          </label>
          <select
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={metaLoading}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Sec {c.section})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Section
          </label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value.toUpperCase())}
            maxLength={5}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Date
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loadingRoster || metaLoading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-60"
        >
          {loadingRoster ? 'Loading...' : 'Load Students'}
        </button>

        <div className="sm:col-span-2 lg:col-span-5">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Optional lecture topic (e.g., Graph BFS & DFS Traversals)"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </form>

      {loadingRoster && <SkeletonTable rows={6} />}

      {!loadingRoster && !session && (
        <EmptyState
          icon={ClipboardList}
          title="No Session Loaded"
          description="Choose a subject, class, section, and date above, then click Load Students to mark attendance."
        />
      )}

      {!loadingRoster && session && roster.length === 0 && (
        <EmptyState
          title="No Students Found in Class"
          description="There are no students assigned to this class and section yet."
        />
      )}

      {!loadingRoster && session && roster.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Action Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Total: {roster.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Present: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                Absent: {absentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Late: {lateCount}
              </span>
              {hasExistingRecords && !editMode && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  Saved Session (Read-Only)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasExistingRecords && !editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Enable Edit Mode
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => markAll('PRESENT')}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAll('ABSENT')}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold transition"
                  >
                    Mark All Absent
                  </button>
                  <button
                    type="button"
                    onClick={resetRoster}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Attendance
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Student ID</th>
                  <th className="py-3.5 px-5">Student Name</th>
                  <th className="py-3.5 px-5">Present / Absent / Late</th>
                  <th className="py-3.5 px-5">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {roster.map((row) => (
                  <tr
                    key={row.studentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {row.studentCode}
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white">
                      {row.fullName}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!editMode}
                          onClick={() => setStudentStatus(row.studentId, 'PRESENT')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-60 ${
                            row.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Present
                        </button>
                        <button
                          type="button"
                          disabled={!editMode}
                          onClick={() => setStudentStatus(row.studentId, 'ABSENT')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-60 ${
                            row.status === 'ABSENT'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Absent
                        </button>
                        <button
                          type="button"
                          disabled={!editMode}
                          onClick={() => setStudentStatus(row.studentId, 'LATE')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-60 ${
                            row.status === 'LATE'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Late
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirm Save Attendance"
        message={`Save attendance for ${roster.length} students (${presentCount} Present, ${absentCount} Absent, ${lateCount} Late) on ${sessionDate}?`}
        confirmLabel="Save Attendance"
        loading={saving}
        onConfirm={handleSaveConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
