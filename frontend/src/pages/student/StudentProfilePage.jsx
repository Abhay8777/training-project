import { useEffect, useState } from 'react';
import { KeyRound, Save, UserCircle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function StudentProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    api.get('/student/profile').then((res) => {
      const p = res.data.data.profile;
      setProfile(p);
      setPhone(p.phone || '');
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/student/profile', { phone });
      toast.success('Contact details updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          My Student Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View your academic details, update contact info, and manage your password
        </p>
      </div>

      {profile && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2.5 text-base font-semibold">
            <UserCircle className="w-5 h-5 text-indigo-600" />
            Academic &amp; Personal Information
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Student ID</label>
              <input disabled value={profile.studentCode} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 opacity-75" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
              <input disabled value={profile.fullName} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 opacity-75" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input disabled value={profile.email} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 opacity-75" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
              <input disabled value={profile.department?.name || ''} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 opacity-75" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Course &amp; Semester</label>
              <input
                disabled
                value={`${profile.course?.name || ''} • ${profile.semester?.name || ''}`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 opacity-75"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number (Editable)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Update Contact Info'}
          </button>
        </form>
      )}

      <form
        onSubmit={handlePasswordChange}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5 text-base font-semibold">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Change Password
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={savingPwd}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white text-sm font-semibold transition"
        >
          {savingPwd ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
