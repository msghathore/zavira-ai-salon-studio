-- Supabase Schema for Zavira AI Salon Studio
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Elements table
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Use TEXT for anonymous users too
  category TEXT NOT NULL CHECK (category IN ('hair', 'nail', 'tattoo')),
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT DEFAULT 'no watermark, no text, no logo, blur, low quality',
  photo_urls TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generations table
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  element_name TEXT NOT NULL,
  grid_url TEXT NOT NULL,
  cells JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Create policies for elements
CREATE POLICY "Users can view their own elements" ON elements
  FOR SELECT USING (user_id = (SELECT COALESCE(auth.uid()::TEXT, current_setting('request.jwt.claims', true)::json->>'anon_id', 'anon-' || current_setting('pg_catalog.current_user', true)))));

CREATE POLICY "Users can insert their own elements" ON elements
  FOR INSERT WITH CHECK (true);  -- Allow for anonymous users

CREATE POLICY "Users can update their own elements" ON elements
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own elements" ON elements
  FOR DELETE USING (true);

-- Create policies for generations
CREATE POLICY "Users can view their own generations" ON generations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own generations" ON generations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own generations" ON generations
  FOR DELETE USING (true);

-- Storage bucket for element photos
INSERT INTO storage.buckets (id, name, public) VALUES ('element-photos', 'element-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public access to element photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'element-photos');

CREATE POLICY "Users can upload element photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'element-photos');

CREATE POLICY "Users can delete element photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'element-photos');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX idx_elements_user_id ON elements(user_id);
CREATE INDEX idx_elements_category ON elements(category);
CREATE INDEX idx_elements_active ON elements(is_active);
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
