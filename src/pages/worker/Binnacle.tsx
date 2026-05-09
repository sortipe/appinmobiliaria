import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  BookOpen, 
  Plus, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  History,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
}

const Binnacle: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('binnacle')
        .select('*')
        .eq('worker_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      const fileExt = uploadingFile.file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `binnacle/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('binnacle-photos')
        .upload(filePath, uploadingFile.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('binnacle-photos')
        .getPublicUrl(filePath);

      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadingFile.id 
          ? { ...f, status: 'completed', progress: 100, url: publicUrl } 
          : f
      ));

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadingFile.id ? { ...f, status: 'error' } : f
      ));
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Simulate progress and perform actual upload
    const uploadPromises = newUploadingFiles.map(async (uFile) => {
      // Small delay to show progress bar starting
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, progress: 30 } : f));
      
      const url = await uploadFile(uFile);
      return url;
    });

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const completedPhotos = uploadingFiles
      .filter(f => f.status === 'completed' && f.url)
      .map(f => f.url as string);

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('binnacle')
        .insert([{
          worker_id: user?.id,
          content,
          photos: completedPhotos,
          log_date: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;
      setContent('');
      setUploadingFiles([]);
      fetchLogs();
    } catch (error) {
      alert('Error al guardar bitácora');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-brand-500" />
          Bitácora Diaria
        </h1>
        <p className="text-slate-500 mt-1 text-lg">Registra tus actividades y avances del día.</p>
      </div>

      {/* Entry Form */}
      <div className="glass-card p-6 shadow-xl border-t-4 border-t-brand-500">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Plus className="w-4 h-4" /> Nueva Entrada
          </div>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué hiciste hoy? Describe tus visitas, llamadas o gestiones..."
            className="input-field min-h-[150px] text-lg resize-none"
            required
          />
          <div className="flex flex-col gap-4">
            {uploadingFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {uploadingFiles.map((file) => (
                  <div key={file.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {file.status === 'completed' && file.url ? (
                      <img src={file.url} alt="upload" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2">
                        {file.status === 'uploading' ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-brand-500 mb-2" />
                            <div className="progress-bar-container h-1.5">
                              <div className="progress-bar-fill" style={{ width: `${file.progress}%` }} />
                            </div>
                          </>
                        ) : (
                          <div className="text-red-500 text-xs font-bold text-center">Error en carga</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-slate-400 hover:text-brand-500 transition-colors text-sm font-bold"
              >
                <ImageIcon className="w-5 h-5" />
                Adjuntar Fotos
              </button>
              <button 
                disabled={submitting || !content.trim() || uploadingFiles.some(f => f.status === 'uploading')}
                className="btn-primary px-8 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Publicar Log
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4" /> Historial de Actividad
        </h3>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>
        ) : logs.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-slate-400 italic text-lg">Aún no has registrado actividades.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-8 border-l-2 border-slate-200 py-2">
                <div className="absolute -left-2.5 top-3 w-5 h-5 bg-white border-2 border-brand-500 rounded-full" />
                <div className="glass-card p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {log.log_date}
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap text-lg leading-relaxed mb-4">{log.content}</p>
                  {log.photos && log.photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {log.photos.map((photo: string, idx: number) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                          <img src={photo} alt={`log-${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Binnacle;
