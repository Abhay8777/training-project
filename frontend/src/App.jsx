import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import PortalLanding from './pages/PortalLanding';
import LoginPage from './pages/LoginPage';

import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MarkAttendance from './pages/faculty/MarkAttendance';
import StudentsPage from './pages/faculty/StudentsPage';
import SubjectsPage from './pages/faculty/SubjectsPage';
import ClassesPage from './pages/faculty/ClassesPage';
import ReportsPage from './pages/faculty/ReportsPage';
import FacultyProfilePage from './pages/faculty/FacultyProfilePage';

import StudentDashboard from './pages/student/StudentDashboard';
import MyAttendancePage from './pages/student/MyAttendancePage';
import StudentSubjectsPage from './pages/student/StudentSubjectsPage';
import StudentProfilePage from './pages/student/StudentProfilePage';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/" element={<PortalLanding />} />
                <Route path="/faculty/login" element={<LoginPage roleType="FACULTY" />} />
                <Route path="/student/login" element={<LoginPage roleType="STUDENT" />} />
              </Route>

              {/* Faculty-Only Protected Routes */}
              <Route element={<ProtectedRoute allowedRole="FACULTY" />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                  <Route path="/faculty/attendance" element={<MarkAttendance />} />
                  <Route path="/faculty/students" element={<StudentsPage />} />
                  <Route path="/faculty/subjects" element={<SubjectsPage />} />
                  <Route path="/faculty/classes" element={<ClassesPage />} />
                  <Route path="/faculty/reports" element={<ReportsPage />} />
                  <Route path="/faculty/profile" element={<FacultyProfilePage />} />
                </Route>
              </Route>

              {/* Student-Only Protected Routes */}
              <Route element={<ProtectedRoute allowedRole="STUDENT" />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/attendance" element={<MyAttendancePage />} />
                  <Route path="/student/subjects" element={<StudentSubjectsPage />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
