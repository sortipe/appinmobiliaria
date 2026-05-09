-- Supabase Schema for AppInmobiliaria

-- 1. Profiles (User Roles)
CREATE TYPE user_role AS ENUM ('admin', 'worker');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'worker' NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Properties
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- 3. Visits
CREATE TABLE visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_dni TEXT NOT NULL,
  client_phone TEXT,
  client_type TEXT CHECK (client_type IN ('Independiente', 'Dependiente')),
  payment_method TEXT CHECK (payment_method IN ('Contado', 'Crédito')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('Pendiente', 'Completada', 'Cancelada')) DEFAULT 'Pendiente' NOT NULL,
  
  -- Check-in Data
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

-- 4. Binnacle (Daily logs)
CREATE TABLE binnacle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  log_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE binnacle ENABLE ROW LEVEL SECURITY;

-- Policies
-- Profiles: Users can read their own profile, admins can read all.
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Properties: Everyone can view, only admins can modify.
CREATE POLICY "Everyone can view properties" ON properties FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage properties" ON properties ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Visits: Workers see their own, admins see all.
CREATE POLICY "Workers can view/update their visits" ON visits FOR ALL USING (worker_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Binnacle: Workers manage their own, admins see all.
CREATE POLICY "Workers manage their binnacle" ON binnacle FOR ALL USING (worker_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'worker'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
