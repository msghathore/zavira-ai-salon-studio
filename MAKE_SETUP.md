# Make.com Setup Guide for Zavira AI Salon Studio

This guide explains how to set up Make.com to automatically post your salon content to social media platforms.

---

## 🎯 Overview

The Zavira app generates beautiful salon content and captions, but you need Make.com to actually POST it to Instagram, TikTok, Facebook, etc.

**One-time setup**: ~15 minutes
**Cost**: FREE (1,000 operations/month on free tier)

---

## 📊 What Gets Posted

When you click "Post" in the app:
- Image (4K salon photo or grid)
- Caption (AI-generated salon style)
- Hashtags (#ZaviraSalon #Winnipeg #HairSalon etc)
- Music (trending track from Audius)
- Platform (Instagram or TikTok)

Make.com receives this data and posts it automatically.

---

## ✅ Step 1: Create Make.com Account

1. Go to [Make.com](https://make.com)
2. Sign up with email (FREE account is fine)
3. Verify your email
4. Log in

---

## ✅ Step 2: Create Instagram Posting Scenario

This will post to Instagram, Facebook, and Threads automatically.

### Step 2.1: Create New Scenario

1. In Make.com, click **"Create a new scenario"**
2. Choose **"Webhooks"** module
3. Select **"Custom Webhook"** as trigger
4. Click **"Save"**

### Step 2.2: Add HTTP Module (Download Image)

1. Click **"Add"** to add another module
2. Search for **"HTTP"**
3. Select **"HTTP" → "Get a File"**
4. In the settings:
   - **URL**: Map to `imageUrl` from webhook
   - **Filename**: `salon_photo.jpg`

### Step 2.3: Add Instagram Module

1. Click **"Add"** another module
2. Search for **"Instagram Business"**
3. Select **"Create a Photo Post"**
4. In the settings:
   - **Connection**: Click **"Add"** and authorize your Instagram Business account
   - **Media Source**: Choose **"From File"**
   - **File**: Map to the file from HTTP module (previous step)
   - **Caption**: Map to `caption` from webhook
   - **Enable**: Turn ON **"Share to Facebook Page"**
   - **Enable**: Turn ON **"Share to Threads"**

### Step 2.4: Activate & Copy Webhook URL

1. Click **"On/Off"** toggle to activate (turn green)
2. Click **"Webhooks"** in the scenario flow
3. **Copy the webhook URL** - looks like: `https://hook.make.com/xxxxx...`
4. Save this URL - you'll need it next!

---

## ✅ Step 3: Add Webhook URL to Zavira App

Now tell your Zavira app where to send posts.

### Step 3.1: Update Environment Variables

Open `.env.local` in your project and add:

```
VITE_MAKE_WEBHOOK_URL=https://hook.make.com/xxxxx...
```

Replace `xxxxx...` with your actual webhook URL from Step 2.4

### Step 3.2: Redeploy

If using Vercel:
1. Commit and push changes to GitHub
2. Vercel automatically redeploys
3. Done!

---

## 🔧 Optional: Setup TikTok Posting

Currently, TikTok has no direct API, but you can use:

### Option A: Upload-Post.com (Recommended)

1. Go to [Upload-Post.com](https://upload-post.com)
2. Sign up and get API key
3. Add to `.env.local`:
   ```
   VITE_UPLOAD_POST_API_KEY=your_key_here
   ```

### Option B: Late.dev

1. Go to [Late.dev](https://getlate.dev)
2. Sign up and get API key
3. Add to `.env.local`:
   ```
   VITE_LATE_DEV_API_KEY=your_key_here
   ```

---

## 📱 Test It Out

1. Open your Zavira app
2. Go to **Generate** tab
3. Create a grid (or use existing saved grid)
4. Go to **Saved** tab
5. Click **Post** on a grid image
6. Edit caption/hashtags if you want
7. Select platform (Instagram or TikTok)
8. Click **"Review & Post"** button
9. Verify the image/caption in preview
10. Click **"Post Now"** button
11. Check Instagram/TikTok - your post should appear!

---

## ❓ Troubleshooting

### "Posts showing Pending but not posting?"

**Likely cause**: Webhook URL not set
- Check `.env.local` has `VITE_MAKE_WEBHOOK_URL`
- Verify URL starts with `https://hook.make.com`
- Redeploy to Vercel

### "Instagram authorization failed?"

**Solution**:
1. Go back to Make.com
2. Edit the Instagram module
3. Click **"Disconnect"** on the Connection
4. Click **"Add"** and re-authorize
5. Make sure you use an Instagram BUSINESS account (not personal)

### "Webhook URL not working?"

**Solution**:
1. Go back to Make.com
2. Click on the Webhooks module
3. Click **"Determine data structure"**
4. In Zavira app, try posting once
5. Make.com will capture the data structure
6. Copy the webhook URL again and update `.env.local`

### "Make.com operations running out?"

Free tier = 1,000 operations/month
- Each post = ~2-3 operations
- So you can post ~300-500 times/month
- If you hit the limit, create a second Make.com account and create another scenario there!

---

## 🚀 Advanced: Multiple Accounts for More Posts

Want to post more than 1,000 times/month? Create multiple Make.com scenarios:

1. Create 3 Make.com accounts = 3,000 operations/month
2. Create a scenario in each account
3. In Zavira app, add multiple webhook URLs in environment:
   ```
   VITE_MAKE_WEBHOOK_URL_1=https://hook.make.com/xxxxx
   VITE_MAKE_WEBHOOK_URL_2=https://hook.make.com/yyyyy
   VITE_MAKE_WEBHOOK_URL_3=https://hook.make.com/zzzzz
   ```
4. When posting, randomly choose one webhook to distribute load

---

## 📋 Checklist

- [ ] Created Make.com account
- [ ] Created Instagram posting scenario
- [ ] Authorized Instagram Business account
- [ ] Copied webhook URL
- [ ] Updated `.env.local` with webhook URL
- [ ] Deployed to Vercel
- [ ] Tested posting (image appears on Instagram)
- [ ] (Optional) Set up TikTok posting
- [ ] (Optional) Set up multiple accounts for more posts

---

## 💡 Pro Tips

1. **Best Posting Times**:
   - Instagram: 1 PM (13:00) Winnipeg time
   - TikTok: 7 PM (19:00) Winnipeg time
   - Facebook: 1 PM (13:00) Winnipeg time

2. **Avoid Instagram Shadow Bans**:
   - Don't post more than 10 times/day
   - Space posts 30+ minutes apart
   - Use genuine hashtags, not spam

3. **Caption Quality**:
   - AI captions analyze your actual photos
   - They're specific, not generic
   - Include trendy emojis automatically
   - Sound like luxury salon (Vogue style)

4. **Music Matters**:
   - Trending audio from Audius
   - Auto-included with every post
   - Makes content more engaging on TikTok/Reels

---

## 🎯 What You Should See

**After Setup:**
- Post appears on Instagram within 1-2 minutes
- Auto-shares to Facebook Page (if enabled)
- Auto-shares to Threads
- Status changes from "Pending" to "Posted" in app

**If it doesn't work:**
- Check Make.com webhook execution history (blue play button in scenario)
- Check Instagram Business account for failed authorizations
- Check browser console for any errors (should be clean now)
- Make sure Instagram account is a BUSINESS account (not personal)

---

## 📞 Need Help?

If posts aren't working:

1. **Check Make.com scenario**:
   - Click scenario → View execution history
   - Does webhook trigger show up?
   - Are there error logs?

2. **Check Instagram authorization**:
   - Is it a Business account?
   - Are permissions granted?
   - Did you authorize the right IG account?

3. **Check `.env.local`**:
   - Is webhook URL correct?
   - Did you redeploy?
   - Try redeploying to Vercel manually

4. **Debug webhook**:
   - In Make.com, click "Determine data structure"
   - Go back to Zavira and try posting again
   - Make.com should show what data it received

---

**Status**: Ready to post! 🚀

Once Make.com is set up, every post you create will automatically go to Instagram (+ Facebook + Threads) instantly!
