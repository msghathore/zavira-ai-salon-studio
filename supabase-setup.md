# Supabase Setup Script

## 1. Create Storage Bucket
1. Go to supabase.com → Your project
2. Storage → New bucket
3. Name: `element-photos`
4. Check "Make bucket public"
5. Save

## 2. Add Storage Policies
Click on `element-photos` bucket → Policies → Add these:

### Policy 1 (Public Read)
- Name: `public_read`
- Operations: `SELECT`
- Condition: `bucket_id = 'element-photos'`

### Policy 2 (Authenticated Upload)
- Name: `auth_upload`
- Operations: `INSERT`
- Condition: `bucket_id = 'element-photos' AND auth.role() = 'authenticated'`

## 3. Create Database Table
Go to SQL Editor and run:

```sql
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT,
  negative_prompt TEXT,
  photo_urls TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own elements"
  ON elements FOR ALL
  USING (auth.uid()::TEXT = user_id);
```

## 4. Test
1. Reload your app
2. Try adding a photo
3. Check console for "Uploaded URL: [url]"

Done!