import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Mail,
  Sun,
  Moon,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function LoginPage({ roleType = 'FACULTY' }) {
  const isFaculty = roleType === 'FACULTY';
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState('request'); // request | confirm
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(roleType, identifier.trim(), password);
      toast.success(`Welcome back to the ${isFaculty ? 'Faculty' : 'Student'} Portal!`);
      navigate(isFaculty ? '/faculty/dashboard' : '/student/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    if (isFaculty) {
      setIdentifier('FAC-101');
      setPassword('Faculty@123');
    } else {
      setIdentifier('STU-2026-001');
      setPassword('Student@123');
    }
    setError('');
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success(data.message);
      if (data.devResetToken) {
        setResetToken(data.devResetToken);
      }
      setResetStep('confirm');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to process request.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      toast.success(data.message);
      setForgotOpen(false);
      setResetStep('request');
      setResetEmail('');
      setResetToken('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 relative">
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          All Portals
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 ${
                isFaculty
                  ? 'bg-blue-600 shadow-blue-600/25'
                  : 'bg-indigo-600 shadow-indigo-600/25'
              }`}
            >
              {isFaculty ? <ShieldCheck className="w-7 h-7" /> : <UserCheck className="w-7 h-7" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isFaculty ? 'Faculty Portal Login' : 'Student Portal Login'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in with your {isFaculty ? 'Faculty ID' : 'Student ID'} or institutional email
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {isFaculty ? 'Faculty ID or Email' : 'Student ID or Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isFaculty ? 'e.g. FAC-101 or arjun.mehta@campus.edu' : 'e.g. STU-2026-001'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition disabled:opacity-60 ${
                isFaculty
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
              }`}
            >
              {submitting ? 'Signing in...' : `Sign in to ${isFaculty ? 'Faculty' : 'Student'} Portal`}
            </button>
          </form>

          {/* Demo credentials box */}
          <div className="mt-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Demo Credentials (Testing Only)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFaculty ? 'FAC-101 / Faculty@123' : 'STU-2026-001 / Student@123'}
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill Demo
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            {isFaculty ? (
              <>
                Are you a student?{' '}
                <Link to="/student/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  Go to Student Login
                </Link>
              </>
            ) : (
              <>
                Are you a faculty member?{' '}
                <Link to="/faculty/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Go to Faculty Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</h3>
              <button onClick={() => setForgotOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enter your institutional email address to generate a password reset token.
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@campus.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {resetLoading ? 'Sending...' : 'Request Reset Token'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetConfirm} className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your reset token and choose a new password (min 8 chars, 1 uppercase, 1 number).
                </p>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Reset token"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {resetLoading ? 'Updating...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
