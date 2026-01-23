# Make.com Webhook Payload Format

This document shows exactly what data your Zavira app sends to Make.com when you post.

---

## 📤 Webhook URL

```
https://hook.us2.make.com/hg9rewbrkkovny0kybiq2a1tdofd9cpu
```

This webhook is already configured in your `.env.local`.

---

## 📦 Data Sent When You Click "Post"

When you post from the Zavira app, this JSON is sent to Make.com:

```json
{
  "postedId": "uuid-1234-5678-abcd",
  "imageUrl": "https://example.com/salon-photo.jpg",
  "caption": "Dimensional blonde balayage with soft waves ✨ Total transformation",
  "hashtags": ["#ZaviraSalon", "#Winnipeg", "#HairSalon"],
  "musicUrl": "https://audius.co/track/stream/123456",
  "platform": "instagram",
  "timestamp": "2026-01-22T15:30:45.123Z"
}
```

---

## 🔍 Field Descriptions

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `postedId` | string (UUID) | `a1b2c3d4-...` | Unique ID for this post in Zavira database |
| `imageUrl` | string (URL) | `https://...` | Direct link to the salon photo (4K image) |
| `caption` | string | `"Styling goals ✨"` | AI-generated caption (specific to the image) |
| `hashtags` | array | `["#Hair", "#Salon"]` | Tags for the post |
| `musicUrl` | string (URL) | `https://audius...` | Trending audio track (Audius link) |
| `platform` | string | `"instagram"` | Social platform (`instagram` or `tiktok`) |
| `timestamp` | ISO 8601 | `2026-01-22T15:30:45Z` | When the post was created |

---

## 🔄 Make.com Scenario Processing

Your Make.com scenario (from postall-zavira) receives this webhook and:

1. **Downloads the image** from `imageUrl` using HTTP module
2. **Creates Instagram post** with:
   - Image (from downloaded file)
   - Caption (from `caption` field)
   - Auto-shares to Facebook Page (if enabled in Make.com)
   - Auto-shares to Threads (if enabled in Make.com)
3. **Returns success response** to Zavira

---

## ✅ Success Response

When Make.com successfully posts, it returns:

```
HTTP 200 OK
```

Zavira then:
- Updates post status from `"pending"` → `"posted"`
- Stores the timestamp in database
- Shows "Posted" in the Review tab

---

## ❌ Failure Handling

If Make.com webhook fails:
- Status stays as `"pending"`
- Post remains in database
- You can retry later
- No error messages shown (clean UI)

---

## 📊 Sample Webhook Call (Raw HTTP)

```
POST https://hook.us2.make.com/hg9rewbrkkovny0kybiq2a1tdofd9cpu
Content-Type: application/json

{
  "postedId": "550e8400-e29b-41d4-a716-446655440000",
  "imageUrl": "https://xsdrypxvvrrvtwcidmas.supabase.co/storage/v1/object/public/generations/grid-12345.jpg",
  "caption": "Bold matte black nails with rose gold accents 💅 Custom luxury",
  "hashtags": ["#ZaviraSalon", "#Winnipeg", "#NailArt", "#SalonLife"],
  "musicUrl": "https://creatornode.audius.co/tracks/1234567",
  "platform": "instagram",
  "timestamp": "2026-01-22T20:15:30.000Z"
}
```

---

## 🎯 Integration Status

- ✅ Webhook URL configured in `.env.local`
- ✅ Payload structure defined and validated
- ✅ Make.com scenario ready to receive data
- ✅ Status updates implemented
- ✅ Error handling silent and clean
- ✅ Data sent on every post click

---

## 🧪 Testing

To verify the webhook is working:

1. **Open Zavira app**
2. **Go to Post tab**
3. **Select an image** (grid or uploaded)
4. **Click Post Now**
5. **Check Instagram** (within 1-2 minutes):
   - Image should appear on feed
   - Caption should match what you saw in app
   - Music should be attached
6. **Check Review tab**:
   - Status should change to "Posted"

If it doesn't work:
- Check Make.com scenario is active (green toggle)
- Check Instagram Business account is authorized
- Check `.env.local` has correct webhook URL
- Redeploy to Vercel if you changed `.env.local`

---

## 📋 Webhook Changelog

**v1.0** (Current)
- Send: postedId, imageUrl, caption, hashtags, musicUrl, platform, timestamp
- Support: Instagram (via Make.com)
- Future: TikTok, Facebook, Pinterest endpoints

---

**Status**: Live and ready to post! 🚀
