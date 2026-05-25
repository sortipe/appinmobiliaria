import React, { useState } from 'react';
import { useExams } from '../../hooks/useExams';
import type { Exam } from '../../hooks/useExams';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Check, 
  X,
  FileText,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ExamsList: React.FC = () => {
  const { exams, attempts, loading, submitAttempt } = useExams();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  
  // Quiz Resolution State
  const [activeQuiz, setActiveQuiz] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]); // stores selected index per question
  
  // Results view overlay
  const [quizResultToShow, setQuizResultToShow] = useState<{
    exam: Exam;
    correctCount: number;
    totalCount: number;
    score: number;
    userAnswers: number[];
  } | null>(null);

  // Separate completed exams by checking attempts
  const completedExamIds = attempts.map(a => a.exam_id);
  
  const pendingExams = exams.filter(e => !completedExamIds.includes(e.id));
  const completedExams = exams.filter(e => completedExamIds.includes(e.id));

  const handleStartQuiz = (exam: Exam) => {
    if (!exam.questions || exam.questions.length === 0) {
      alert('Esta evaluación aún no tiene preguntas.');
      return;
    }
    setActiveQuiz(exam);
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(exam.questions.length).fill(-1));
    setQuizResultToShow(null);
  };

  const handleSelectOption = (optIndex: number) => {
    const updated = [...selectedAnswers];
    updated[currentQuestionIndex] = optIndex;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (selectedAnswers[currentQuestionIndex] === -1) {
      alert('Por favor selecciona una respuesta para continuar.');
      return;
    }
    
    if (activeQuiz && currentQuestionIndex < activeQuiz.questions!.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (selectedAnswers[currentQuestionIndex] === -1) {
      alert('Por favor selecciona una respuesta para continuar.');
      return;
    }

    if (!activeQuiz || !activeQuiz.questions) return;

    // Calculate score
    let correctCount = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (q.correct_option_index === selectedAnswers[idx]) {
        correctCount++;
      }
    });

    const totalCount = activeQuiz.questions.length;
    const score = parseFloat(((correctCount / totalCount) * 100).toFixed(2));

    try {
      await submitAttempt(activeQuiz.id, correctCount, totalCount);
      
      // Save details to show on the success screen
      setQuizResultToShow({
        exam: activeQuiz,
        correctCount,
        totalCount,
        score,
        userAnswers: [...selectedAnswers]
      });
      
      setActiveQuiz(null);
    } catch (err) {
      alert('Ocurrió un error al procesar tu examen.');
    }
  };

  const handleShowHistoricResult = (exam: Exam) => {
    const attempt = attempts.find(a => a.exam_id === exam.id);
    if (!attempt || !exam.questions) return;
    
    // We don't have the exact user answers stored historically in attempts db (or mock),
    // so we can reconstruct a mock list where the incorrect ones are flagged randomly or matches correct
    // for visual purposes, or simply show a premium score summary card.
    // In our local storage mock or real attempts we have the score. Let's make a beautiful card!
    
    setQuizResultToShow({
      exam,
      correctCount: attempt.correct_answers,
      totalCount: attempt.total_questions,
      score: attempt.score,
      userAnswers: [] // Historic doesn't store choices in this mock, we'll display score & correct key
    });
  };

  const handleCloseResults = () => {
    setQuizResultToShow(null);
    setSelectedAnswers([]);
    setActiveQuiz(null);
  };

  if (activeQuiz && activeQuiz.questions && activeQuiz.questions.length > 0) {
    const question = activeQuiz.questions[currentQuestionIndex];
    const totalQuestions = activeQuiz.questions.length;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const currentSelection = selectedAnswers[currentQuestionIndex];

    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-xl">
          <div>
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block">Evaluación en Curso</span>
            <h1 className="text-lg font-bold truncate max-w-md">{activeQuiz.title}</h1>
          </div>
          <button 
            onClick={() => {
              if (confirm('¿Estás seguro de salir del examen? Perderás todo tu progreso actual.')) {
                setActiveQuiz(null);
              }
            }}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-all active:scale-90"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
            <span>Pregunta {currentQuestionIndex + 1} de {totalQuestions}</span>
            <span>{progressPercent.toFixed(0)}% Completado</span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Question Panel */}
        <div className="glass-card p-8 border-l-4 border-l-brand-500 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            {question.question_text}
          </h2>

          <div className="space-y-4 pt-4">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-150 flex items-center gap-4 group ${
                  currentSelection === idx
                    ? 'border-brand-500 bg-brand-50/40 shadow-md shadow-brand-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm border transition-colors ${
                  currentSelection === idx
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-700'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={`font-semibold ${currentSelection === idx ? 'text-slate-900' : 'text-slate-700'}`}>
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="btn-secondary py-3 px-6 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            Anterior
          </button>
          
          {currentQuestionIndex < totalQuestions - 1 ? (
            <button
              onClick={handleNext}
              disabled={currentSelection === -1}
              className="btn-primary py-3 px-8 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              Siguiente Pregunta
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={currentSelection === -1}
              className="btn-primary py-3 px-8 bg-green-600 hover:bg-green-700 shadow-md active:scale-95 disabled:opacity-50"
            >
              Finalizar y Ver Calificación
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz Result Screen / Scorecard overlay
  if (quizResultToShow) {
    const { exam, correctCount, totalCount, score, userAnswers } = quizResultToShow;
    const isPassing = score >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        {/* Celebration / Score Header */}
        <div className={`p-8 rounded-3xl text-center space-y-4 shadow-xl border-b-8 ${
          isPassing 
            ? 'bg-green-900 text-white border-b-green-700' 
            : 'bg-red-950 text-white border-b-red-800'
        }`}>
          <div className="inline-flex bg-white/10 p-4 rounded-full shadow-inner mb-2 animate-bounce">
            <Award className={`w-12 h-12 ${isPassing ? 'text-green-300' : 'text-red-300'}`} />
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            {isPassing ? '¡Felicitaciones, Evaluado!' : 'Sigue Practicando'}
          </h1>
          <p className="text-white/80 max-w-md mx-auto text-sm">
            {isPassing 
              ? `Has aprobado satisfactoriamente la evaluación "${exam.title}" con un puntaje premium.`
              : `No has alcanzado el 70% requerido para aprobar "${exam.title}". Te recomendamos revisar el temario.`
            }
          </p>
          <div className="pt-2">
            <span className={`inline-flex items-center gap-2 font-black text-4xl px-6 py-2 rounded-2xl shadow-inner ${
              isPassing ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              {score.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 pt-2">
            Respuestas Correctas: {correctCount} de {totalCount}
          </p>
        </div>

        {/* Detailed Question Review (Only available if just answered) */}
        {userAnswers.length > 0 && exam.questions && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-slate-800 tracking-tight pl-1">Revisión de Preguntas</h2>
            <div className="space-y-4">
              {exam.questions.map((q, idx) => {
                const userChoice = userAnswers[idx];
                const isCorrect = userChoice === q.correct_option_index;
                return (
                  <div key={q.id} className={`glass-card p-6 border-l-4 ${
                    isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                  } space-y-4`}>
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {idx + 1}. {q.question_text}
                      </h3>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full shadow-sm shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correcta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full shadow-sm shrink-0">
                          <XCircle className="w-3.5 h-3.5" /> Incorrecta
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 text-sm pl-2">
                      <p className="text-slate-500">
                        Tu selección: <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                          {q.options[userChoice]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-slate-600 font-semibold flex items-center gap-1 bg-green-50/50 p-2 rounded-lg border border-green-100/50">
                          <Check className="w-4 h-4 text-green-600" />
                          Respuesta correcta: <span className="text-green-700">{q.options[q.correct_option_index]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <button 
            onClick={handleCloseResults}
            className="btn-primary py-3 px-8 shadow-lg shadow-brand-100 active:scale-95"
          >
            Volver a Evaluaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Evaluaciones</h1>
        <p className="text-slate-500 mt-1">Completa los exámenes requeridos por el Broker y monitorea tu desarrollo profesional.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition-all active:scale-95 ${
            activeTab === 'pending' 
              ? 'border-brand-500 text-brand-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Pendientes ({pendingExams.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 transition-all active:scale-95 ${
            activeTab === 'completed' 
              ? 'border-brand-500 text-brand-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Completados ({completedExams.length})
        </button>
      </div>

      {/* Quiz Lists */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto"></div>
        </div>
      ) : activeTab === 'pending' ? (
        pendingExams.length === 0 ? (
          <div className="text-center py-16 glass-card">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-slate-900">¡Estás al día!</h3>
            <p className="text-slate-500 text-sm mt-1">No tienes evaluaciones pendientes de resolver por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingExams.map((exam) => (
              <div key={exam.id} className="glass-card p-6 flex flex-col justify-between border-t-4 border-t-brand-500 hover:shadow-lg transition-all duration-300">
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{exam.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3">{exam.description}</p>
                </div>
                
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-200/55 px-2.5 py-1 rounded-lg">
                    {exam.questions?.length || 0} Preguntas
                  </span>
                  <button
                    onClick={() => handleStartQuiz(exam)}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-1 shadow-md shadow-brand-100 active:scale-95"
                  >
                    Iniciar Examen
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        completedExams.length === 0 ? (
          <div className="text-center py-16 glass-card">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Aún no has completado exámenes</h3>
            <p className="text-slate-500 text-sm mt-1">Resuelve tus exámenes pendientes para ver tu historial aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedExams.map((exam) => {
              const attempt = attempts.find(a => a.exam_id === exam.id);
              const score = attempt?.score || 0;
              const isPassing = score >= 70;
              return (
                <div key={exam.id} className={`glass-card p-6 flex flex-col justify-between border-t-4 hover:shadow-lg transition-all duration-300 ${
                  isPassing ? 'border-t-green-500' : 'border-t-red-500'
                }`}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{exam.title}</h3>
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-black shadow-sm shrink-0 border ${
                        isPassing 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {score.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{exam.description}</p>
                  </div>
                  
                  <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Resuelto el {attempt ? format(new Date(attempt.completed_at), 'dd MMM yyyy', { locale: es }) : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleShowHistoricResult(exam)}
                      className="text-brand-600 hover:text-brand-700 font-bold hover:underline py-1"
                    >
                      Ver Puntaje
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default ExamsList;
