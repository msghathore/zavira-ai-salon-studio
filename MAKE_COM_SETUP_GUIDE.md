# Make.com Instagram Automation Setup Guide

## Step 1: Log in to Make.com
1. Go to https://make.com
2. Log in with your account
3. Click **Create a new scenario**

## Step 2: Add Webhook Trigger
1. Click the **+** to add a module
2. Search for **Webhooks**
3. Select **Webhooks → Custom Webhook**
4. Click **Add**
5. Give it a name: `Instagram Post Trigger`
6. Copy the Webhook URL that appears
7. **IMPORTANT:** Save this URL - you'll need it

## Step 3: Update Your App with Webhook URL
In your app (when this guide is done), update the environment variable:
```
VITE_MAKE_INSTAGRAM_WEBHOOK=YOUR_WEBHOOK_URL_FROM_STEP_2
```

## Step 4: Add Instagram Module
1. Click **+** to add next module
2. Search **Instagram**
3. Select **Instagram → Create a Media Item**
4. Click **Connect your account**
5. Log in to your Instagram Business account
6. Authorize Make.com

## Step 5: Configure Instagram Post
1. After connecting, select your **Instagram Business Account**
2. Select **Media Type**: `IMAGE`
3. In the **Image URL** field, click the data icon and select:
   - From webhook: `imageUrl`
4. In **Caption** field, click data icon and select:
   - `caption` (from webhook)
5. Leave other fields blank

## Step 6: Add Text Formatter (Optional - for hashtags)
1. Click **+** to add module
2. Search **Text**
3. Select **Text → Compose**
4. In the field, use:
   ```
   {caption} {hashtags}
   ```
5. Map: `caption` and `hashtags` from webhook

## Step 7: Test the Workflow
1. Click **Save**
2. Click **Run Once**
3. Make.com will wait for a webhook call
4. Keep this tab open

## Step 8: Test from Your App
1. Go to your app: https://zavira-ai-salon-studio.vercel.app
2. Upload an image
3. Click **POST** button
4. Check Make.com - you should see the webhook received

## Step 9: Set Status to Posted
Add another module after Instagram:
1. Click **+**
2. Search **HTTP**
3. Select **HTTP → Make a request**
4. Method: **POST**
5. URL: `https://zavira-ai-salon-studio.vercel.app/api/update-post-status`
6. Headers:
   ```
   Content-Type: application/json
   ```
7. Body:
   ```json
   {
     "postedId": "{postedId from webhook}",
     "status": "posted"
   }
   ```

## Step 10: Final Setup
1. Turn on **Webhook** toggle to **ON**
2. Click **Deploy**
3. Your workflow is now LIVE!

## Testing Checklist
- [ ] Webhook URL copied
- [ ] Instagram account connected
- [ ] Image URL mapped from webhook
- [ ] Caption mapped from webhook
- [ ] Make.com scenario deployed
- [ ] Test post sent from app
- [ ] Image appeared in Instagram
- [ ] Status updated to "posted"

## Webhook Payload Structure
Your app sends:
```json
{
  "postedId": "unique-id",
  "imageUrl": "https://...",
  "caption": "AI-generated caption",
  "hashtags": ["#tag1", "#tag2"],
  "musicUrl": "https://...",
  "platform": "instagram",
  "timestamp": "2026-01-23T..."
}
```

## Troubleshooting
- **Webhook not receiving**: Check Make.com scenario is deployed and listening
- **Instagram error**: Re-authorize Instagram account in Make.com
- **Caption not showing**: Make sure `caption` field is mapped correctly
- **Image not uploading**: Verify `imageUrl` is valid and accessible

---

**Your webhook URL:** (will be generated in Step 2)
Save it here: ________________________
