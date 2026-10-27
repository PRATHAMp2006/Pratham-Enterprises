import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Admin/CRM Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ProductManagement from './pages/admin/ProductManagement';
import ServiceCatalog from './pages/admin/ServiceCatalog';
import ServiceRequests from './pages/admin/ServiceRequests';
import Invoices from './pages/admin/Invoices';
import CustomerManagement from './pages/admin/CustomerManagement';
import InstalledAssets from './pages/admin/InstalledAssets';
import AssetDetails from './pages/admin/AssetDetails';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';

// Technician Pages
import TechnicianDashboard from './pages/technician/TechnicianDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin & CRM Routes with Layout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'CRM']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="installed-assets" element={<InstalledAssets />} />
          <Route path="installed-assets/:id" element={<AssetDetails />} />
          <Route path="service-catalog" element={<ServiceCatalog />} />
          <Route path="services" element={<ServiceRequests />} />
          <Route path="invoices" element={<Invoices />} />
        </Route>
        
        {/* Technician Routes */}
        <Route path="/technician" element={
          <ProtectedRoute allowedRoles={['TECHNICIAN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TechnicianDashboard />} />
        </Route>
        
        {/* Customer Routes */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CustomerDashboard />} />
        </Route>

        {/* Redirect based on role or to login */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const RoleRedirect = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  
  switch(user.role) {
    case 'ADMIN': 
    case 'CRM': return <Navigate to="/admin" replace />;
    case 'TECHNICIAN': return <Navigate to="/technician" replace />;
    case 'CUSTOMER': return <Navigate to="/customer" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

export default App;

