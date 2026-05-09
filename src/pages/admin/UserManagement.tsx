import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Shield, 
  Mail, 
  Trash2, 
  Edit2, 
  X,
  ShieldCheck,
  User as UserIcon,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserManagement: React.FC = () => {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('asesor');

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    if (!currentUser?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback for demo
      if (!users.length) {
        setUsers([
          { id: '1', full_name: 'Carlos Mendoza', email: 'carlos@demo.com', role: 'broker', company_id: currentUser.company_id },
          { id: '2', full_name: 'Ana García', email: 'ana@demo.com', role: 'asesor', company_id: currentUser.company_id },
          { id: '3', full_name: 'Roberto Smith', email: 'roberto@demo.com', role: 'asesor', company_id: currentUser.company_id },
        ]);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we'd call a Supabase Edge Function or Auth API to create the user
    // For now, we update local state for the demo
    const newUser: Profile = {
      id: editingUser?.id || Math.random().toString(36).substr(2, 9),
      full_name: fullName,
      email: email,
      role: role,
      company_id: currentUser?.company_id || ''
    };

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? newUser : u));
    } else {
      setUsers([...users, newUser]);
    }

    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setRole('asesor');
  };

  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setRole(user.role);
    setIsModalOpen(true);
  };

  const deleteUser = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar a este usuario?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Equipo</h1>
          <p className="text-slate-500 font-medium">Administra brokers, asesores y sus permisos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 py-3 px-6 shadow-xl shadow-brand-100"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white/50">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              className="input-field pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <motion.tr 
                  layout
                  key={user.id} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-black border border-brand-100">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter
                      ${user.role === 'broker' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                    `}>
                      {user.role === 'broker' ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Integrante'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field" 
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field" 
                    placeholder="juan@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Rol</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setRole('broker')}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                        ${role === 'broker' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}
                      `}
                    >
                      <Briefcase className="w-6 h-6" />
                      <span className="text-xs font-black uppercase">Broker</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('asesor')}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                        ${role === 'asesor' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}
                      `}
                    >
                      <UserIcon className="w-6 h-6" />
                      <span className="text-xs font-black uppercase">Asesor</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-100">
                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
