import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, UserCheck, ArrowRight, Sun, Moon, BookOpenCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function PortalLanding() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              EduPulse
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Academic Attendance Platform
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-4">
            <BookOpenCheck className="w-3.5 h-3.5" />
            Role-Based Campus Attendance Suite
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Student Attendance Management System
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            Select your portal to sign in. Faculty members manage classes, mark attendance, and export analytics. Students track their real-time attendance and subject performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Faculty Portal Card */}
          <Link
            to="/faculty/login"
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Faculty Portal</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Mark daily class attendance, manage student rosters, configure subjects and classes, and export PDF & Excel attendance reports.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Sign in as Faculty
              </span>
              <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Student Portal Card */}
          <Link
            to="/student/login"
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-6 group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Student Portal</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                View your personalized attendance percentage, subject-wise breakdown, monthly trends, attendance calendar, and academic profile.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Sign in as Student
              </span>
              <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        <div className="mt-10 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center text-xs text-amber-900 dark:text-amber-200 max-w-2xl mx-auto">
          <strong>Demo Environment Notice:</strong> Seeded demo accounts are provided on each login screen for testing. Change all default passwords before deploying to production.
        </div>
      </main>
    </div>
  );
}
