# Zavira AI Salon Studio - Deployment Guide

## ✅ What's Been Done

### Backend (Supabase)
1. **Supabase Schema** - `supabase/schema.sql`
   - Elements table (stores your Hair/Nail/Tattoo elements)
   - Generations table (stores all generated images)
   - Storage bucket for element photos
   - RLS policies for data security

### Frontend (Updated)
1. **Supabase Integration** - `src/lib/supabase.ts`
   - Elements CRUD operations
   - Generations CRUD operations  
   - Photo upload/download
   - Anonymous user support (works without login)
   - LocalStorage fallback (works offline)

2. **App Updated** - `src/App.tsx`
   - Uses Supabase for data storage
   - Syncs with localStorage as backup
   - Works on phone + desktop

### Deployment Ready
- `vercel.json` - Vercel deployment config
- `.env.example` - Environment variables template

---

## 🚀 Deploy to Vercel

### Step 1: Push to GitHub
```bash
cd "C:\Users\Ghath\OneDrive\Desktop\zavira-ai-salon-studio"
git add .
git commit -m "Add Supabase backend and mobile support"
git push
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### Step 3: Setup Supabase
1. Go to https://supabase.com
2. Create new project "zavira-ai-salon"
3. Run `supabase/schema.sql` in SQL Editor
4. Copy URL and anon key to Vercel

---

## 📱 Use on Phone

### Option 1: Vercel URL
```
https://zavira-ai-salon-studio.vercel.app
```

### Option 2: Custom Domain
Point your domain to Vercel deployment

---

## 🔧 Environment Variables

Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📁 Files Modified

```
src/
├── App.tsx              # Main app with Supabase integration
├── lib/
│   ├── laozhang.ts      # Nano Banana Pro API
│   └── supabase.ts      # Supabase client + helpers
└── data/
    └── categories.ts    # Categories (Hair, Nail, Tattoo)

supabase/
└── schema.sql           # Database schema

vercel.json              # Vercel config
.env.example             # Environment template
```

---

## 🔄 How Data Sync Works

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Save to localStorage (always works, offline too)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. If Supabase configured, sync to cloud                   │
│     → Elements saved                                         │
│     → Generations saved                                      │
│     → Photos uploaded to storage                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  On another device:                                          │
│  1. Load from Supabase (cloud first)                         │
│  2. Fallback to localStorage if offline                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Usage on Phone

1. **Open Vercel URL on phone**
2. **Elements Tab**: Create Hair/Nail/Tattoo elements with photos
3. **Generate Tab**: Select element → Generate grid → Select cells
4. **Post Tab**: Download images, copy captions, post to TikTok/Instagram
5. **Make.com Integration**: Setup webhook for auto-posting

---

## 📦 Photo Storage

**Before (localStorage only):**
- Only worked on same device
- ~5MB limit
- Lost when cache cleared

**After (Supabase):**
- Works on any device (phone + desktop)
- Unlimited storage
- Persistent forever
- Fast CDN delivery
