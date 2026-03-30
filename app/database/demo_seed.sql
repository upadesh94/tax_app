-- Demo seed data for Estate Tax Collection
-- Run this in Supabase SQL Editor after schema.sql

-- Demo user id (fixed for repeatable inserts)
-- You can change this UUID if needed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
    INSERT INTO public.users (id, name, email, phone, role)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'Demo Citizen',
      'demo.citizen@example.com',
      '9999999999',
      'citizen'
    );
  END IF;
END $$;

-- Ensure at least one tax rate exists
INSERT INTO public.tax_rates (property_type, rate_percentage, area_rate, effective_from)
SELECT 'residential', 1.00, 10.00, CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.tax_rates WHERE property_type = 'residential'
);

-- Insert demo property
INSERT INTO public.properties (
  id,
  owner_id,
  property_number,
  location,
  address,
  property_type,
  property_value,
  area,
  tax_status
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'PROP-DEMO-001',
  'Pune',
  'Baner Road, Pune, Maharashtra',
  'residential',
  6500000.00,
  1250.00,
  'pending'
)
ON CONFLICT (property_number) DO NOTHING;

-- Insert demo tax row
INSERT INTO public.taxes (
  id,
  property_id,
  tax_year,
  base_tax,
  area_tax,
  penalty,
  total_amount,
  due_date,
  status
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  26000.00,
  2400.00,
  0.00,
  28400.00,
  CURRENT_DATE + INTERVAL '20 days',
  'pending'
)
ON CONFLICT (property_id, tax_year) DO NOTHING;

-- Insert demo payment row
INSERT INTO public.payments (
  id,
  tax_id,
  user_id,
  amount,
  payment_method,
  transaction_id,
  status
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  28400.00,
  'upi',
  'TXN-DEMO-001',
  'completed'
)
ON CONFLICT (transaction_id) DO NOTHING;
