# 🎨 Zavira AI Salon Studio - Complete Testing & Verification Plan

**Project**: Zavira AI Salon Studio - AI-powered salon content generator
**Objective**: Verify full application workflow from image upload → generation → posting
**Last Updated**: 2026-01-30
**Status**: Ready for Testing

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Phase 1: Core Functionality Testing](#phase-1-core-functionality-testing)
4. [Phase 2: Content Generation Testing](#phase-2-content-generation-testing)
5. [Phase 3: Social Media Posting Testing](#phase-3-social-media-posting-testing)
6. [Phase 4: Platform-Specific Testing](#phase-4-platform-specific-testing)
7. [Testing Checklist](#testing-checklist)
8. [Known Issues & Workarounds](#known-issues--workarounds)
9. [Success Criteria](#success-criteria)

---

## 🎯 Project Overview

### What is Zavira AI Salon Studio?

A unified web application that:
- ✨ Accepts salon room photos (drag & drop)
- 🤖 Generates AI images of clients in YOUR salon
- 🎬 Creates 4x4 grids (16 variations in one image)
- 📸 Generates full 4K images from selected grid cells
- ✍️ Auto-generates creative captions for each image
- 🎵 Provides trending music selection (platform-aware)
- #️⃣ Generates hashtags with platform considerations
- 🚀 Auto-posts to Instagram, TikTok, Facebook via Make.com
- 💰 Tracks budget and costs in real-time

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Image Generation | Lao Zhang API (Nano Banana Pro) |
| Image Storage | Supabase |
| Caption Generation | Google Gemini Vision API |
| Music | Audius API (trending tracks) |
| Social Posting | Make.com/Zapier webhooks |
| Database | Supabase PostgreSQL |
| Styling | Tailwind CSS |

---

## 🔧 Pre-Testing Setup

### Step 1: Install Dependencies

```bash
cd zavira-ai-salon-studio
npm install
```

**Expected Output:**
- ✅ All dependencies installed (React, TypeScript, Vite, etc.)
- ✅ `node_modules/` folder created
- ✅ `package-lock.json` updated

**Verify:**
```bash
npm list
```

### Step 2: Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

| Variable | Required | Source | Example |
|----------|----------|--------|---------|
| `VITE_LAOZHANG_API_KEY` | ✅ Yes | [Lao Zhang](https://www.laozhang.ai) | `sk_...` |
| `VITE_GOOGLE_API_KEY` | ✅ Yes | [Google AI Studio](https://aistudio.google.com) | `AIza...` |
| `VITE_SUPABASE_URL` | ✅ Yes | [Supabase](https://supabase.com) | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase | `eyJh...` |
| `VITE_MAKE_INSTAGRAM_WEBHOOK` | ⚠️ Optional | Make.com Scenario | `https://hook.make.com/...` |
| `MAKECOM_API_KEY` | ⚠️ Optional | Make.com | `xxx...` |

**Verify:**
```bash
cat .env.local
```

### Step 3: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.4.11  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

Open http://localhost:5173/ in your browser.

**Expected UI:**
- ✅ Navigation tabs visible (Elements, Generate, Saved, Posted)
- ✅ Category selector visible (Hair, Nail, Tattoo, Spa, Ambiance)
- ✅ Budget tracker shows in sidebar
- ✅ No console errors

---

## 🧪 Phase 1: Core Functionality Testing

### Test 1.1: Application Loads Without Errors

**Steps:**
1. Open http://localhost:5173/
2. Check browser console (F12)
3. Inspect for any red error messages

**Expected Results:**
- ✅ Page loads within 3 seconds
- ✅ Console shows no errors (warnings OK)
- ✅ All UI elements visible
- ✅ Categories loaded (Hair, Nail, Tattoo, Spa, Ambiance)

**Pass/Fail:** ___________

### Test 1.2: Elements Tab - Photo Upload

**Prerequisites:**
- Prepare 3-5 salon photos (JPG/PNG, 1-5 MB each)
- Example: hair salon chair, nail station, tattoo setup, spa room

**Steps:**
1. Click "Elements" tab
2. Select "Hair" category
3. Click "Upload Photos"
4. Drag and drop 3 hair salon photos
5. Wait for upload to complete
6. Verify photos appear in Elements list

**Expected Results:**
- ✅ Upload progress bar visible
- ✅ Photos uploaded to Supabase
- ✅ Photos listed under "Hair" category
- ✅ Delete button appears next to each photo
- ✅ No errors in console

**Potential Issues:**
- ❌ Upload fails → Check Supabase connection, API key
- ❌ Photos not visible → Check browser cache (Ctrl+Shift+Delete)

**Pass/Fail:** ___________

### Test 1.3: Elements Tab - Multiple Categories

**Steps:**
1. Upload photos for each category:
   - Hair (3 photos)
   - Nail (3 photos)
   - Tattoo (2 photos)
   - Spa (2 photos)
2. Switch between categories
3. Verify photos appear correctly for each category

**Expected Results:**
- ✅ Photos stored per category
- ✅ Switching categories shows correct photos
- ✅ Total cost displayed correctly
- ✅ No cross-category mixing

**Pass/Fail:** ___________

### Test 1.4: Budget Tracker

**Steps:**
1. View Budget Tracker in sidebar
2. Check initial budget (should be $0 if no generations)
3. Note the budget breakdown
4. Generate content (see Phase 2) and verify cost updates

**Expected Results:**
- ✅ Shows "Budget: $0.00" initially
- ✅ Breakdown visible: Grid generation ($0.05), Full images ($0.05 each)
- ✅ Monthly estimate calculated
- ✅ Cost updates after each generation

**Pass/Fail:** ___________

---

## 🎨 Phase 2: Content Generation Testing

### Test 2.1: Grid Generation (4x4)

**Prerequisites:**
- ✅ Uploaded 3-5 salon photos to "Hair" category
- ✅ Lao Zhang API key configured
- ✅ Budget tracking active

**Steps:**
1. Click "Generate" tab
2. Select "Hair" category
3. Click "Generate Grid"
4. Wait 30-60 seconds for generation
5. Observe 4x4 grid image in preview

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Generation takes 30-60 seconds
- ✅ 4x4 grid image appears (16 cells labeled A-P)
- ✅ Shows 16 different clients getting haircuts
- ✅ **IMPORTANT**: Clients visible in YOUR salon background
- ✅ Cells clearly labeled (A, B, C, D, etc.)
- ✅ Cost deducted from budget ($0.05)
- ✅ No errors in console

**Quality Checks:**
- Image shows YOUR salon room (if uploaded properly)
- All 16 variations visible (different skin tones, hair styles, angles)
- Professional quality (Kodak Portra 400 film stock effect)

**Potential Issues:**
- ❌ Generic salon (not yours) → Check prompt in App.tsx:522
- ❌ Low quality → Check model config in laozhang.ts
- ❌ Generation fails → Verify Lao Zhang API key and credits

**Pass/Fail:** ___________

### Test 2.2: Cell Selection & Full Image Generation

**Prerequisites:**
- ✅ 4x4 grid generated (from Test 2.1)

**Steps:**
1. Click 4 cells in the grid (e.g., A, B, E, F)
2. Click "Generate Selected Cells" button
3. Wait for full images to generate (2-3 minutes for 4 images)
4. View generated full images

**Expected Results:**
- ✅ Selected cells highlighted in grid
- ✅ Generation starts (loading spinner)
- ✅ Each cell generates as 4K square image (1:1 aspect ratio)
- ✅ Full images match selected grid cells exactly
- ✅ Cost deducted per image ($0.05 × 4 = $0.20)
- ✅ Budget tracker updates
- ✅ Images stored and ready for posting

**Quality Checks:**
- Images are 1:1 aspect ratio (square, not wide)
- Content matches grid preview
- Natural lighting and professional quality
- Client is clearly getting the service

**Potential Issues:**
- ❌ Aspect ratio wrong (too wide) → Check ImageGenerationOptions in App.tsx
- ❌ Doesn't match grid → Check cell prompt extraction logic
- ❌ Generation fails → Check API quota/credits

**Pass/Fail:** ___________

### Test 2.3: Caption Generation

**Prerequisites:**
- ✅ Full images generated (from Test 2.2)

**Steps:**
1. Click on a generated image to view details
2. Observe auto-generated caption
3. Check 3-4 different images
4. Verify captions are unique and descriptive

**Expected Results:**
- ✅ Each image has a unique caption
- ✅ Captions describe actual service (e.g., "Bold balayage highlights...")
- ✅ Creative/trendy tone (not generic)
- ✅ Examples:
  - "Dimensional balayage highlights with soft waves ✨"
  - "Sleek black blowout with glossy finish 💇"
  - "Rose gold hand-painted ombre nails 💅"
- ✅ No generic/template text
- ✅ Captions use free tier (Gemini API)

**Caption Quality Checklist:**
- [ ] Describes specific service
- [ ] Uses emoji appropriately
- [ ] Under 150 characters
- [ ] Platform-appropriate tone
- [ ] Unique for each image

**Potential Issues:**
- ❌ Generic captions → Check captionGenerator.ts implementation
- ❌ Quota exceeded → Check free tier limits in Google AI Studio
- ❌ Same caption repeated → Check image analysis logic

**Pass/Fail:** ___________

---

## 🎵 Phase 3: Social Media Posting Testing

### Test 3.1: Hashtag Generation

**Prerequisites:**
- ✅ Full images generated

**Steps:**
1. Click on an image to view post details
2. Observe "Suggested Hashtags" section
3. Check relevance and variety
4. Try editing hashtags manually

**Expected Results:**
- ✅ Hashtags auto-generated based on image
- ✅ 15-30 hashtags suggested
- ✅ Mix of popular (#hairstyles) and niche (#balayage)
- ✅ Can add/remove hashtags manually
- ✅ No duplicate hashtags

**Hashtag Quality Checklist:**
- [ ] Relevant to service shown
- [ ] Mix of sizes (popular + niche)
- [ ] Instagram-friendly (#word format)
- [ ] No duplicates
- [ ] Unique per image

**Pass/Fail:** ___________

### Test 3.2: Trending Music Selection

**Steps:**
1. Click on "Post" button for an image
2. Click "Select Music" option
3. Wait for trending music to load (may take 5-10 seconds)
4. Browse available tracks
5. Select one track

**Expected Results:**
- ✅ Music list loads from Audius API
- ✅ Shows track title, artist, duration
- ✅ Can scroll through tracks
- ✅ Can select/deselect music
- ✅ Selected track displayed
- ✅ No API errors

**Potential Issues:**
- ❌ Music won't load → Check Audius API connectivity
- ❌ Slow loading → API rate limits (expected, wait 10s)
- ❌ No tracks shown → Check Audius API configuration

**Pass/Fail:** ___________

### Test 3.3: Platform-Specific Music Compliance

**Important**: Different platforms have different music support:

| Platform | Music Support | Notes |
|----------|---------------|-------|
| **Instagram** | ✅ YES | Use trending audio or Audius tracks |
| **TikTok** | ✅ YES | Prefers trending music (built-in library) |
| **Facebook** | ⚠️ LIMITED | Some music restrictions, manual review may occur |

**Steps:**
1. Generate content for Instagram
   - Select music → POST
   - Expected: Music embedded in video
2. Generate content for TikTok
   - Select music → POST
   - Expected: Music synced
3. Generate content for Facebook
   - ⚠️ Consider posting without music or with royalty-free music
   - May require manual review

**Expected Results:**
- ✅ Instagram: Music posts successfully with video
- ✅ TikTok: Music recognized by algorithm
- ⚠️ Facebook: May require admin approval for music

**Pass/Fail:** ___________

---

## 📱 Phase 4: Platform-Specific Testing

### Important: Image Size & Aspect Ratio Considerations

Different platforms require different image dimensions:

| Platform | Optimal Size | Aspect Ratio | Notes |
|----------|--------------|--------------|-------|
| **Instagram Post** | 1080×1080 | 1:1 (Square) | ✅ Our grid cell size |
| **Instagram Story** | 1080×1920 | 9:16 (Vertical) | ⚠️ Need story format |
| **TikTok** | 1080×1920 | 9:16 (Vertical) | ⚠️ Vertical preferred |
| **Facebook Post** | 1200×630 | 1.91:1 (Wide) | ⚠️ Different aspect |
| **Pinterest** | 1000×1500 | 2:3 (Vertical) | ⚠️ Not currently supported |

**Current App Status:**
- ✅ Grid generation: 21:9 (ultra-wide, 16 cells visible)
- ✅ Full image generation: 1:1 (square, Instagram native)
- ⚠️ TikTok/Story support: NOT YET (would need 9:16 format)
- ⚠️ Facebook support: 1:1 format (may need resizing)

### Test 4.1: Instagram Posting

**Prerequisites:**
- ✅ Full images generated (1:1 square format)
- ✅ Caption created
- ✅ Hashtags added
- ✅ Make.com webhook configured (optional, for automation)

**Steps:**
1. Click image to view post details
2. Verify caption (1-2000 chars)
3. Verify hashtags (15-30 tags)
4. Select Instagram platform
5. Click "Post to Instagram"

**Expected Results:**
- ✅ 1:1 square format (native Instagram)
- ✅ Caption posts correctly
- ✅ All hashtags included
- ✅ Music/audio included (if selected)
- ✅ Post appears on Instagram feed within 5 minutes
- ✅ Status changes to "Posted" in app

**If Make.com not configured:**
- Manual post required: Copy image + caption + hashtags

**Potential Issues:**
- ❌ 1:1 image looks stretched → Verify aspect ratio in generator
- ❌ Hashtags truncated → Instagram limit is ~2200 chars total
- ❌ Music not embedded → Check music upload integration

**Pass/Fail:** ___________

### Test 4.2: TikTok Posting

**Important Note**: TikTok requires VERTICAL video (9:16).
Current app generates SQUARE images (1:1).
**Workaround**:
- Add black bars to top/bottom, OR
- Generate TikTok-format images separately, OR
- Use TikTok's zoom feature to fill screen

**Steps:**
1. Prepare square image (1:1)
2. In TikTok upload:
   - Click "Upload video"
   - Select generated image
   - TikTok will auto-adjust
3. Add caption + hashtags
4. Select TikTok sounds (platform native, not Audius)

**Expected Results:**
- ✅ Image uploads successfully
- ✅ TikTok fills screen (may add bars)
- ✅ Caption visible
- ✅ Hashtags recognized
- ✅ Sound/music optional (TikTok native sounds preferred)

**TikTok-Specific Notes:**
- TikTok has its own music/sound library (better than external)
- Trending audio changes hourly
- Vertical format (9:16) performs better
- Algorithm favors native sounds over imported music

**Pass/Fail:** ___________

### Test 4.3: Facebook Posting

**Important Note**: Facebook prefers 1.91:1 aspect ratio (wider than our 1:1).
**Workaround**: Add left/right white space, OR adjust in Facebook upload.

**Steps:**
1. Click image for post details
2. Adjust caption (Facebook allows longer text)
3. Add hashtags (Facebook supports them but less effective)
4. Select Facebook platform
5. Click "Post to Facebook"

**Expected Results:**
- ✅ Image posts successfully
- ✅ Caption displays (can be longer than Instagram)
- ✅ Hashtags visible (less important on Facebook)
- ✅ Music: Optional (may require review)
- ✅ Post appears on page/timeline within 5 minutes

**Facebook-Specific Notes:**
- Longer captions perform better (5-10 sentences)
- Hashtags less important than Instagram
- Video with music may require admin approval
- 1:1 square format will have margins on desktop

**Pass/Fail:** ___________

### Test 4.4: Image Resizing for Different Platforms

**Future Enhancement** (not yet implemented):

To support all platforms optimally, the app should offer:

```
Platform Format Selection:
- Instagram Post (1:1 square) ✅ SUPPORTED
- Instagram Story (9:16 vertical)
- TikTok (9:16 vertical)
- Facebook Feed (1.91:1 wide)
- Pinterest (2:3 tall)
- Twitter (16:9 wide)
```

**Current Workaround:**
- Use external tools (Canva, Figma) to resize before posting
- Or post as-is; most platforms auto-adjust

**Pass/Fail:** ___________

---

## 📝 Testing Checklist

### Pre-Testing Checklist
- [ ] Node.js installed (v16+)
- [ ] npm installed
- [ ] `.env.local` created with all API keys
- [ ] Salon photos prepared (3-5 per category)
- [ ] Lao Zhang account with credits
- [ ] Google AI Studio API key (free tier)
- [ ] Supabase project created
- [ ] Make.com/Zapier account (optional)

### Phase 1 Checklist
- [ ] Test 1.1: Application loads
- [ ] Test 1.2: Photo upload works
- [ ] Test 1.3: Multiple categories work
- [ ] Test 1.4: Budget tracker displays

### Phase 2 Checklist
- [ ] Test 2.1: Grid generation works
- [ ] Test 2.2: Cell selection & full image generation works
- [ ] Test 2.3: Caption generation works
- [ ] Verify caption quality (unique, descriptive)
- [ ] Verify images match grid

### Phase 3 Checklist
- [ ] Test 3.1: Hashtag generation works
- [ ] Test 3.2: Music selection works
- [ ] Test 3.3: Platform music compliance understood

### Phase 4 Checklist
- [ ] Test 4.1: Instagram posting works
- [ ] Test 4.2: TikTok posting works (with caveat)
- [ ] Test 4.3: Facebook posting works
- [ ] Test 4.4: Understand image resizing needs

### Final Verification
- [ ] All features tested
- [ ] No critical errors
- [ ] Budget tracking accurate
- [ ] Images quality acceptable
- [ ] Captions creative and unique
- [ ] Posting to all platforms successful

---

## ⚠️ Known Issues & Workarounds

### Issue 1: Image Aspect Ratio for TikTok/Stories
**Problem**: App generates 1:1 square images, but TikTok prefers 9:16 vertical.
**Impact**: TikTok videos have black bars on sides.
**Workaround**:
- Post to TikTok as-is (auto-adjusted)
- Use TikTok's native sounds instead of imported music
- Future: Add 9:16 format option

### Issue 2: Facebook Music Requirements
**Problem**: Facebook may require admin review for copyrighted music.
**Impact**: Posts with music may not appear immediately.
**Workaround**:
- Use royalty-free music (Audius tracks are mostly royalty-free)
- Post without music for faster approval
- Wait 24 hours for admin review

### Issue 3: Audius API Rate Limiting
**Problem**: Audius API may be slow during peak hours.
**Impact**: "Select Music" may take 5-10 seconds to load.
**Workaround**:
- Wait patiently (10-15 seconds)
- Retry if timeout
- Consider caching trending music locally

### Issue 4: Google AI Studio Free Tier Quota
**Problem**: Free tier has limited requests (1500 RPM).
**Impact**: Caption generation may fail after many requests.
**Workaround**:
- Space out caption generation (don't generate 50 at once)
- Paid tier: $0.075 per 1000 requests (very cheap)
- Check quota at https://aistudio.google.com/

### Issue 5: Supabase Storage Limits
**Problem**: Free tier has 1GB storage limit.
**Impact**: After ~200 generated images, storage may fill up.
**Workaround**:
- Delete old images regularly
- Upgrade to paid tier ($5/month = 100GB)
- Archive images to local drive before deleting

### Issue 6: Make.com Webhook Timeout
**Problem**: Webhook may timeout if image is very large.
**Impact**: Posting fails with error.
**Workaround**:
- Compress images before posting (already done in app)
- Check Make.com scenario logs for details
- Add retry logic in Make.com

### Issue 7: Browser Local Storage Limit
**Problem**: App stores user ID and settings in localStorage.
**Impact**: Some browsers limit to 5-10MB.
**Workaround**:
- Clear browser cache periodically (Ctrl+Shift+Delete)
- Use Chrome/Firefox (better quota than Safari)
- Consider moving to IndexedDB (future enhancement)

---

## ✅ Success Criteria

### Minimum Success (App is Working)
- ✅ Photos upload successfully
- ✅ 4x4 grid generates (16 cells visible)
- ✅ Full images generate from selected cells
- ✅ Captions are created (unique, not generic)
- ✅ Cost tracking is accurate
- ✅ One platform posts successfully (any of Instagram/TikTok/Facebook)

### Full Success (App is Production-Ready)
- ✅ All of above PLUS:
- ✅ Grid shows clients IN your salon (not generic)
- ✅ All 3 platforms post successfully
- ✅ Hashtags are relevant and creative
- ✅ Music selection works smoothly
- ✅ Budget stays under $15/month for daily posting
- ✅ No errors in console
- ✅ UI is responsive and intuitive
- ✅ Post reviews work correctly

### Dream Success (App is Optimized)
- ✅ All of above PLUS:
- ✅ Platform-specific image sizes (9:16 for TikTok, 1.91:1 for Facebook)
- ✅ Bulk generation (generate 10 grids at once)
- ✅ Scheduling (schedule posts for specific times)
- ✅ Analytics (track engagement, best performing posts)
- ✅ A/B testing (compare different caption styles)

---

## 📊 Test Results Summary

### Overall Status
**Date Tested**: ___________
**Tester**: ___________

| Phase | Tests Passed | Tests Failed | Status |
|-------|-------------|-------------|--------|
| Phase 1: Core | ___/4 | ___/4 | 🟢/🔴 |
| Phase 2: Content Gen | ___/3 | ___/3 | 🟢/🔴 |
| Phase 3: Posting | ___/3 | ___/3 | 🟢/🔴 |
| Phase 4: Platforms | ___/4 | ___/4 | 🟢/🔴 |
| **TOTAL** | ___/14 | ___/14 | 🟢/🔴 |

### Critical Issues Found
1. ___________
2. ___________
3. ___________

### Recommendations
1. ___________
2. ___________
3. ___________

---

## 🔗 Useful Resources

- **Lao Zhang API Docs**: https://www.laozhang.ai/docs
- **Google AI Studio**: https://aistudio.google.com/
- **Supabase Docs**: https://supabase.com/docs
- **Make.com Docs**: https://www.make.com/help
- **Audius API**: https://audius.org/api
- **React Documentation**: https://react.dev/

---

## 📞 Troubleshooting Quick Reference

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| "API key not found" | Missing `.env.local` | Create `.env.local` with all keys |
| "Upload failed" | Supabase not configured | Check VITE_SUPABASE_URL and key |
| "Generation timeout" | API slow or no credits | Wait 30s, check Lao Zhang credits |
| "Caption failed" | Google API limit reached | Wait 1 hour or upgrade tier |
| "Post failed" | Make.com webhook incorrect | Check webhook URL in .env.local |
| Blank grid | Model output error | Check API key validity, try again |

---

## 🎯 Next Steps

1. ✅ Complete all tests in this plan
2. ✅ Document results above
3. ✅ Report any critical issues
4. ✅ Deploy to production when ready
5. ✅ Monitor performance and costs
6. ✅ Gather user feedback
7. ✅ Plan future enhancements

---

**Document Version**: 1.0
**Last Updated**: 2026-01-30
**Maintained By**: Development Team
