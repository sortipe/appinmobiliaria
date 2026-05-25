-- MIGRACIÓN PARA EL SISTEMA DE EXÁMENES (Multi-empresa + RLS)
-- Ejecuta este script en el SQL Editor de Supabase para habilitar las tablas reales

-- 1. Tabla de Exámenes (Cabecera)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Tabla de Preguntas
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL, -- Arreglo de opciones (ej. ['Opción A', 'Opción B'])
  correct_option_index INT NOT NULL, -- Índice (0, 1, 2...) de la respuesta correcta
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Tabla de Intentos/Resultados de Exámenes
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC NOT NULL, -- Puntaje obtenido (porcentaje, ej: 80.00)
  total_questions INT NOT NULL, -- Cantidad de preguntas
  correct_answers INT NOT NULL, -- Cantidad de aciertos
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Habilitar Seguridad de Nivel de Fila (RLS)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acceso (RLS)

-- 5.1 Políticas para EXAMS
CREATE POLICY "Acceso a exámenes de la empresa" ON public.exams 
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 5.2 Políticas para EXAM_QUESTIONS
CREATE POLICY "Acceso a preguntas de exámenes de la empresa" ON public.exam_questions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = exam_questions.exam_id 
      AND (
        exams.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
      )
    )
  );

-- 5.3 Políticas para EXAM_ATTEMPTS
CREATE POLICY "Acceso a intentos de examen de la empresa" ON public.exam_attempts 
  FOR ALL USING (
    profile_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'gerente', 'broker')
      AND profiles.company_id = (
        SELECT company_id FROM public.profiles WHERE id = exam_attempts.profile_id
      )
    )
  );
