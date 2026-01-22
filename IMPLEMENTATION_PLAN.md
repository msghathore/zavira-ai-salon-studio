# 🔧 ZAVIRA AI SALON STUDIO - IMPLEMENTATION PLAN

**Last Updated**: 2026-01-22
**Status**: ACTIVE - Ready for implementation
**Estimated Time**: 6-8 hours

---

## 🎯 IMPLEMENTATION OVERVIEW

This plan fixes the core issue: **Grid images don't show clients in YOUR salon**.

The system already generates ONE 4x4 grid with 16 cells (correct), but the prompt is too generic and doesn't reference your salon room properly.

---

## 🚨 ROOT CAUSE

### What's Broken
File: `src/App.tsx` lines 522-530

```typescript
// CURRENT (WRONG)
const gridPrompt = `${prompt}. Close-up portrait shots, medium shots, and wide shots.
Various camera angles including eye level, high angle, low angle, and overhead.
Shot with different lenses including 35mm, 50mm, 85mm, and 100mm macro.
Kodak Portra 400, Fuji Pro 400H, and Ilford HP5 film stock.
Soft natural lighting, professional beauty photography, magazine editorial quality.`;
```

**Problems**:
1. Doesn't mention "IN your salon"
2. Doesn't describe the salon room from reference images
3. Doesn't specify "clients getting [service]"
4. Generic "portrait shots" instead of clients IN salon
5. Multiple film stocks instead of ONE consistent (Kodak Portra 400)
6. Doesn't mention natural skin imperfections

---

## ✅ IMPLEMENTATION STEPS

### PHASE 1: FIX GRID GENERATION PROMPT (CRITICAL)

#### Step 1.1: Analyze Room Images & Create Description
**File**: `src/App.tsx` - `handleGenerateGrid()` function (line 494)

**Current Code (lines 512-530)**:
```typescript
const categoryPhotos = elements
  .filter(el => el.category === selectedElement.category)
  .flatMap(el => el.photoUrls);

const shuffled = categoryPhotos.sort(() => 0.5 - Math.random());
const selectedPhotos = shuffled.slice(0, 10);

const gridPrompt = `${prompt}. Close-up portrait shots...`
```

**What to Change**:
1. Keep the photo selection (10 random) ✅
2. Before making API call, describe the room:
   ```typescript
   // After selectedPhotos are gathered:
   const roomDescription = "professional salon with [service equipment]";
   // OR better: Analyze first photo to understand room type
   ```

#### Step 1.2: Rewrite the Grid Prompt
**File**: `src/App.tsx` line 522

**NEW PROMPT** (replace entire gridPrompt):
```typescript
const gridPrompt = `
Create a 4x4 grid with 16 DIFFERENT clients actively getting ${selectedElement.name || 'salon services'}
IN a professional salon. The salon room is set up with professional ${selectedElement.category === 'hair' ? 'styling chairs' : selectedElement.category === 'nail' ? 'nail stations' : 'service stations'}.
Clients are sitting comfortably receiving the service.

RANDOMIZE EACH OF THE 16 CLIENTS:
- Skin tones: light, medium, deep (represent all ethnicities)
- Ethnicities: diverse representation (Asian, African, Latin, European, Middle Eastern, etc.)
- Ages: range from 20s to 50s
- Hair types (if hair service): straight, wavy, curly, coily, different colors and lengths
- Camera brands: vary between Canon, Nikon, Sony
- Lens types: mix of 35mm, 50mm, 85mm, 100mm macro
- Aperture values: vary f/1.8, f/2.8, f/5.6, f/8
- Camera angles: eye level, low angle, high angle, side angle
- Body positioning: different poses, different hand positions

CONSISTENT ACROSS ALL 16:
- Film stock: Kodak Portra 400 (professional salon color film)
- Lighting: Soft natural window light + professional salon lighting
- Quality: Professional magazine editorial quality
- Skin: NATURAL with texture, freckles, minor imperfections, not AI-perfect
- Background: The salon room with visible equipment, plants, mirrors, and professional setup

MOOD: Happy, professional, beautiful salon environment, clients enjoying service`;
```

#### Step 1.3: Verify Aspect Ratio
**File**: `src/App.tsx` line 528

**Current**:
```typescript
aspectRatio: '16:9',
```

**Should be**:
```typescript
aspectRatio: '21:9', // Ultra-wide for grid
```

**Also check**: `src/lib/laozhang.ts` line 38
```typescript
aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; // Add '21:9' if not present
```

---

### PHASE 2: FIX FULL IMAGE GENERATION (CRITICAL)

#### Step 2.1: Change Full Image Aspect Ratio
**File**: `src/App.tsx` line 630

**Current**:
```typescript
aspectRatio: '16:9',
```

**Change to**:
```typescript
aspectRatio: '1:1', // Square 4K for final images
```

#### Step 2.2: Match Grid Cell Exactly
**File**: `src/App.tsx` - `handleGenerateSelectedCells()` function (line 593-672)

**Problem**: Full images don't exactly match their grid cell

**Fix**:
```typescript
// Around line 625, update the prompt to reference grid:
const cellIndex = gridCells.findIndex(c => c.letter === cell.letter);
const cellPrompt = `
This is cell ${cell.letter} from a 4x4 salon grid. Generate a full 4K square image of:
${cell.prompt}

Important: This should be an EXACT, DETAILED recreation of what appears in grid cell ${cell.letter},
but as a full square (1:1) image showing the client from chest/waist up getting the service.
Same person, same salon, same lighting, same angle. Just fill the entire 4K square with this client's image.

Use the exact same approach:
- Film: Kodak Portra 400
- Natural skin with texture and imperfections
- Professional salon setting visible in background
- Client actively receiving service`;
```

---

### PHASE 3: ADD AI CAPTIONS (HIGH PRIORITY)

#### Step 3.1: Create Caption Generation Function
**File**: Create `src/lib/captionGenerator.ts` (NEW FILE)

```typescript
import { createLaoZhangClient } from './laozhang';

export async function generateCaption(
  imageUrl: string,
  laozhangApiKey: string,
  serviceType: string // 'hair', 'nail', 'tattoo', 'massage', 'facial'
): Promise<string> {
  const client = createLaoZhangClient(laozhangApiKey);

  // Use Gemini to analyze the image and generate caption
  const prompt = `You are a creative salon social media expert.
Analyze this image and write a SHORT, CREATIVE caption (1-2 sentences max)
for a salon Instagram/TikTok post about the ${serviceType} service shown.

Style: Professional but trendy, like high-end salons (Vogue, Harper's Bazaar style).
Include relevant emojis. Be specific about what you see (color, style, technique).

Examples for hair:
- "Dimensional balayage with soft waves - total transformation ✨"
- "Dimensional blonde with textured layers - giving luxury salon vibes 💫"

Examples for nails:
- "Matte black with rose gold accents - elegance redefined 💅"
- "Gradient ombre nails with gem details - custom luxury 💎"

Examples for tattoo:
- "Geometric linework design - custom artwork by our artist 🖤"

Write ONLY the caption, nothing else. Be specific and creative.`;

  // Note: Implement actual Gemini call here
  // For now, this is the structure
  return "Generated caption would go here";
}
```

#### Step 3.2: Call Caption Generator When Full Image Generated
**File**: `src/App.tsx` - `handleGenerateSelectedCells()` (line 645-651)

**After image is generated, add**:
```typescript
// Around line 650, after result.url is obtained
let caption = '';
try {
  caption = await generateCaption(
    result.url,
    LAOZHANG_API_KEY,
    selectedElement.category
  );
} catch (err) {
  console.error('Caption generation error:', err);
  caption = `Beautiful ${selectedElement.category} service at Zavira Salon ✨`;
}

// Store caption with the cell
setGridCells(prev => prev.map(c =>
  c.letter === cell.letter ? {
    ...c,
    status: 'completed' as const,
    resultUrl: result.url,
    caption: caption // NEW
  } : c
));
```

#### Step 3.3: Update GridCell Type
**File**: `src/App.tsx` lines 33-40

**Add caption field**:
```typescript
interface GridCell {
  letter: string;
  index: number;
  isSelected: boolean;
  prompt: string;
  resultUrl?: string;
  caption?: string; // NEW FIELD
  status: 'pending' | 'generating' | 'completed' | 'failed';
}
```

---

### PHASE 4: SETUP MAKE.COM WEBHOOK (MEDIUM PRIORITY)

#### Step 4.1: Create Make.com Scenario
**Manual Setup** (not code):

1. Go to make.com
2. Create new scenario with webhook trigger
3. Webhook URL: `https://hook.make.com/yourwebhookid`
4. Webhook accepts JSON with:
   ```json
   {
     "imageUrl": "...",
     "caption": "...",
     "hashtags": ["#tag1", "#tag2"],
     "musicUrl": "...",
     "platform": "instagram|tiktok|facebook"
   }
   ```

#### Step 4.2: Complete Webhook Implementation
**File**: `src/App.tsx` - `handlePost()` function (line 271-325)

**Current Code (line 310-323)**:
```typescript
const webhookUrl = localStorage.getItem('make_webhook_url');
if (webhookUrl) {
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postedId,
      imageUrl: image.url,
      caption,
      hashtags,
      musicUrl,
      platform,
    }),
  }).catch(err => console.error('Webhook error:', err));
}
```

**Improve to**:
```typescript
const webhookUrl = localStorage.getItem('make_webhook_url');
if (webhookUrl) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postedId,
        imageUrl: image.url,
        caption,
        hashtags: hashtags.split(' ').filter(h => h.trim()),
        musicUrl,
        platform,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    console.log('✅ Sent to Make.com successfully');
  } catch (err) {
    console.error('❌ Webhook error:', err);
    setError('Failed to send to Make.com. Check webhook URL.');
  }
}
```

#### Step 4.3: Add Make.com Setup UI
**File**: `src/App.tsx` - Add settings section to show/update webhook URL

**Add this to UI**:
```typescript
const [makeWebhookUrl, setMakeWebhookUrl] = useState(
  localStorage.getItem('make_webhook_url') || ''
);

// In UI, add settings panel:
<div>
  <h3>Make.com Setup</h3>
  <input
    type="text"
    placeholder="Paste your Make.com webhook URL here"
    value={makeWebhookUrl}
    onChange={(e) => {
      setMakeWebhookUrl(e.target.value);
      localStorage.setItem('make_webhook_url', e.target.value);
    }}
  />
  <p>Get this from: make.com → Your Scenario → Webhooks → Copy URL</p>
</div>
```

---

### PHASE 5: VERIFY & TEST

#### Test Checklist
- [ ] Upload salon room photos to Hair category
- [ ] Click "Generate Grid"
- [ ] Verify grid shows 16 clients IN your salon (not generic)
- [ ] Verify clients are sitting on salon chairs
- [ ] Verify 16 variations (different skin tones, ethnicities, ages, etc.)
- [ ] Verify grid is wide (21:9)
- [ ] Select 4 cells
- [ ] Verify 4 full 4K images generated
- [ ] Verify full images match grid cells exactly
- [ ] Verify unique captions generated for each
- [ ] Verify captions are creative (not generic)
- [ ] Add music + hashtags
- [ ] Click "Post"
- [ ] Verify webhook sends to Make.com
- [ ] Check Make.com scenario runs
- [ ] Verify post appears on Instagram/TikTok/Facebook

---

## 📝 FILES TO MODIFY

### New Files to Create
1. `src/lib/captionGenerator.ts` - Caption generation logic

### Files to Modify
1. `src/App.tsx`
   - Line 522: Grid prompt rewrite
   - Line 528: Aspect ratio 21:9
   - Line 630: Aspect ratio 1:1
   - Lines 593-672: Cell generation improvements
   - Lines 33-40: Add caption to GridCell type
   - Line 310-323: Improve webhook

2. `src/lib/laozhang.ts`
   - Line 38: Add '21:9' aspect ratio support

### Files NOT Needing Changes
- `src/components/PhotoUploader.tsx` ✅ Works
- `src/lib/supabase.ts` ✅ Works
- `src/lib/audius.ts` ✅ Works

---

## 🎯 SUCCESS CRITERIA

After implementation:

✅ Grid shows 16 clients IN your salon room (not generic)
✅ Grid is wide (21:9) with all 16 cells visible
✅ 16 variations in skin tone, ethnicity, age, camera specs
✅ Natural skin with texture and imperfections
✅ Consistent Kodak Portra 400 look across all cells
✅ Full 4K 1:1 images match grid cells exactly
✅ Unique AI captions for each full image
✅ Captions are creative and salon-style
✅ Make.com webhook working
✅ Posts to Instagram/TikTok/Facebook automatically
✅ Cost: $0.05 per grid + $0.05 per full image

---

## 💰 COST IMPACT

| Action | Cost | Notes |
|--------|------|-------|
| Grid generation | $0.05 | Prompt improvements don't change cost |
| Full images | $0.05 each | 4 selections = $0.20 |
| Captions | FREE | Gemini free tier |
| **Total Example** | **$0.25** | Same as before |

**No cost increase!** Just better results.

---

## ⏱️ IMPLEMENTATION ORDER

1. **First** (30 min): Fix grid prompt (App.tsx line 522)
2. **Second** (15 min): Fix aspect ratios (21:9 and 1:1)
3. **Third** (2 hours): Create caption generator
4. **Fourth** (1 hour): Improve webhook + add Make.com UI
5. **Fifth** (1 hour): Test full workflow

**Total**: 4-5 hours of coding + testing

---

## 🔍 KEY POINTS TO REMEMBER

1. **One API call per grid** = $0.05 (no change)
2. **Prompt is the key** - it controls everything
3. **Room images must be described** in prompt
4. **16 variations = diversity** in skin tone, ethnicity, age, camera specs
5. **Kodak Portra 400 = consistent brand look**
6. **Natural skin = real-looking results** (not AI-perfect)
7. **Full images must match grid** - exact same person/angle/salon
8. **Captions = AI generated** (not manual)
9. **Make.com = automation** (not manual posting)

---

## 📊 BEFORE vs AFTER

### BEFORE (Current - Broken)
```
Grid prompt: Generic "portrait shots..."
Result: Random clients in generic studio
Caption: "Professional salon services ✨" (generic)
Posting: Manual (Make.com not working)
```

### AFTER (Fixed)
```
Grid prompt: "16 clients IN your salon, randomized skin tones, ethnicities, cameras, etc."
Result: 16 diverse clients in YOUR salon room getting service
Caption: "Bold geometric balayage with dimensional blonde - luxury salon" (specific)
Posting: Automatic via Make.com
```

---

## ✅ READY TO START?

Once you approve this plan:
1. All code changes are straightforward
2. No breaking changes to existing features
3. Test as you go
4. Cost remains the same

**Status**: READY FOR IMPLEMENTATION

