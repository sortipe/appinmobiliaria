import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Properties from './pages/admin/Properties';
import TaxCalculator from './components/TaxCalculator';
import Reports from './pages/admin/Reports';
import CalendarView from './components/CalendarView';
import Binnacle from './pages/worker/Binnacle';
import WorkerDashboard from './pages/worker/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import CompanyManagement from './pages/admin/CompanyManagement';

// Placeholder Pages for New Roles
const SuperAdminDashboard = () => (
  <div className="space-y-8">
    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Consola Global de Empresas</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card p-8 border-t-4 border-t-brand-500">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Empresas</p>
        <p className="text-4xl font-black text-slate-900">42</p>
      </div>
      <div className="glass-card p-8 border-t-4 border-t-blue-500">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Suscripciones Activas</p>
        <p className="text-4xl font-black text-slate-900">38</p>
      </div>
      <div className="glass-card p-8 border-t-4 border-t-green-500">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Usuarios Totales</p>
        <p className="text-4xl font-black text-slate-900">1,204</p>
      </div>
    </div>
  </div>
);

const GerenteDashboard = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-end">
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel de Gerencia</h1>
      <button className="btn-primary">Configurar Empresa</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="glass-card p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mi Broker</p>
        <p className="text-xl font-bold text-slate-900 mt-1">Carlos Mendoza</p>
      </div>
      <div className="glass-card p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asesores Activos</p>
        <p className="text-3xl font-black text-slate-900 mt-1">12</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Super Admin */}
          <Route path="/super-admin" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <Layout><SuperAdminDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* Gerente / Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['gerente', 'super_admin']}>
              <Layout><GerenteDashboard /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['super_admin', 'gerente']}>
              <Layout><UserManagement /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/company" element={
            <ProtectedRoute allowedRoles={['super_admin', 'gerente']}>
              <Layout><CompanyManagement /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/properties" element={
            <ProtectedRoute allowedRoles={['super_admin', 'gerente', 'broker', 'asesor']}>
              <Layout><Properties /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['super_admin', 'gerente', 'broker']}>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/visits" element={
            <ProtectedRoute allowedRoles={['super_admin', 'gerente', 'broker', 'asesor']}>
              <Layout><CalendarView /></Layout>
            </ProtectedRoute>
          } />

          {/* Broker / Asesor Panel */}
          <Route path="/panel" element={
            <ProtectedRoute allowedRoles={['broker', 'asesor']}>
              <Layout><WorkerDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/worker/calendar" element={
            <ProtectedRoute allowedRoles={['broker', 'asesor']}>
              <Layout><CalendarView /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/worker/binnacle" element={
            <ProtectedRoute allowedRoles={['broker', 'asesor']}>
              <Layout><Binnacle /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/calculator" element={
            <ProtectedRoute>
              <Layout><TaxCalculator /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
