import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../lib/supabase';
import type { Visit } from '../lib/supabase';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MapPin, User, ChevronRight, Plus, X, Calendar as CalendarIcon, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Property, Profile } from '../lib/supabase';

const CalendarView: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();

  const [newEvent, setNewEvent] = useState({
    property_id: '',
    worker_id: '',
    client_name: '',
    client_dni: '',
    client_phone: '',
    client_type: 'Independiente' as 'Independiente' | 'Dependiente',
    payment_method: 'Contado' as 'Contado' | 'Crédito',
    time: '09:00',
  });

  useEffect(() => {
    if (!profile) return;
    fetchVisits();
    fetchFormData();
  }, [profile]);

  const fetchFormData = async () => {
    const isDemo = localStorage.getItem('demo_user');
    
    // Load properties from cache first (especially important for Demo mode)
    const cachedProps = localStorage.getItem('properties_cache');
    if (cachedProps) {
      setProperties(JSON.parse(cachedProps).filter((p: Property) => p.status === 'Disponible'));
    }

    if (isDemo) {
      setWorkers([
        { id: 'worker-1', full_name: 'Juan Pérez', role: 'asesor', email: 'juan@example.com' },
        { id: 'worker-2', full_name: 'María García', role: 'broker', email: 'maria@example.com' },
        { id: 'worker-3', full_name: 'Carlos Rodríguez', role: 'asesor', email: 'carlos@example.com' }
      ] as Profile[]);
      return;
    }

    try {
      let propsQuery = supabase.from('properties').select('*').eq('status', 'Disponible');
      let workersQuery = supabase.from('profiles').select('*').in('role', ['asesor', 'broker', 'gerente']);

      if (profile?.role !== 'super_admin' && profile?.company_id) {
        propsQuery = propsQuery.eq('company_id', profile.company_id);
        workersQuery = workersQuery.eq('company_id', profile.company_id);
      }

      const [propsRes, workersRes] = await Promise.all([propsQuery, workersQuery]);

      if (propsRes.data) {
        setProperties(propsRes.data);
        localStorage.setItem('properties_cache', JSON.stringify(propsRes.data));
      }
      if (workersRes.data) setWorkers(workersRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const fetchVisits = async () => {
    const isDemo = localStorage.getItem('demo_user');
    try {
      setLoading(true);
      
      if (isDemo) {
        const cached = localStorage.getItem('visits_cache');
        if (cached) setVisits(JSON.parse(cached));
        return;
      }

      const { data, error } = await supabase
        .from('visits')
        .select('*, property:properties(*), worker:profiles(*)')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    try {
      setSubmitting(true);
      const scheduledAt = new Date(date);
      const [hours, minutes] = newEvent.time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from('visits')
        .insert([{
          company_id: profile.company_id,
          property_id: newEvent.property_id,
          worker_id: newEvent.worker_id || profile.id,
          client_name: newEvent.client_name,
          client_dni: newEvent.client_dni,
          client_phone: newEvent.client_phone,
          client_type: newEvent.client_type,
          payment_method: newEvent.payment_method,
          scheduled_at: scheduledAt.toISOString(),
          status: 'Pendiente'
        }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setNewEvent({
        property_id: '',
        worker_id: '',
        client_name: '',
        client_dni: '',
        client_phone: '',
        client_type: 'Independiente',
        payment_method: 'Contado',
        time: '09:00',
      });
      fetchVisits();
    } catch (error) {
      if (isDemo) {
        // Handle Demo Persistance
        const scheduledAt = new Date(date);
        const [hours, minutes] = newEvent.time.split(':');
        scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const property = properties.find(p => p.id === newEvent.property_id);
        const worker = workers.find(w => w.id === newEvent.worker_id);

        const newVisit: any = {
          id: crypto.randomUUID(),
          property_id: newEvent.property_id,
          worker_id: newEvent.worker_id,
          client_name: newEvent.client_name,
          scheduled_at: scheduledAt.toISOString(),
          status: 'Pendiente',
          property,
          worker
        };

        const updatedVisits = [...visits, newVisit];
        setVisits(updatedVisits);
        localStorage.setItem('visits_cache', JSON.stringify(updatedVisits));
        setIsModalOpen(false);
      } else {
        alert('Error al crear evento');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDateVisits = visits.filter(v => isSameDay(new Date(v.scheduled_at), date));

  // Function to add dot to days with visits
  const tileContent = ({ date: tileDate, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const hasVisit = visits.some(v => isSameDay(new Date(v.scheduled_at), tileDate));
      if (hasVisit) {
        return <div className="h-1.5 w-1.5 bg-brand-500 rounded-full mx-auto mt-1" />;
      }
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Calendario de Visitas</h2>
            <p className="text-slate-500 text-sm">Gestiona y programa las citas con clientes.</p>
          </div>
          {(profile?.role === 'super_admin' || profile?.role === 'gerente' || profile?.role === 'broker') && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nueva Visita
            </button>
          )}
        </div>
        <div className="glass-card p-6 shadow-xl border-t-4 border-t-brand-500">
          <Calendar 
            onChange={(val) => setDate(val as Date)} 
            value={date}
            locale="es-ES"
            tileContent={tileContent}
            className="w-full border-none rounded-xl font-sans"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            {format(date, "d 'de' MMMM", { locale: es })}
          </h3>
          <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-bold">
            {selectedDateVisits.length} EVENTOS
          </span>
        </div>

        {selectedDateVisits.length === 0 ? (
          <div className="glass-card p-8 text-center bg-slate-50/50">
            <p className="text-slate-400 text-sm italic">No hay visitas programadas para este día.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDateVisits.map(visit => (
              <div key={visit.id} className="glass-card p-4 border-l-4 border-l-brand-500 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-black text-brand-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {format(new Date(visit.scheduled_at), 'HH:mm')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2 truncate">{visit.property?.name}</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" /> {visit.property?.address}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="w-3 h-3" /> {visit.client_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .react-calendar {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
        }
        .react-calendar__tile--active {
          background: #f97316 !important;
          border-radius: 12px;
          color: white !important;
        }
        .react-calendar__tile--now {
          background: #ffedd5 !important;
          border-radius: 12px;
          color: #f97316 !important;
        }
        .react-calendar__tile:hover {
          border-radius: 12px;
          background: #f8fafc !important;
        }
        .react-calendar__navigation button:hover {
          background: #f8fafc !important;
          border-radius: 12px;
        }
        .react-calendar__month-view__weekdays__weekday {
          color: #94a3b8;
          text-decoration: none !important;
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        abbr[title] {
          text-decoration: none !important;
        }
      `}</style>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand-500" />
                Programar Visita - {format(date, "d 'de' MMMM", { locale: es })}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Propiedad</label>
                  <select 
                    required 
                    className="input-field"
                    value={newEvent.property_id}
                    onChange={(e) => setNewEvent({...newEvent, property_id: e.target.value})}
                  >
                    <option value="">Seleccionar Propiedad</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Asignar a Trabajador</label>
                  <select 
                    required 
                    className="input-field"
                    value={newEvent.worker_id}
                    onChange={(e) => setNewEvent({...newEvent, worker_id: e.target.value})}
                  >
                    <option value="">Seleccionar Asesor</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.full_name} ({w.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre del Cliente</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field" 
                    placeholder="Nombre completo"
                    value={newEvent.client_name}
                    onChange={(e) => setNewEvent({...newEvent, client_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">DNI del Cliente</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field" 
                    placeholder="Número de documento"
                    value={newEvent.client_dni}
                    onChange={(e) => setNewEvent({...newEvent, client_dni: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Ej. 987654321"
                    value={newEvent.client_phone}
                    onChange={(e) => setNewEvent({...newEvent, client_phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Hora</label>
                  <input 
                    required 
                    type="time" 
                    className="input-field" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tipo de Cliente</label>
                  <select 
                    className="input-field"
                    value={newEvent.client_type}
                    onChange={(e) => setNewEvent({...newEvent, client_type: e.target.value as any})}
                  >
                    <option value="Independiente">Independiente</option>
                    <option value="Dependiente">Dependiente</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn-primary px-8 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Programar Visita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
