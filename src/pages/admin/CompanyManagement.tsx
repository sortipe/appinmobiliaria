import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Building2, Mail, Phone, MapPin, Save, Globe } from 'lucide-react';

const CompanyManagement: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo_url: ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompany();
    }
  }, [profile]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (error) throw error;
      if (data) setCompanyData(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      // Fallback for demo
      if (profile?.company) {
        setCompanyData({
          name: profile.company.name || '',
          email: profile.company.email || '',
          phone: profile.company.phone || '',
          address: profile.company.address || '',
          logo_url: profile.company.logo_url || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', profile.company_id);

      if (error) throw error;
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mi Empresa</h1>
        <p className="text-slate-500 font-medium">Gestiona la información pública y de contacto de tu inmobiliaria.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="bg-brand-500 p-8 flex items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl">
            {companyData.logo_url ? (
              <img src={companyData.logo_url} alt={companyData.name} className="w-full h-full object-contain p-2" />
            ) : (
              <Building2 className="w-12 h-12" />
            )}
          </div>
          <div className="text-white">
            <h2 className="text-3xl font-black">{companyData.name || 'Sin Nombre'}</h2>
            <p className="text-brand-100 font-bold uppercase tracking-widest text-xs mt-1">Suscripción Activa</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Globe className="w-3 h-3" /> Nombre Comercial
              </label>
              <input 
                required
                type="text" 
                value={companyData.name}
                onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                className="input-field"
                placeholder="Ej. Mi Inmobiliaria SAC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Mail className="w-3 h-3" /> Correo Corporativo
              </label>
              <input 
                required
                type="email" 
                value={companyData.email}
                onChange={(e) => setCompanyData({...companyData, email: e.target.value})}
                className="input-field"
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Phone className="w-3 h-3" /> Teléfono de Contacto
              </label>
              <input 
                type="text" 
                value={companyData.phone}
                onChange={(e) => setCompanyData({...companyData, phone: e.target.value})}
                className="input-field"
                placeholder="+51 999 999 999"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Dirección Principal
              </label>
              <input 
                type="text" 
                value={companyData.address}
                onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
                className="input-field"
                placeholder="Calle Ejemplo 123, Lima"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              URL del Logo (Opcional)
            </label>
            <input 
              type="text" 
              value={companyData.logo_url}
              onChange={(e) => setCompanyData({...companyData, logo_url: e.target.value})}
              className="input-field"
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-10 py-4 shadow-xl shadow-brand-100"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyManagement;
