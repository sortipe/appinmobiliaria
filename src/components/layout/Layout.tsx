import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Building2, 
  Calendar, 
  Users, 
  FileText, 
  Calculator, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  ClipboardList,
  Globe,
  Settings,
  Briefcase,
  Award
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const role = profile?.role;

  const menuItems: any[] = [];

  if (role === 'super_admin') {
    menuItems.push(
      { name: 'Empresas', path: '/super-admin', icon: Globe },
      { name: 'Configuración', path: '/settings', icon: Settings }
    );
  } else if (role === 'gerente') {
    menuItems.push(
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Propiedades', path: '/admin/properties', icon: Building2 },
      { name: 'Mi Equipo', path: '/admin/users', icon: Users },
      { name: 'Reportes', path: '/admin/reports', icon: FileText },
      { name: 'Impuestos', path: '/calculator', icon: Calculator },
      { name: 'Empresa', path: '/admin/company', icon: Briefcase }
    );
  } else if (role === 'broker' || role === 'asesor') {
    menuItems.push(
      { name: 'Panel Principal', path: '/panel', icon: ClipboardList },
      { name: 'Propiedades', path: '/admin/properties', icon: Building2 },
      { name: 'Calendario', path: '/worker/calendar', icon: Calendar },
      { name: 'Bitácora', path: '/worker/binnacle', icon: FileText },
      { name: 'Impuestos', path: '/calculator', icon: Calculator }
    );
    if (role === 'broker') {
      menuItems.push({ name: 'Exámenes', path: '/broker/exams', icon: Award });
    } else if (role === 'asesor') {
      menuItems.push({ name: 'Exámenes', path: '/worker/exams', icon: Award });
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-brand-500 p-1.5 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">AppInmo</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 bg-white border-r border-slate-200 w-72 transform transition-transform duration-300 md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="bg-brand-500 p-2.5 rounded-2xl shadow-lg shadow-brand-100">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-black text-xl text-slate-900 tracking-tighter block leading-none">AppInmo</span>
              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{profile?.company?.name || 'Global'}</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
                    ${isActive 
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-500' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 font-black shadow-sm">
                  {profile?.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{profile?.full_name}</p>
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{profile?.role}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 w-full transition-colors font-bold text-sm"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
