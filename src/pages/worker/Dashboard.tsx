import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Visit } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  ChevronRight, 
  Navigation, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const WorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchAssignedVisits();
  }, [user]);

  const fetchAssignedVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select('*, property:properties(*)')
        .eq('worker_id', user?.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (visitId: string) => {
    setIsCheckingIn(visitId);
    
    // Attempt to get GPS
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await updateVisitCheckIn(visitId, latitude, longitude, false);
      },
      async (error) => {
        console.warn('GPS failed, requesting manual check-in time', error);
        if (confirm('No se pudo obtener el GPS. ¿Deseas realizar un registro manual de hora?')) {
          await updateVisitCheckIn(visitId, null, null, true);
        } else {
          setIsCheckingIn(null);
        }
      }
    );
  };

  const updateVisitCheckIn = async (visitId: string, lat: number | null, lng: number | null, manual: boolean) => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({
          check_in_at: new Date().toISOString(),
          check_in_lat: lat,
          check_in_lng: lng,
          check_in_manual: manual,
          status: 'Completada' // Optional: move to completed after report, but for now mark arrival
        })
        .eq('id', visitId);

      if (error) throw error;
      
      setVisits(visits.map(v => v.id === visitId ? { 
        ...v, 
        check_in_at: new Date().toISOString(),
        status: 'Completada' 
      } : v));
      
      alert('¡Llegada registrada exitosamente!');
    } catch (error) {
      alert('Error al registrar llegada');
    } finally {
      setIsCheckingIn(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mis Visitas</h1>
          <p className="text-slate-500">Hoy es {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
        </div>
        <div className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
          {visits.filter(v => v.status === 'Pendiente').length} Pendientes
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No tienes visitas programadas</h3>
          <p className="text-slate-500">Buen trabajo, por ahora estás libre.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <div key={visit.id} className={`glass-card p-5 border-l-4 transition-all duration-200 ${
              visit.status === 'Completada' ? 'border-l-green-500 bg-green-50/30' : 'border-l-brand-500'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${visit.status === 'Completada' ? 'bg-green-100' : 'bg-brand-100'}`}>
                    {visit.status === 'Completada' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-brand-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {format(new Date(visit.scheduled_at), 'HH:mm aaa')}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">{visit.property?.name}</h3>
                  </div>
                </div>
                {visit.status === 'Pendiente' && (
                  <button 
                    onClick={() => handleCheckIn(visit.id)}
                    disabled={isCheckingIn === visit.id}
                    className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                  >
                    {isCheckingIn === visit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    Check-in GPS
                  </button>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {visit.property?.address}
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  Cliente: <span className="font-semibold">{visit.client_name}</span>
                </div>
              </div>

              {visit.status === 'Completada' ? (
                <div className="pt-4 border-t border-green-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Visitado a las {format(new Date(visit.check_in_at!), 'HH:mm')}
                  </span>
                  <button className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">
                    Ver Reporte <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                  <AlertCircle className="w-3 h-3" /> Requiere registro de llegada antes de llenar reporte.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
