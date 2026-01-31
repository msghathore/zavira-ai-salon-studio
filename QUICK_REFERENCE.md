# ⚡ Zavira AI - Quick Reference Guide

**Print this page** for quick troubleshooting and verification

---

## 🎯 Will My Photo Post to Instagram?

| Step | Status | Details |
|------|--------|---------|
| Upload Photo | ✅ YES | Supabase stores it |
| Generate Grid | ✅ YES | 4x4 with 16 cells |
| Generate Full Images | ✅ YES | 1:1 square format |
| Create Caption | ✅ YES | Gemini Vision API |
| Add Hashtags | ✅ YES | AI-generated |
| Select Music | ✅ YES | Audius trending tracks |
| **Post to Instagram** | ⚠️ **NEEDS VERIFICATION** | Webhook configured but Make.com untested |
| **Post to Facebook** | ⚠️ **NEEDS VERIFICATION** | Auto-shares from Instagram |
| **Post to TikTok** | ❌ NO | Not yet implemented |

---

## 📱 Instagram Posting Flow

```
🖼️  PHOTO UPLOAD
        ↓
✨ GRID GENERATION (4x4)
        ↓
📸 FULL IMAGE (1:1 square)
        ↓
✍️  CAPTION (Gemini Vision)
        ↓
#️⃣  HASHTAGS (AI-generated)
        ↓
🎵 MUSIC (Audius trending)
        ↓
🚀 POST WEBHOOK
   https://hook.us2.make.com/hg9rewbrkkovny0kybiq2a1tdofd9cpu
        ↓
📤 MAKE.COM RECEIVES ← NEEDS VERIFICATION
        ↓
🤳 INSTAGRAM POST APPEARS (1-2 min)
        ↓
✅ STATUS: "POSTED"
```

---

## ✅ What's Working Right Now

- ✅ Photo upload (Supabase)
- ✅ Grid generation (Lao Zhang API)
- ✅ Full image generation (1:1 square)
- ✅ Caption generation (Gemini Vision)
- ✅ Hashtag generation
- ✅ Music selection (Audius)
- ✅ Webhook code ready
- ✅ Database tracking

---

## ⚠️ What Needs Verification

1. **Make.com Scenario**
   - Is it created? ❓
   - Is it ON? ❓
   - Instagram authorized? ❓
   - Recent webhook calls? ❓

2. **Webhook Delivery**
   - Is URL correct? ❓
   - Can it receive data? ❓

3. **Instagram Posting**
   - Does post appear? ❓
   - Does status update? ❓

---

## ❌ What's NOT Implemented

- ❌ TikTok posting (needs Upload-Post.com or Late.dev)
- ❌ Pinterest
- ❌ LinkedIn

---

## 🔍 How to Check If Make.com Is Set Up

### Quick Check #1: Log into Make.com
```
1. Go to https://make.com
2. Log in
3. Look for "Zavira" or "Instagram" scenario
4. If found, click it
5. Check the toggle switch:
   🟢 GREEN = Active (Good!)
   ⚪ GRAY = Inactive (Need to turn ON)
```

### Quick Check #2: Send Test Webhook
```bash
curl -X POST https://hook.us2.make.com/hg9rewbrkkovny0kybiq2a1tdofd9cpu \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected result:
- ✅ HTTP 200 = Webhook is active
- ❌ HTTP 404 = Webhook is broken

### Quick Check #3: Test from App
```
1. Upload photo to Zavira
2. Click "POST"
3. Wait 1-2 minutes
4. Check Instagram
5. Image should appear!
```

---

## 💰 Cost Breakdown

| Action | Cost | Notes |
|--------|------|-------|
| Grid generation | $0.05 | 4x4 in one call |
| Full image | $0.05 | Per image |
| Caption | FREE | Gemini free tier |
| Hashtags | FREE | AI-generated |
| Music | FREE | Audius |
| Posting | FREE | Make.com free tier (1000 ops/month) |
| **Total per post** | **~$0.15** | Very cheap! |
| **Monthly (100 posts)** | **~$15** | Budget-friendly |

---

## 🚀 To Get It Working Right Now

### Step 1: Verify Make.com Scenario
```
1. Go to https://make.com
2. Find Zavira scenario
3. Click it
4. Turn toggle ON (green)
5. Click DEPLOY
```

### Step 2: Test Upload
```
1. Go to http://localhost:5173
2. Upload a salon photo
3. Select "Hair" category
4. Click "Generate Grid"
5. Wait ~1 minute
6. Click an image
7. Click "POST"
8. Add caption/hashtags/music
9. Click "POST NOW"
```

### Step 3: Check Instagram
```
1. Open Instagram
2. Wait 1-2 minutes
3. Check your feed
4. Image should appear! ✅
```

### Step 4: Check App Status
```
1. Go back to Zavira app
2. Click "Posted" tab
3. Should show "Posted" ✅
```

---

## 🆘 If It Doesn't Work

| Problem | Solution |
|---------|----------|
| Post stuck on "Pending" | Check Make.com scenario is ON (green toggle) |
| Instagram post doesn't appear | Verify Instagram Business account is authorized in Make.com |
| Webhook error | Check Make.com execution logs for error messages |
| Image won't upload | Check Supabase API key in `.env.local` |
| Grid generation fails | Check Lao Zhang API key and credits |
| Caption is generic | Check Gemini API quota |

---

## 📋 Make.com Scenario Structure

Your scenario should look like this:

```
[Webhook Trigger]
      ↓
[HTTP Module - Download Image]
      ↓
[Instagram Business - Create Post]
      ├─ Image: From HTTP module
      ├─ Caption: From webhook JSON
      └─ Share to Facebook: ON (optional)
      ↓
[End]
```

---

## 📝 Webhook Data Format

When you click POST, this is sent to Make.com:

```json
{
  "postedId": "abc123",
  "imageUrl": "https://...",
  "caption": "Dimensional balayage highlights ✨",
  "hashtags": ["#hair", "#salon"],
  "musicUrl": "https://audius.co/...",
  "platform": "instagram",
  "timestamp": "2026-01-30T00:00:00Z"
}
```

---

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ Photo uploads to Zavira
2. ✅ Grid generates with 16 cells
3. ✅ Full image generates (1:1 square)
4. ✅ Caption is unique and creative
5. ✅ Click "POST" button
6. ✅ Image appears on Instagram within 2 minutes
7. ✅ Status shows "Posted" in Zavira app
8. ✅ All hashtags visible on Instagram
9. ✅ Music attached (if selected)
10. ✅ Total cost ~$0.15 per post

---

## 🔗 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Zavira App | http://localhost:5173 | Main app |
| Make.com | https://make.com | Posting automation |
| Lao Zhang | https://www.laozhang.ai | Image generation API |
| Google AI Studio | https://aistudio.google.com | Gemini Vision API |
| Audius | https://audius.org | Music API |
| Supabase | https://supabase.com | Storage & database |

---

## 📞 Webhook URL

**This is what triggers Instagram posting:**

```
https://hook.us2.make.com/hg9rewbrkkovny0kybiq2a1tdofd9cpu
```

Copy this to Make.com if setting up webhook again.

---

## 🎬 Video/Screenshot Locations

Based on your request for screenshots/verification:

| What | Where to Find | Action |
|------|---------------|--------|
| Make.com Scenario | https://make.com → Find scenario | Screenshot the flow |
| Webhook URL | Click webhook module → Copy URL | Verify it matches above |
| Instagram Auth | Edit Instagram module → Check connection | Verify Business account |
| Execution History | Scenario → Blue play button → View logs | Check recent calls |

---

## ✨ Quick Wins (Do These Now)

1. **Verify Make.com in 5 minutes**
   - [ ] Log into Make.com
   - [ ] Find scenario
   - [ ] Check toggle is ON
   - [ ] Copy webhook URL

2. **Test in 10 minutes**
   - [ ] Upload photo
   - [ ] Generate grid
   - [ ] Post one image
   - [ ] Check Instagram

3. **Troubleshoot in 5 minutes**
   - [ ] Check Make.com logs
   - [ ] Verify Instagram account
   - [ ] Resend test webhook
   - [ ] Try again

---

## 🎓 What Each Component Does

| Component | Job | Status |
|-----------|-----|--------|
| **Zavira App** | Collect data + send webhook | ✅ Done |
| **Supabase** | Store photos + tracking | ✅ Done |
| **Lao Zhang API** | Generate images | ✅ Done |
| **Gemini Vision** | Create captions | ✅ Done |
| **Audius API** | Find trending music | ✅ Done |
| **Make.com** | Receive webhook + post to Instagram | ⚠️ Setup unknown |
| **Instagram** | Receive post + display | ⚠️ Depends on Make.com |

---

## 🚨 Red Flags

If you see these, something is wrong:

- ❌ Post status stays "Pending" forever → Make.com not responding
- ❌ No error message but no post → Make.com webhook silent fail
- ❌ Image uploads but app crashes → UI issue
- ❌ Grid looks blurry/low quality → API quality setting
- ❌ Caption is generic/template → Vision API not analyzing

---

## 📊 Current Status Summary

```
UPLOAD       ✅ WORKING
GENERATE     ✅ WORKING
CAPTION      ✅ WORKING
HASHTAGS     ✅ WORKING
MUSIC        ✅ WORKING
MAKE.COM     ⚠️  UNTESTED
INSTAGRAM    ⚠️  DEPENDS ON MAKE.COM
TIKTOK       ❌ NOT YET
FACEBOOK     ⚠️  DEPENDS ON INSTAGRAM
```

**Bottom Line**: Everything is ready except Make.com needs verification.

---

**Print & Keep This Page Handy!**

Last updated: 2026-01-30
