# Zavira AI Salon Studio - Complete Guide

## 🎯 What This App Does

**Purpose:** Generate social media content for Zavira Salon using AI

**Workflow:**
1. Create **Elements** (Hair styles, Nail designs, Tattoos) with reference photos
2. Generate **4x4 grid** of variations ($0.05)
3. **Select cells** you want (any number)
4. Generate **full 4K images** (+$0.05 per cell)
5. **Post** - download, caption, copy, or auto-post via Make.com

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Elements   │  │  Generate   │  │         Post            │ │
│  │   (📦)      │  │   (✨)      │  │         (🚀)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │               │                     │                 │
│         └───────────────┼─────────────────────┘                 │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │   localStorage      │                            │
│              │   (offline backup)  │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Supabase)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Database  │  │   Storage   │  │       Auth              │ │
│  │  (PostgreSQL)│ │  (Photos)   │  │  (Anonymous users)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                                │
│  ┌─────────────────┐  ┌───────────────────────────────────────┐ │
│  │  Lao Zhang API  │  │           Make.com                   │ │
│  │  (Nano Banana)  │  │         (Auto-posting)               │ │
│  └─────────────────┘  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 How It Works on Phone

### Step 1: Create Elements
```
📦 Elements Tab
├─ Select Category (Hair/Nail/Tattoo)
├─ Click "+ Create New Element"
├─ Enter name: "Long Wavy Hair"
├─ Enter prompt: "Beautiful long wavy hair..."
├─ Upload reference photos (stored in Supabase)
└─ Save
```

### Step 2: Generate Grid
```
✨ Generate Tab
├─ Select Category
├─ Select Element (e.g., "Long Wavy Hair")
├─ Reference photos shown
└─ Click "Generate 4x4 Grid ($0.05)"
   └─ Sends prompt to Lao Zhang API
      └─ Returns 4x4 grid image
```

### Step 3: Select & Upscale
```
🖼️ Grid Display (A-P)
├─ Click cells you want (A, C, H, P...)
├─ Selected cells highlighted green
├─ Edit prompt per cell if needed
└─ Click "Generate 4 Images ($0.20)"
   └─ Each cell → 4K upscale via Lao Zhang
```

### Step 4: Post Content
```
🚀 Post Tab
├─ Select completed image
├─ Write caption
├─ Add hashtags
├─ Paste TikTok sound link
├─ Options:
│  ├─ ⬇ Download Image
│  ├─ 📋 Copy Post Text
│  └─ 🚀 Send to Make.com (auto-post)
```

---

## 💰 Cost Breakdown

| Action | Cost |
|--------|------|
| Generate 4x4 grid | $0.05 |
| Each 4K upscale | +$0.05 |
| **Example: 4 cells** | **$0.25 total** |

---

## 🗄️ Data Storage

### localStorage (on device)
- Works offline
- Backup for elements + generations
- ~5-10MB limit

### Supabase (cloud)
- Works on any device (phone + desktop)
- Unlimited storage
- Fast CDN delivery
- Persistent forever

### Data Structure
```
elements:
  - id (UUID)
  - user_id (anonymous ID)
  - category (hair/nail/tattoo)
  - name
  - prompt
  - negative_prompt
  - photo_urls (array of URLs)
  - is_active
  - created_at

generations:
  - id (UUID)
  - user_id
  - category_id
  - category_name
  - element_name
  - grid_url
  - cells (JSON with selection status)
  - total_cost
  - created_at
```

---

## 🔗 API Connections

### Lao Zhang API (Image Generation)
- Endpoint: `https://api.laozhang.ai/v1beta/models/...`
- Model: `nano-banana-pro` (Gemini-based)
- Cost: $0.05 per grid, $0.05 per 4K upscale

### Make.com (Auto-posting)
- Webhook-based integration
- Sends image URL + caption + hashtags
- Can auto-post to TikTok/Instagram

---

## 🚀 Deployment

### Vercel (Frontend)
```
GitHub → Vercel → https://zavira-ai-salon-studio.vercel.app
```

### Supabase (Backend)
```
supabase/schema.sql → PostgreSQL Database
                   → Storage Bucket (element-photos)
```

---

## 📁 File Structure

```
zavira-ai-salon-studio/
├── src/
│   ├── App.tsx              # Main app (all 4 tabs)
│   ├── main.tsx             # Entry point
│   ├── index.css            # Global styles
│   ├── data/
│   │   └── categories.ts    # Hair/Nail/Tattoo categories
│   └── lib/
│       ├── laozhang.ts      # Nano Banana Pro API
│       └── supabase.ts      # Supabase client + CRUD
├── supabase/
│   └── schema.sql           # Database tables + RLS
├── vercel.json              # Vercel config
├── .env.example             # Environment template
├── DEPLOYMENT.md            # Deployment guide
└── package.json
```

---

## 🔐 Security

### RLS Policies (Row Level Security)
- Users can only access their own data
- Anonymous users get unique ID
- No authentication required for basic use

### Storage Policies
- Public read access to photos
- Authenticated upload
- User can delete their own photos

---

## 🛠️ MCP Tools Available

The project has these MCP tools configured:

1. **Supabase MCP** - Database operations
2. **Chrome DevTools MCP** - Testing/verification
3. **ntfy.sh** - Mobile notifications

---

## ❓ Questions

**Q: Do I need to login?**
A: No! Uses anonymous user ID. Works offline with localStorage.

**Q: Where are photos stored?**
A: Supabase Storage (cloud) + localStorage backup.

**Q: Can I use on phone?**
A: Yes! Open Vercel URL on phone.

**Q: How much does it cost?**
A: $0.05 per grid + $0.05 per 4K cell.

**Q: Auto-post to TikTok?**
A: Yes! Setup Make.com webhook in Post tab.
