import { OfferResponsePage } from './pages/OfferResponsePage';
import { ApplicationTrackingPage } from './pages/ApplicationTrackingPage';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { CareersPage } from './pages/CareersPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RecruitmentAdminPage } from './pages/RecruitmentAdminPage';
import { EmployeeWorkspacePage } from './pages/EmployeeWorkspacePage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Layout chính bao bọc toàn bộ ứng dụng */}
          <Route element={<MainLayout />}>
            {/* 1. Tuyến Đường Công Khai (Public Routes) */}
            <Route path="/" element={<Navigate to="/careers" replace />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/careers/:id" element={<JobDetailPage />} />
            <Route path="/offers/:token" element={<OfferResponsePage />} />
            <Route path="/track" element={<ApplicationTrackingPage />} />
            <Route path="/track/:code" element={<ApplicationTrackingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* 2. Tuyến Đường Phân Quyền Được Bảo Vệ (Protected Routes) */}
            {/* Bàn Điều Hành Tuyển Dụng ATS: HR, Manager, SuperAdmin */}
            <Route
              path="/admin/recruitment"
              element={
                <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'SUPERADMIN']}>
                  <RecruitmentAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Không Gian Nhân Viên & Đội Ngũ: Mọi thành viên đã đăng nhập */}
            <Route
              path="/employee/workspace"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR', 'SUPERADMIN']}>
                  <EmployeeWorkspacePage />
                </ProtectedRoute>
              }
            />

            {/* Cài Đặt Hệ Thống & Sổ Tay RAG: Dành riêng cho SuperAdmin, HR & Manager */}
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'HR', 'MANAGER']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Tuyến đường dự phòng khi gõ sai URL */}
            <Route path="*" element={<Navigate to="/careers" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
