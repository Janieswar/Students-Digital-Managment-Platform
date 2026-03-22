import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/login/LoginPage";
import { AdminDashboard } from "@/pages/admin/DashboardPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { DepartmentsPage } from "@/pages/admin/DepartmentsPage";
import { AssignmentsPage } from "@/pages/admin/AssignmentsPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { FacultyDashboard } from "@/pages/faculty/DashboardPage";
import { StudentDashboard } from "@/pages/student/DashboardPage";
import { ForbiddenPage } from "@/pages/errors/ForbiddenPage";
import { AnimatePresence, motion } from "framer-motion";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public route */}
        <Route path="/login" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage />
          </motion.div>
        } />
        <Route path="/403" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ForbiddenPage />
          </motion.div>
        } />

        {/* Protected routes with layout */}
        <Route element={<Layout />}>
          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AdminDashboard />
              </motion.div>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <UsersPage />
              </motion.div>
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <DepartmentsPage />
              </motion.div>
            </ProtectedRoute>
          } />
          <Route path="/admin/assignments" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AssignmentsPage />
              </motion.div>
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AuditLogsPage />
              </motion.div>
            </ProtectedRoute>
          } />

          {/* Faculty routes */}
          <Route path="/faculty/dashboard" element={
            <ProtectedRoute allowedRoles={["faculty"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <FacultyDashboard />
              </motion.div>
            </ProtectedRoute>
          } />

          {/* Student routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={["student"]}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <StudentDashboard />
              </motion.div>
            </ProtectedRoute>
          } />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
