# Zavira AI Salon Studio - Budget-Friendly Unified App

## Quick Start

### 1. Install Dependencies
```bash
cd zavira-ai-salon-studio
npm install
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env.local`:

**Required:**
- `LAOZHANG_API_KEY` - Your Lao Zhang API key (Nano Banana Pro)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

**Optional (for posting):**
- `MAKECOM_API_KEY` - Your Make.com API key
- `ZAPIER_API_KEY` - Your Zapier API key

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

---

## Features

### ✨ Combined App (Image Gen + Social Posting)
- Add salon photos (drag & drop)
- Generate AI images with equipment references
- 4x4 grid generation (16 images, $0.80 per grid)
- Film stock options in prompts (Kodak Gold, B&W, Cinematic)
- Smart budget tracking (target: $10.15/month)
- Human review before posting
- Trending music (manual 5 min/day - free)
- Trending hashtags (manual 5 min/day - free)
- Auto-post to all platforms via Make.com/Zapier/Pabbly

### 💰 Budget Optimization
- Smart generation: Reuse prompts, generate 10 images/day (not 30)
- Free posting tiers: Make.com 1000 ops/month (enough for 15 posts/day)
- Manual trending: No API costs for music/hashtags
- Target budget: ~$10-15/month (down from $75)

---

## File Structure

```
zavira-ai-salon-studio/
├── salon-photos/          ← Drag salon photos here
├── generated-content/         ← AI images saved here
├── scheduled-posts/          ← Ready for review
├── src/
│   ├── components/
│   │   ├── UnifiedApp.tsx              ← Main combined app
│   │   ├── PhotoUploader.tsx           ← Quick photo upload
│   │   ├── GridGenerator.tsx           ← 4x4 AI generation
│   │   ├── BudgetTracker.tsx            ← Cost monitoring
│   │   ├── ReviewPanel.tsx              ← Human review
│   │   ├── TrendingPanel.tsx            ← Music + hashtags
│   │   └── AutoPoster.tsx              ← Make.com/Zapier hooks
│   ├── lib/
│   │   ├── laozhang.ts                 ← Lao Zhang API (Nano Banana Pro)
│   │   ├── cost-optimizer.ts           ← Smart generation
│   │   ├── caption-templates.ts        ← Dynamic captions
│   │   └── post-integration.ts         ← Make.com/Zapier
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── README.md (this file)
│   └── start.bat                      ← One-click setup
```

---

## Workflow

### Daily Routine (10 minutes):

**Step 1: Add Photos (30 seconds)**
- Click [Add Salon Photos]
- Drag drop or browse folder
- Auto-categorizes: Hair, Nail, Tattoo, Spa, Ambiance

**Step 2: Generate Content (5 minutes)**
- Click [Generate Grid]
- Select category (Hair/Nail/etc)
- System generates 4x4 grid with film stock
- Cost: $0.80 per grid generation

**Step 3: Review & Add Trending (5 minutes)**
- Click 1-4 best images
- Caption auto-filled from metadata
- Add trending music link (from 5 min TikTok check)
- Add trending hashtags (from 5 min research)

**Step 4: Post (2 minutes)**
- Click [Post to All Platforms]
- Make.com/Zapier posts to Instagram, TikTok, Facebook
- Staggered: 7 min between platforms
- Done!

**Total time: ~12 minutes**
**Daily images: 10 posts/day = 10 images**
**Daily posts: 10 posts × 3 platforms = 30 posts**
**Monthly budget: ~$10-15**

---

## Budget Breakdown

| Item | Monthly Cost |
|-------|--------------|
| Lao Zhang API (10 images/day) | $5.00 |
| Make.com Free Tier | $0.00 |
| Supabase Storage | $0.00 |
| Trending Music (Manual) | $0.00 |
| Trending Hashtags (Manual) | $0.00 |
| **TOTAL** | **~$10.15** |

---

## Getting Started

1. Copy `.env.example` to `.env.local`
2. Fill in your API keys
3. Run `npm run dev`
4. Open http://localhost:3000
5. Follow the daily workflow above

---

## Notes

- **No multiple accounts needed** - Use your existing Make.com/Zapier/Pabbly tokens
- **Budget tracking** - See real-time costs in the app
- **Smart generation** - System optimizes to reduce API calls
- **Manual trending** - 5 minutes/day to check TikTok and research hashtags
- **Real salon equipment** - Photos used as references in prompts
- **Film stock in prompt** - Kodak Gold, B&W, Cinematic options

---

Built with: React 18, TypeScript, Vite, Tailwind CSS, Supabase, Lao Zhang API
