-- Elements table
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  element_name TEXT NOT NULL,
  grid_url TEXT NOT NULL,
  cells JSONB DEFAULT '[]',
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posted content table
CREATE TABLE IF NOT EXISTS posted_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  cell_letter TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  music_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  platform TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posted_content ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_elements_user_id ON elements(user_id);
CREATE INDEX IF NOT EXISTS idx_elements_category ON elements(category);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posted_content_user_id ON posted_content(user_id);
CREATE INDEX IF NOT EXISTS idx_posted_content_status ON posted_content(status);

-- RLS Policies (allow anonymous access with user_id tracking)
CREATE POLICY "Allow anonymous access to elements" ON elements
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to generations" ON generations
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to posted_content" ON posted_content
  FOR ALL USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS elements_updated_at ON elements;
CREATE TRIGGER elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
