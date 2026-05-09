import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type UserRole = 'super_admin' | 'gerente' | 'broker' | 'asesor' | 'cliente';

export type Company = {
  id: string;
  name: string;
  logo_url?: string;
  phone?: string;
  address?: string;
  email?: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_id?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  company?: Company;
};

export type UserPermission = {
  id: string;
  profile_id: string;
  module: 'properties' | 'visits' | 'reports' | 'users';
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type Property = {
  id: string;
  company_id: string;
  name: string;
  address: string;
  price: number;
  currency: string;
  status: 'Disponible' | 'Vendida';
  description: string;
  images: string[];
  created_at: string;
};

export type Visit = {
  id: string;
  company_id: string;
  property_id: string;
  worker_id: string;
  client_name: string;
  client_dni: string;
  client_phone: string;
  client_type: 'Independiente' | 'Dependiente';
  payment_method: 'Contado' | 'Crédito';
  scheduled_at: string;
  status: 'Pendiente' | 'Completada' | 'Cancelada';
  check_in_at?: string;
  check_in_lat?: number;
  check_in_lng?: number;
  check_in_manual?: boolean;
  interest_level?: 'Bajo' | 'Medio' | 'Alto';
  feedback_notes?: string;
  evidence_url?: string;
  property?: Property;
  worker?: Profile;
};
