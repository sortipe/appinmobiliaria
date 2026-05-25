import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type ExamQuestion = {
  id: string;
  exam_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
};

export type Exam = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  created_at: string;
  created_by?: string;
  questions?: ExamQuestion[];
};

export type ExamAttempt = {
  id: string;
  exam_id: string;
  profile_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
  exam_title?: string;
  agent_name?: string;
  agent_email?: string;
};

// --- DATA SEMILLA MOCK PARA EL MODO DEMO ---
const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-seed-1',
    company_id: 'demo-company',
    title: 'Técnicas de Cierre de Ventas',
    description: 'Evaluación de habilidades y conocimientos sobre manejo de objeciones, persuasión, contratos de arras y cierres efectivos.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'demo-id',
    questions: [
      {
        id: 'q-s1-1',
        exam_id: 'exam-seed-1',
        question_text: '¿Cuál es la mejor respuesta inicial cuando un cliente potencial objeta diciendo que "el precio es muy alto"?',
        options: [
          'Ofrecer un descuento directo de inmediato para no perder la venta.',
          'Indagar sobre las razones de su percepción y reafirmar los beneficios únicos del inmueble.',
          'Indicarle educadamente que busque otra opción que sí se ajuste a sus posibilidades.',
          'Ignorar el comentario y continuar mostrando los ambientes del inmueble.'
        ],
        correct_option_index: 1
      },
      {
        id: 'q-s1-2',
        exam_id: 'exam-seed-1',
        question_text: '¿En qué consiste principalmente el método de cierre denominado "Cierre Alternativo"?',
        options: [
          'Ofrecer al cliente una propiedad totalmente diferente y más económica.',
          'Dar a elegir al cliente entre dos opciones positivas (ej: "¿Prefiere firmar el martes por la mañana o el jueves por la tarde?").',
          'Ejercer presión advirtiendo de que el inmueble tiene otra oferta de compra lista para ser firmada.',
          'Retirarse y esperar a que el cliente sea quien llame por iniciativa propia para cerrar.'
        ],
        correct_option_index: 1
      },
      {
        id: 'q-s1-3',
        exam_id: 'exam-seed-1',
        question_text: '¿Qué documento jurídico preliminar es indispensable firmar para formalizar la reserva en firme de una propiedad?',
        options: [
          'Un Contrato de Arrendamiento con opción a compra posterior.',
          'La Minuta de Elevación a Escritura Pública.',
          'Un Contrato de Arras Confirmatorias o Promesa de Compraventa.',
          'La Ficha Técnica y de Inventario de la Propiedad.'
        ],
        correct_option_index: 2
      }
    ]
  },
  {
    id: 'exam-seed-2',
    company_id: 'demo-company',
    title: 'Políticas de Visitas Inmobiliarias',
    description: 'Evaluación obligatoria para agentes sobre el protocolo formal de visitas con clientes, registro de geolocalización y reporte de feedback.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: 'demo-id',
    questions: [
      {
        id: 'q-s2-1',
        exam_id: 'exam-seed-2',
        question_text: '¿Qué acción es mandatoria al arribar físicamente a un inmueble asignado para una visita de clientes?',
        options: [
          'Esperar afuera y llamar al cliente por teléfono.',
          'Registrar el ingreso mediante el botón "Check-in GPS" en la aplicación móvil.',
          'Enviar un mensaje de texto al Broker informando del arribo.',
          'Tomar una fotografía del frontis de la propiedad.'
        ],
        correct_option_index: 1
      },
      {
        id: 'q-s2-2',
        exam_id: 'exam-seed-2',
        question_text: '¿Cuál es el plazo reglamentario ideal para registrar las notas de feedback y el nivel de interés en el reporte de visita?',
        options: [
          'Dentro de las 24 horas siguientes de concluida la visita.',
          'Al final de la semana de labores.',
          'No existe un límite de tiempo, ya que es un reporte opcional.',
          'Justo antes de iniciar la siguiente visita con un cliente diferente.'
        ],
        correct_option_index: 0
      },
      {
        id: 'q-s2-3',
        exam_id: 'exam-seed-2',
        question_text: 'En caso de que la localización GPS presente fallos persistentes en el check-in, ¿cuál es el proceder correcto?',
        options: [
          'Reprogramar la visita para otro día.',
          'Continuar con la visita sin reportar ni registrar el check-in.',
          'Completar el registro utilizando la opción de "Check-in Manual" para guardar la hora del sistema.',
          'Solicitar al cliente que comparta su ubicación en tiempo real en la app.'
        ],
        correct_option_index: 2
      }
    ]
  }
];

const SEED_ATTEMPTS: ExamAttempt[] = [
  {
    id: 'att-seed-1',
    exam_id: 'exam-seed-1',
    profile_id: 'worker-1',
    score: 100,
    total_questions: 3,
    correct_answers: 3,
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    exam_title: 'Técnicas de Cierre de Ventas',
    agent_name: 'Carlos Mendoza',
    agent_email: 'carlos@demo.com'
  },
  {
    id: 'att-seed-2',
    exam_id: 'exam-seed-1',
    profile_id: 'worker-2',
    score: 66.67,
    total_questions: 3,
    correct_answers: 2,
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    exam_title: 'Técnicas de Cierre de Ventas',
    agent_name: 'Ana García',
    agent_email: 'ana@demo.com'
  },
  {
    id: 'att-seed-3',
    exam_id: 'exam-seed-2',
    profile_id: 'worker-3',
    score: 100,
    total_questions: 3,
    correct_answers: 3,
    completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    exam_title: 'Políticas de Visitas Inmobiliarias',
    agent_name: 'Roberto Smith',
    agent_email: 'roberto@demo.com'
  }
];

export const useExams = () => {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const isDemo = !supabase.auth.getSession() || localStorage.getItem('demo_user');

  // Inicializar Datos Semilla si no existen en LocalStorage
  useEffect(() => {
    if (!localStorage.getItem('exams_store')) {
      localStorage.setItem('exams_store', JSON.stringify(SEED_EXAMS));
    }
    if (!localStorage.getItem('attempts_store')) {
      localStorage.setItem('attempts_store', JSON.stringify(SEED_ATTEMPTS));
    }
  }, []);

  // Fetching de datos
  useEffect(() => {
    if (!profile) return;
    fetchExamsAndAttempts();
  }, [profile]);

  const fetchExamsAndAttempts = async () => {
    if (!profile) return;
    setLoading(true);
    if (isDemo) {
      // Cargar desde LocalStorage
      const localExams = JSON.parse(localStorage.getItem('exams_store') || '[]');
      const localAttempts = JSON.parse(localStorage.getItem('attempts_store') || '[]');
      
      // Filtrar por la empresa del usuario
      const userCompanyId = profile?.company_id || 'demo-company';
      const filteredExams = localExams.filter((e: Exam) => e.company_id === userCompanyId);
      
      // Mapear intentos con nombres de agentes en demo
      const agents = [
        { id: 'worker-1', full_name: 'Carlos Mendoza', email: 'carlos@demo.com' },
        { id: 'worker-2', full_name: 'Ana García', email: 'ana@demo.com' },
        { id: 'worker-3', full_name: 'Roberto Smith', email: 'roberto@demo.com' },
        { id: 'demo-id', full_name: profile?.full_name || 'Mi Perfil', email: profile?.email || 'mi@correo.com' }
      ];

      const mappedAttempts = localAttempts.map((att: any) => {
        const matchingExam = localExams.find((e: Exam) => e.id === att.exam_id);
        const matchingAgent = agents.find(a => a.id === att.profile_id);
        return {
          ...att,
          exam_title: matchingExam?.title || 'Examen Eliminado',
          agent_name: matchingAgent?.full_name || 'Agente Demo',
          agent_email: matchingAgent?.email || 'demo@correo.com'
        };
      });

      // Si el rol es Asesor (worker), solo ver sus propios intentos
      if (profile?.role === 'asesor') {
        const myAttempts = mappedAttempts.filter((a: ExamAttempt) => a.profile_id === profile.id);
        setAttempts(myAttempts);
      } else {
        setAttempts(mappedAttempts);
      }

      setExams(filteredExams);
      setLoading(false);
      return;
    }

    // --- INTEGRACIÓN REAL CON SUPABASE ---
    try {
      // 1. Obtener exámenes de la empresa
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*, questions:exam_questions(*)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      setExams(examsData || []);

      // 2. Obtener intentos según el rol
      let query = supabase
        .from('exam_attempts')
        .select('*, exam:exams(title), profile:profiles(full_name, email)');

      if (profile.role === 'asesor') {
        query = query.eq('profile_id', profile.id);
      } else {
        // Para brokers/gerentes, filtrar por perfiles de su misma empresa
        const { data: profilesInCompany } = await supabase
          .from('profiles')
          .select('id')
          .eq('company_id', profile.company_id);
        
        const profileIds = (profilesInCompany || []).map(p => p.id);
        query = query.in('profile_id', profileIds);
      }

      const { data: attemptsData, error: attemptsError } = await query;
      if (attemptsError) throw attemptsError;

      const formattedAttempts = (attemptsData || []).map((att: any) => ({
        id: att.id,
        exam_id: att.exam_id,
        profile_id: att.profile_id,
        score: parseFloat(att.score),
        total_questions: att.total_questions,
        correct_answers: att.correct_answers,
        completed_at: att.completed_at,
        exam_title: att.exam?.title,
        agent_name: att.profile?.full_name,
        agent_email: att.profile?.email
      }));

      setAttempts(formattedAttempts);
    } catch (err) {
      console.error('Error fetching exams/attempts from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. CREAR EXAMEN
  const createExam = async (
    examData: Omit<Exam, 'id' | 'company_id' | 'created_at'>, 
    questions: Omit<ExamQuestion, 'id' | 'exam_id'>[]
  ) => {
    if (!profile) throw new Error('No user profile found');
    const examId = crypto.randomUUID();
    const companyId = profile?.company_id || 'demo-company';
    const createdAt = new Date().toISOString();

    const questionsWithIds: ExamQuestion[] = questions.map((q, idx) => ({
      ...q,
      id: `q-${examId}-${idx}`,
      exam_id: examId
    }));

    const newExam: Exam = {
      ...examData,
      id: examId,
      company_id: companyId,
      created_at: createdAt,
      created_by: profile?.id,
      questions: questionsWithIds
    };

    if (isDemo) {
      const localExams = JSON.parse(localStorage.getItem('exams_store') || '[]');
      const updated = [newExam, ...localExams];
      localStorage.setItem('exams_store', JSON.stringify(updated));
      setExams([newExam, ...exams]);
      return newExam;
    }

    try {
      // Insertar Cabecera
      const { error: examErr } = await supabase.from('exams').insert([{
        id: examId,
        company_id: companyId,
        title: examData.title,
        description: examData.description,
        created_by: profile.id
      }]);
      if (examErr) throw examErr;

      // Insertar Preguntas
      const questionsToInsert = questions.map(q => ({
        exam_id: examId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index
      }));

      const { error: qErr } = await supabase.from('exam_questions').insert(questionsToInsert);
      if (qErr) throw qErr;

      await fetchExamsAndAttempts();
      return newExam;
    } catch (err) {
      console.error('Error creating exam:', err);
      throw err;
    }
  };

  // 2. MODIFICAR EXAMEN
  const updateExam = async (
    examId: string,
    examData: Partial<Exam>,
    questions: Omit<ExamQuestion, 'id' | 'exam_id'>[]
  ) => {
    const questionsWithIds: ExamQuestion[] = questions.map((q, idx) => ({
      ...q,
      id: `q-${examId}-${idx}-${Date.now()}`,
      exam_id: examId
    }));

    if (isDemo) {
      const localExams = JSON.parse(localStorage.getItem('exams_store') || '[]');
      const updated = localExams.map((e: Exam) => {
        if (e.id === examId) {
          return {
            ...e,
            ...examData,
            questions: questionsWithIds
          };
        }
        return e;
      });
      localStorage.setItem('exams_store', JSON.stringify(updated));
      setExams(exams.map(e => e.id === examId ? { ...e, ...examData, questions: questionsWithIds } : e));
      return;
    }

    try {
      // Actualizar Cabecera
      const { error: examErr } = await supabase
        .from('exams')
        .update({
          title: examData.title,
          description: examData.description
        })
        .eq('id', examId);
      
      if (examErr) throw examErr;

      // Reemplazar Preguntas: Eliminar viejas e insertar nuevas
      const { error: delErr } = await supabase.from('exam_questions').delete().eq('exam_id', examId);
      if (delErr) throw delErr;

      const questionsToInsert = questions.map(q => ({
        exam_id: examId,
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index
      }));

      const { error: insErr } = await supabase.from('exam_questions').insert(questionsToInsert);
      if (insErr) throw insErr;

      await fetchExamsAndAttempts();
    } catch (err) {
      console.error('Error updating exam:', err);
      throw err;
    }
  };

  // 3. ELIMINAR EXAMEN
  const deleteExam = async (examId: string) => {
    if (isDemo) {
      const localExams = JSON.parse(localStorage.getItem('exams_store') || '[]');
      const updated = localExams.filter((e: Exam) => e.id !== examId);
      localStorage.setItem('exams_store', JSON.stringify(updated));
      setExams(exams.filter(e => e.id !== examId));
      return;
    }

    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      setExams(exams.filter(e => e.id !== examId));
    } catch (err) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  };

  // 4. SUBMIT/COMPLETAR EXAMEN
  const submitAttempt = async (
    examId: string, 
    correct_answers: number, 
    total_questions: number
  ) => {
    const score = parseFloat(((correct_answers / total_questions) * 100).toFixed(2));
    const profileId = profile?.id || 'demo-id';
    const completed_at = new Date().toISOString();

    const newAttempt: ExamAttempt = {
      id: crypto.randomUUID(),
      exam_id: examId,
      profile_id: profileId,
      score,
      total_questions,
      correct_answers,
      completed_at
    };

    if (isDemo) {
      const localAttempts = JSON.parse(localStorage.getItem('attempts_store') || '[]');
      const updated = [...localAttempts, newAttempt];
      localStorage.setItem('attempts_store', JSON.stringify(updated));
      
      const matchingExam = exams.find(e => e.id === examId);
      const mapped: ExamAttempt = {
        ...newAttempt,
        exam_title: matchingExam?.title || 'Examen',
        agent_name: profile?.full_name || 'Agente Demo',
        agent_email: profile?.email || 'demo@correo.com'
      };

      setAttempts([mapped, ...attempts]);
      return mapped;
    }

    try {
      const { error } = await supabase.from('exam_attempts').insert([{
        exam_id: examId,
        profile_id: profileId,
        score,
        total_questions,
        correct_answers
      }]);
      if (error) throw error;
      await fetchExamsAndAttempts();
      return newAttempt;
    } catch (err) {
      console.error('Error submitting exam attempt:', err);
      throw err;
    }
  };

  return {
    exams,
    attempts,
    loading,
    createExam,
    updateExam,
    deleteExam,
    submitAttempt,
    refresh: fetchExamsAndAttempts
  };
};
