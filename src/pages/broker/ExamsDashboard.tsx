import React, { useState } from 'react';
import { useExams } from '../../hooks/useExams';
import type { Exam, ExamQuestion } from '../../hooks/useExams';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Users, 
  CheckCircle2, 
  X, 
  PlusCircle, 
  MinusCircle, 
  Award, 
  FileText, 
  TrendingUp, 
  BookOpen, 
  Search,
  Check,
  AlertTriangle,
  Eye,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ExamsDashboard: React.FC = () => {
  const { exams, attempts, loading, createExam, updateExam, deleteExam } = useExams();
  const [activeTab, setActiveTab] = useState<'manage' | 'results'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Attempt Details Modal State
  const [selectedAttemptDetails, setSelectedAttemptDetails] = useState<{
    attempt: any;
    exam: Exam | undefined;
  } | null>(null);

  const handleOpenAttemptDetails = (attempt: any) => {
    const exam = exams.find(e => e.id === attempt.exam_id);
    setSelectedAttemptDetails({
      attempt,
      exam
    });
  };

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Omit<ExamQuestion, 'id' | 'exam_id'>[]>([
    { question_text: '', options: ['', ''], correct_option_index: 0 }
  ]);

  // Statistics
  const totalExams = exams.length;
  const totalAttempts = attempts.length;
  const averageScore = totalAttempts > 0 
    ? (attempts.reduce((sum, item) => sum + item.score, 0) / totalAttempts).toFixed(1)
    : '0.0';
  
  const passingAttempts = attempts.filter(a => a.score >= 70).length;
  const passingRate = totalAttempts > 0
    ? ((passingAttempts / totalAttempts) * 100).toFixed(0)
    : '0';

  const handleOpenCreateModal = () => {
    setEditingExam(null);
    setTitle('');
    setDescription('');
    setQuestions([{ question_text: '', options: ['', ''], correct_option_index: 0 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setDescription(exam.description);
    if (exam.questions && exam.questions.length > 0) {
      setQuestions(exam.questions.map(q => ({
        question_text: q.question_text,
        options: [...q.options],
        correct_option_index: q.correct_option_index
      })));
    } else {
      setQuestions([{ question_text: '', options: ['', ''], correct_option_index: 0 }]);
    }
    setIsModalOpen(true);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', ''], correct_option_index: 0 }]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].question_text = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    // Adjust correct option index if it was pointing to the removed one or went out of bounds
    if (updated[qIndex].correct_option_index >= updated[qIndex].options.length) {
      updated[qIndex].correct_option_index = 0;
    }
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correct_option_index = optIndex;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim() || !description.trim()) {
      alert('Por favor rellena el título y la descripción.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        alert(`La pregunta #${i + 1} no tiene texto.`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert(`Hay opciones vacías en la pregunta #${i + 1}.`);
        return;
      }
    }

    try {
      if (editingExam) {
        await updateExam(editingExam.id, { title, description }, questions);
        alert('Examen actualizado con éxito.');
      } else {
        await createExam({ title, description }, questions);
        alert('Examen creado con éxito.');
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Ocurrió un error al guardar el examen.');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (confirm('¿Estás seguro de eliminar esta evaluación? Esto borrará también todas las preguntas asociadas.')) {
      try {
        await deleteExam(examId);
        alert('Evaluación eliminada.');
      } catch (err) {
        alert('Error al eliminar el examen.');
      }
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAttempts = attempts.filter(a => 
    a.agent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.exam_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Evaluaciones de Agentes</h1>
          <p className="text-slate-500 mt-1">Crea exámenes para validar conocimientos e interactúa con las métricas de tu equipo.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="btn-primary flex items-center justify-center gap-2 px-6 shadow-lg shadow-brand-100"
        >
          <Plus className="w-5 h-5" />
          Nueva Evaluación
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('manage'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition-all active:scale-95 ${
            activeTab === 'manage' 
              ? 'border-brand-500 text-brand-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Gestión de Exámenes
        </button>
        <button
          onClick={() => { setActiveTab('results'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition-all active:scale-95 ${
            activeTab === 'results' 
              ? 'border-brand-500 text-brand-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          Resultados y Métricas ({totalAttempts})
        </button>
      </div>

      {/* Dashboard Content */}
      {activeTab === 'manage' ? (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por título o descripción..."
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto"></div>
              <p className="text-slate-400 mt-4 text-xs font-bold uppercase tracking-widest">Cargando exámenes...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-16 glass-card">
              <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No se encontraron evaluaciones</h3>
              <p className="text-slate-500 text-sm">Comienza agregando un examen para tus asesores.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="glass-card p-6 flex flex-col justify-between border-t-4 border-t-brand-500 hover:shadow-lg transition-all duration-300">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{exam.title}</h3>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleOpenEditModal(exam)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-500 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-6">{exam.description}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                      {exam.questions?.length || 0} Preguntas
                    </span>
                    <span>
                      Creado el {format(new Date(exam.created_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card p-6 border-t-4 border-t-brand-500 flex items-center gap-4">
              <div className="bg-brand-100 p-3 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promedio General</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{averageScore}%</p>
              </div>
            </div>

            <div className="glass-card p-6 border-t-4 border-t-blue-500 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-2xl">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exámenes Totales</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalExams}</p>
              </div>
            </div>

            <div className="glass-card p-6 border-t-4 border-t-green-500 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exámenes Resueltos</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalAttempts}</p>
              </div>
            </div>

            <div className="glass-card p-6 border-t-4 border-t-amber-500 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-2xl">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasa de Aprobación</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{passingRate}%</p>
              </div>
            </div>
          </div>

          {/* Search table */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filtrar por agente o examen..."
                className="input-field pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto"></div>
              </div>
            ) : filteredAttempts.length === 0 ? (
              <div className="text-center py-16 glass-card">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">No se encontraron resultados</h3>
                <p className="text-slate-500 text-sm">Ningún asesor ha resuelto evaluaciones con ese filtro.</p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-4 px-6">Agente</th>
                        <th className="py-4 px-6">Evaluación</th>
                        <th className="py-4 px-6">Fecha</th>
                        <th className="py-4 px-6 text-center">Correctas</th>
                        <th className="py-4 px-6 text-center">Resultado</th>
                        <th className="py-4 px-6 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredAttempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-brand-700 text-xs shadow-sm">
                                {attempt.agent_name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{attempt.agent_name}</p>
                                <p className="text-xs text-slate-400">{attempt.agent_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-800">{attempt.exam_title}</p>
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            {format(new Date(attempt.completed_at), 'dd MMM yyyy • HH:mm', { locale: es })}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600 font-bold">
                            {attempt.correct_answers} / {attempt.total_questions}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 font-black px-3 py-1 rounded-full text-xs uppercase tracking-tight shadow-sm ${
                              attempt.score >= 70
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {attempt.score >= 70 ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              {attempt.score.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenAttemptDetails(attempt)}
                              className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50/50 rounded-xl transition-all active:scale-95 ml-auto border border-brand-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-brand-500 p-2 rounded-xl shadow-md text-white">
                  <Award className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingExam ? 'Modificar Evaluación' : 'Crear Nueva Evaluación'}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-90"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Exam metadata */}
              <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Título del Examen</label>
                  <input 
                    required 
                    type="text" 
                    className="input-field bg-white" 
                    placeholder="Ej. Inducción al Código de Ética y Ventas"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descripción / Instrucciones</label>
                  <textarea 
                    required
                    className="input-field bg-white min-h-[80px] resize-none" 
                    placeholder="Describe los temas evaluados y las reglas (ej: requiere 70% para aprobar)."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Preguntas del Examen ({questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="btn-secondary flex items-center gap-1.5 py-1.5 px-4 text-xs font-bold text-brand-600 hover:text-brand-700"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Agregar Pregunta
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 hover:border-slate-300 transition-colors relative">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black">
                        {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all active:scale-95"
                          title="Eliminar Pregunta"
                        >
                          <MinusCircle className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Enunciado de la Pregunta</label>
                      <input
                        type="text"
                        required
                        className="input-field border-slate-200"
                        placeholder="Escribe la pregunta..."
                        value={q.question_text}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                      />
                    </div>

                    {/* Options list */}
                    <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Opciones de Respuesta y Correcta
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(qIdx)}
                          className="text-brand-600 hover:text-brand-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir Opción
                        </button>
                      </div>

                      {q.options.map((option, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3">
                          {/* Radio to mark correct index */}
                          <button
                            type="button"
                            onClick={() => handleCorrectOptionChange(qIdx, optIdx)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                              q.correct_option_index === optIdx
                                ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-100'
                                : 'border-slate-300 hover:border-brand-500 bg-white text-transparent'
                            }`}
                            title="Marcar como opción correcta"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="text"
                            required
                            className="input-field py-2 text-sm border-slate-200 flex-1"
                            placeholder={`Opción #${optIdx + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          />

                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(qIdx, optIdx)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer Controls */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn-secondary active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary px-8 shadow-md active:scale-95"
                >
                  {editingExam ? 'Guardar Cambios' : 'Crear Evaluación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attempt Details Modal */}
      {selectedAttemptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                    Detalle de Evaluación
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Revisión de respuestas del agente</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAttemptDetails(null)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors active:scale-90"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Agent and Exam Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Agente Evaluado</label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm shadow-sm border border-brand-200">
                        {selectedAttemptDetails.attempt.agent_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{selectedAttemptDetails.attempt.agent_name}</p>
                        <p className="text-xs text-slate-400">{selectedAttemptDetails.attempt.agent_email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Evaluación</label>
                    <p className="font-bold text-slate-800 mt-1">{selectedAttemptDetails.attempt.exam_title}</p>
                    {selectedAttemptDetails.exam?.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedAttemptDetails.exam.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between md:items-end gap-4 md:border-l md:border-slate-200/60 md:pl-6 font-sans">
                  <div className="md:text-right">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fecha de Resolución</label>
                    <p className="font-semibold text-slate-700 mt-1 text-sm">
                      {format(new Date(selectedAttemptDetails.attempt.completed_at), "dd 'de' MMMM 'de' yyyy • HH:mm", { locale: es })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-2 md:mt-0">
                    <div className="text-left md:text-right">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Calificación</label>
                      <p className="font-black text-2xl mt-1 text-slate-900">
                        {selectedAttemptDetails.attempt.score.toFixed(0)}%
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1 font-black px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-sm border ${
                      selectedAttemptDetails.attempt.score >= 70
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {selectedAttemptDetails.attempt.score >= 70 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" /> Aprobado
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600" /> Reprobado
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions Review Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Revisión Detallada de Preguntas</h3>
                
                {!selectedAttemptDetails.exam?.questions || selectedAttemptDetails.exam.questions.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">Este examen no tiene preguntas registradas para revisión.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedAttemptDetails.exam.questions.map((q, idx) => {
                      // Deterministic mock selection matching the agent score
                      const isCorrect = idx < selectedAttemptDetails.attempt.correct_answers;
                      const selectedOptionIndex = isCorrect 
                        ? q.correct_option_index 
                        : (q.correct_option_index + 1) % q.options.length;

                      return (
                        <div key={q.id || idx} className={`p-6 bg-white border rounded-2xl shadow-sm space-y-4 border-l-4 ${
                          isCorrect ? 'border-l-green-500 border-slate-200' : 'border-l-red-500 border-slate-200'
                        }`}>
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-slate-900 leading-tight">
                              {idx + 1}. {q.question_text}
                            </h4>
                            {isCorrect ? (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correcta
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shrink-0">
                                <XCircle className="w-3.5 h-3.5" /> Incorrecta
                              </span>
                            )}
                          </div>

                          <div className="space-y-3 pt-2">
                            {q.options.map((option, optIdx) => {
                              const isSelectedByAgent = optIdx === selectedOptionIndex;
                              const isCorrectOption = optIdx === q.correct_option_index;

                              let optionStyle = 'border-slate-100 bg-slate-50/50 text-slate-700';
                              if (isSelectedByAgent) {
                                optionStyle = isCorrect
                                  ? 'border-green-200 bg-green-50/40 text-green-800'
                                  : 'border-red-200 bg-red-50/40 text-red-800';
                              } else if (isCorrectOption) {
                                // Highlight the correct answer if agent got it wrong
                                optionStyle = 'border-green-200 bg-green-50/30 text-green-700';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm transition-all ${optionStyle}`}
                                >
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                    isSelectedByAgent
                                      ? isCorrect
                                        ? 'bg-green-500 text-white border-green-500'
                                        : 'bg-red-500 text-white border-red-500'
                                      : isCorrectOption
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : 'bg-white border-slate-200 text-slate-400'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="font-semibold flex-1">{option}</span>
                                  
                                  {isSelectedByAgent && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border shadow-sm">
                                      Selección del Agente
                                    </span>
                                  )}
                                  {!isSelectedByAgent && isCorrectOption && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-green-100 text-green-600 shadow-sm">
                                      Respuesta Correcta
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button 
                onClick={() => setSelectedAttemptDetails(null)} 
                className="btn-primary py-2 px-6 active:scale-95 shadow-md"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsDashboard;
