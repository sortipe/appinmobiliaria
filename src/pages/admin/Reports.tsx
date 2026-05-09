import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Visit } from '../../lib/supabase';
import { 
  FileDown, 
  BarChart3, 
  Calendar as CalendarIcon, 
  User, 
  TrendingUp, 
  ArrowUpRight,
  Download,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visits')
        .select('*, property:properties(*), worker:profiles(*)');

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(visits.map(v => ({
      Fecha: format(new Date(v.scheduled_at), 'yyyy-MM-dd HH:mm'),
      Propiedad: v.property?.name,
      Direccion: v.property?.address,
      Cliente: v.client_name,
      DNI: v.client_dni,
      Estado: v.status,
      Trabajador: v.worker?.full_name,
      Interes: v.interest_level || 'N/A',
      CheckIn: v.check_in_at ? format(new Date(v.check_in_at), 'HH:mm') : 'No realizado'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Visitas");
    XLSX.writeFile(workbook, `Reporte_Inmobiliario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte Detallado de Visitas - AppInmobiliaria", 14, 15);
    
    const tableData = visits.map(v => [
      format(new Date(v.scheduled_at), 'dd/MM HH:mm'),
      v.property?.name || '',
      v.client_name,
      v.status,
      v.worker?.full_name || ''
    ]);

    autoTable(doc, {
      head: [['Fecha/Hora', 'Propiedad', 'Cliente', 'Estado', 'Trabajador']],
      body: tableData,
      startY: 25,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] } // Orange brand color
    });

    doc.save(`Reporte_Inmobiliario_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Stats
  const completedVisits = visits.filter(v => v.status === 'Completada').length;
  const pendingVisits = visits.filter(v => v.status === 'Pendiente').length;
  const highInterest = visits.filter(v => v.interest_level === 'Alto').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reportes y Rendimiento</h1>
          <p className="text-slate-500 mt-1">Analiza el desempeño de las ventas y el equipo.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="btn-primary flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Generar PDF
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-t-4 border-t-brand-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-brand-50 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-brand-500" />
            </div>
            <span className="text-xs font-bold text-green-500 flex items-center gap-1">
              +12% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Visitas</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{visits.length}</p>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-green-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Completadas</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{completedVisits}</p>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-blue-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 p-2 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pendientes</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{pendingVisits}</p>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-amber-500">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-50 p-2 rounded-lg">
              <User className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Interés Alto</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{highInterest}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Historial Reciente</h3>
              <select 
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="all">Todos los tiempos</option>
                <option value="month">Este mes</option>
                <option value="week">Esta semana</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Propiedad</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visits.slice(0, 10).map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {format(new Date(v.scheduled_at), 'dd MMM, HH:mm', { locale: es })}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{v.property?.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{v.client_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                            v.status === 'Completada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-slate-900 text-white shadow-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              Resumen de Ventas
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>Meta Mensual</span>
                  <span>75%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 w-3/4 rounded-full" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase">Proyección</p>
                  <p className="text-2xl font-black text-white">$145,000</p>
                </div>
                <button className="text-brand-500 text-xs font-bold hover:underline flex items-center gap-1">
                  Ver Detalles <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-900 mb-4">Mejores Vendedores</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                    #{i}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Vendedor Demo {i}</p>
                    <p className="text-xs text-slate-500">{5 - i} ventas este mes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
