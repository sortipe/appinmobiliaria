-- ESQUEMA COMPLETO PARA APPINMOBILIARIA (Multi-empresa + 5 Roles)
-- Copia y pega esto en el SQL Editor de Supabase y dale a "Run"

-- 0. Limpieza (Opcional, ten cuidado si ya tienes datos)
-- DROP TABLE IF EXISTS user_permissions;
-- DROP TABLE IF EXISTS visits;
-- DROP TABLE IF EXISTS properties;
-- DROP TABLE IF EXISTS binnacle;
-- DROP TABLE IF EXISTS profiles;
-- DROP TABLE IF EXISTS companies;
-- DROP TYPE IF EXISTS user_role;

-- 1. Tipos de Usuario
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'gerente', 'broker', 'asesor', 'cliente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Empresas (Multi-tenancy)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Perfiles de Usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'asesor' NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Propiedades
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT CHECK (status IN ('Disponible', 'Vendida')) DEFAULT 'Disponible' NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Visitas
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_dni TEXT NOT NULL,
  client_phone TEXT,
  client_type TEXT CHECK (client_type IN ('Independiente', 'Dependiente')),
  payment_method TEXT CHECK (payment_method IN ('Contado', 'Crédito')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('Pendiente', 'Completada', 'Cancelada')) DEFAULT 'Pendiente' NOT NULL,
  
  -- Datos de Check-in
  check_in_at TIMESTAMPTZ,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  check_in_manual BOOLEAN DEFAULT FALSE,
  
  -- Feedback
  interest_level TEXT CHECK (interest_level IN ('Bajo', 'Medio', 'Alto')),
  feedback_notes TEXT,
  evidence_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bitácora (Logs diarios)
CREATE TABLE IF NOT EXISTS binnacle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Permisos Detallados
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL, -- 'properties', 'visits', 'reports', 'users'
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(profile_id, module)
);

-- 8. Seguridad de Nivel de Fila (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE binnacle ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- 9. Políticas (Simplificadas para multi-empresa)

-- Companies: Super Admin todo, Gerente su propia empresa
CREATE POLICY "Super admin manages all companies" ON companies FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Users can see their own company" ON companies FOR SELECT USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Profiles: Cada uno ve el suyo, Gerentes ven los de su empresa, Super Admin todo
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Gerente views company profiles" ON profiles FOR SELECT USING (company_id = (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gerente'));
CREATE POLICY "Super admin views all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Properties/Visits/Binnacle: Filtrado por company_id
CREATE POLICY "Company data access" ON properties FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Company visits access" ON visits FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Company binnacle access" ON binnacle FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- User Permissions: Super Admin todo, Gerente su empresa
CREATE POLICY "Super admin manages permissions" ON user_permissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Gerente manages company permissions" ON user_permissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gerente' AND company_id = (SELECT company_id FROM profiles WHERE id = user_permissions.profile_id)));

-- 10. Función y Trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'), 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'asesor'),
    (new.raw_user_meta_data->>'company_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. Datos Iniciales (Opcional)
-- INSERT INTO companies (name) VALUES ('Mi Primera Inmobiliaria');
