import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Property } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  MapPin, 
  Tag, 
  Image as ImageIcon,
  Loader2,
  Trash2,
  Edit,
  X
} from 'lucide-react';

const Properties: React.FC = () => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    price: '',
    description: '',
    status: 'Disponible' as 'Disponible' | 'Vendida',
  });

  useEffect(() => {
    if (!profile) return;

    const cached = localStorage.getItem('properties_cache');
    if (cached) {
      setProperties(JSON.parse(cached));
      setLoading(false);
    }
    fetchProperties();
  }, [profile]);

  const fetchProperties = async () => {
    const isDemo = localStorage.getItem('demo_user');
    if (isDemo) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
      localStorage.setItem('properties_cache', JSON.stringify(data || []));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDemo = localStorage.getItem('demo_user');
    const tempId = crypto.randomUUID();
    
    const newProperty: Property = {
      id: tempId,
      name: formData.name,
      address: formData.address,
      price: parseFloat(formData.price),
      description: formData.description,
      status: formData.status,
      currency: 'USD',
      images: [],
      company_id: profile?.company_id || '',
      created_at: new Date().toISOString(),
    };

    // Optimistic Update
    const previousProperties = [...properties];
    const updatedProperties = [newProperty, ...properties];
    setProperties(updatedProperties);
    localStorage.setItem('properties_cache', JSON.stringify(updatedProperties));
    
    setIsModalOpen(false);
    setFormData({ name: '', address: '', price: '', description: '', status: 'Disponible' });

    if (isDemo) {
      console.log('Demo mode: Skipping real database insert');
      return;
    }

    if (!profile?.company_id) {
      setProperties(previousProperties);
      alert('Error: No se pudo identificar tu empresa. Por favor, vuelve a iniciar sesión.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          ...formData,
          price: parseFloat(formData.price),
          company_id: profile.company_id
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update with real ID from DB
      setProperties(prev => prev.map(p => p.id === tempId ? data : p));
    } catch (error) {
      console.error('Error inserting property:', error);
      setProperties(previousProperties);
      alert('Error al agregar propiedad en la base de datos. Se ha revertido el cambio.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta propiedad?')) return;
    
    const previousProperties = [...properties];
    setProperties(properties.filter(p => p.id !== id));
    
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      setProperties(previousProperties);
      alert('Error al eliminar. Se ha restaurado la propiedad.');
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Propiedades</h1>
          <p className="text-slate-500 mt-1">Administra el catálogo de inmuebles disponibles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 px-6"
        >
          <Plus className="w-5 h-5" />
          Nueva Propiedad
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o dirección..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-400" />
          <select 
            className="input-field min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Vendida">Vendida</option>
          </select>
        </div>
      </div>

      {/* Property List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900">No se encontraron propiedades</h3>
          <p className="text-slate-500">Comienza agregando una nueva propiedad al catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="h-48 bg-slate-200 relative">
                {property.images?.[0] ? (
                  <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  property.status === 'Disponible' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {property.status}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {property.name}
                  </h3>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(property.id)}
                      disabled={isDeleting === property.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      {isDeleting === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  {property.address}
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-black text-brand-600">
                      {property.currency} {property.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nueva Propiedad</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddProperty} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre del Inmueble</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field" 
                    placeholder="Ej. Residencial Los Olivos #402"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Precio (USD)</label>
                  <input 
                    required 
                    type="number" 
                    className="input-field" 
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Dirección Completa</label>
                <input 
                  required 
                  type="text" 
                  className="input-field" 
                  placeholder="Av. Principal 123, Miraflores"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Descripción</label>
                <textarea 
                  className="input-field min-h-[100px] resize-none" 
                  placeholder="Detalles sobre la propiedad, ambientes, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary px-8">Guardar Propiedad</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
