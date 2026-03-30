-- Estate Tax Collection System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_number TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  property_type TEXT DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'industrial')),
  property_value DECIMAL(15, 2) NOT NULL,
  area DECIMAL(10, 2) NOT NULL, -- in square feet
  tax_status TEXT DEFAULT 'pending' CHECK (tax_status IN ('paid', 'pending', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Taxes table
CREATE TABLE IF NOT EXISTS public.taxes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  base_tax DECIMAL(15, 2) NOT NULL,
  area_tax DECIMAL(15, 2) NOT NULL,
  penalty DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, tax_year)
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tax_id UUID REFERENCES public.taxes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet')),
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_gateway TEXT,
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax rates configuration table
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_type TEXT NOT NULL,
  rate_percentage DECIMAL(5, 2) NOT NULL,
  area_rate DECIMAL(10, 2) NOT NULL, -- per square foot
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('payment', 'reminder', 'alert', 'info')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_taxes_property ON public.taxes(property_id);
CREATE INDEX idx_taxes_status ON public.taxes(status);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_tax ON public.payments(tax_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for properties table
CREATE POLICY "Users can view own properties" ON public.properties
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies for taxes table
CREATE POLICY "Users can view taxes for own properties" ON public.taxes
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for payments table
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert default tax rates
INSERT INTO public.tax_rates (property_type, rate_percentage, area_rate, effective_from) VALUES
  ('residential', 1.00, 10.00, '2024-01-01'),
  ('commercial', 1.50, 15.00, '2024-01-01'),
  ('industrial', 2.00, 20.00, '2024-01-01');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_taxes_updated_at BEFORE UPDATE ON public.taxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
