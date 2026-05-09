-- Updated Migration for Multi-Company and 5 Roles

-- 1. Extend user roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'broker';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'asesor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Companies Table
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Profiles for Multi-tenancy
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 4. Permissions Table
CREATE TABLE user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL, -- e.g., 'properties', 'visits', 'reports'
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(profile_id, module)
);

-- 5. Add company_id to existing data tables
ALTER TABLE properties ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE binnacle ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 6. Updated RLS Policies

-- Companies: Super Admin see all, Gerente sees own
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can manage all companies" ON companies ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Gerente can see their own company" ON companies FOR SELECT USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Properties: Scoped by company
DROP POLICY IF EXISTS "Everyone can view properties" ON properties;
CREATE POLICY "Users can view properties of their company" ON properties FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Admin/Gerente/Permitted can manage properties" ON properties ALL USING (
  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) AND 
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('gerente')) OR
     EXISTS (SELECT 1 FROM user_permissions WHERE profile_id = auth.uid() AND module = 'properties' AND can_edit = TRUE)
    )
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 7. Sync Profile trigger update (ensure company_id can be passed in metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'asesor'),
    (new.raw_user_meta_data->>'company_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
