-- MIGRACIÓN PARA EXTENDER LA TABLA DE PROPIEDADES
-- Ejecuta este script en el SQL Editor de Supabase para agregar los nuevos campos

ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS property_id TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Casa',
  ADD COLUMN IF NOT EXISTS operation TEXT DEFAULT 'Venta',
  ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS area_total NUMERIC,
  ADD COLUMN IF NOT EXISTS area_built NUMERIC,
  ADD COLUMN IF NOT EXISTS bedrooms INT,
  ADD COLUMN IF NOT EXISTS bathrooms INT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT -12.046186,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT -77.042751,
  ADD COLUMN IF NOT EXISTS featured_image TEXT,
  ADD COLUMN IF NOT EXISTS documents TEXT[];

-- Comentario para verificar que la migración se ejecutó correctamente
COMMENT ON COLUMN public.properties.property_id IS 'Identificador único personalizado de la propiedad';
