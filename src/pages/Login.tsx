import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../lib/supabase';
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  User as UserIcon, 
  Briefcase, 
  Users, 
  Globe 
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        redirectBasedOnRole(profile?.role || 'asesor');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const redirectBasedOnRole = (role: UserRole) => {
    if (role === 'super_admin') navigate('/super-admin');
    else if (role === 'gerente') navigate('/admin');
    else if (role === 'broker' || role === 'asesor') navigate('/panel');
    else navigate('/cliente');
  };

  const handleDemo = (role: UserRole) => {
    loginAsDemo(role);
    redirectBasedOnRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full glass-card p-8 shadow-xl border-t-4 border-t-brand-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500 p-3 rounded-2xl shadow-lg shadow-brand-200 mb-4">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AppInmobiliaria</h1>
          <p className="text-slate-500 mt-2">Plataforma de Gestión Multi-Empresa</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acceder al Sistema'}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6">Explorar por Roles (Demo)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button 
              onClick={() => handleDemo('super_admin')}
              className="demo-btn bg-slate-900 text-white col-span-2 md:col-span-1"
            >
              <Globe className="w-4 h-4 text-brand-500" />
              Super Admin
            </button>
            <button 
              onClick={() => handleDemo('gerente')}
              className="demo-btn bg-white border border-slate-200 text-slate-700"
            >
              <Briefcase className="w-4 h-4 text-brand-500" />
              Gerente
            </button>
            <button 
              onClick={() => handleDemo('broker')}
              className="demo-btn bg-white border border-slate-200 text-slate-700"
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Broker
            </button>
            <button 
              onClick={() => handleDemo('asesor')}
              className="demo-btn bg-white border border-slate-200 text-slate-700"
            >
              <Users className="w-4 h-4 text-green-500" />
              Asesor
            </button>
            <button 
              onClick={() => handleDemo('cliente')}
              className="demo-btn bg-white border border-slate-200 text-slate-700"
            >
              <UserIcon className="w-4 h-4 text-amber-500" />
              Cliente
            </button>
          </div>
        </div>

        <style>{`
          .demo-btn {
            @apply flex items-center justify-center gap-2 py-3 px-4 rounded-2xl hover:shadow-md transition-all text-xs font-black uppercase tracking-tighter active:scale-95;
          }
        `}</style>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            © 2026 AppInmobiliaria • Gestión Global
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
