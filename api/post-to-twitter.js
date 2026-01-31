import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get credentials from environment
    const consumerKey = process.env.TWITTER_CONSUMER_KEY;
    const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
      console.error('[Twitter] Missing credentials');
      console.error('[Twitter] Has consumerKey:', !!consumerKey);
      console.error('[Twitter] Has consumerSecret:', !!consumerSecret);
      console.error('[Twitter] Has accessToken:', !!accessToken);
      console.error('[Twitter] Has accessSecret:', !!accessSecret);
      throw new Error('Twitter API credentials not configured');
    }

    console.log('[Twitter] Credentials loaded');
    console.log('[Twitter] API Key (first 10):', consumerKey?.substring(0, 10));
    console.log('[Twitter] Access Token (first 10):', accessToken?.substring(0, 10));

    // Initialize Twitter client with OAuth 1.0a
    const client = new TwitterApi({
      appKey: consumerKey,
      appSecret: consumerSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Get read-write client for posting
    const rwClient = client.readWrite;

    const { videoUrl, caption, hashtags, testMode } = req.body;

    // Test mode - just verify auth with a simple tweet
    if (testMode) {
      console.log('[Twitter] Test mode - verifying authentication...');
      const testTweet = await rwClient.v2.tweet({
        text: `Test from Zavira Salon ${Date.now()}`
      });
      return res.status(200).json({
        success: true,
        testMode: true,
        tweetId: testTweet.data.id,
        message: 'Auth test successful!'
      });
    }

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    console.log('[Twitter] Starting post to X/Twitter');
    console.log('[Twitter] Video URL:', videoUrl);

    // Step 1: Download video from URL
    console.log('[Twitter] Downloading video...');
    const videoResponse = await fetch(videoUrl);

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log('[Twitter] Video downloaded, size:', videoBuffer.length, 'bytes');

    // Step 2: Upload video to Twitter
    console.log('[Twitter] Uploading video to X...');
    const mediaId = await rwClient.v1.uploadMedia(videoBuffer, {
      mimeType: 'video/mp4',
    });

    console.log('[Twitter] Video uploaded, media_id:', mediaId);

    // Step 3: Create tweet with video
    const tweetText = `${caption || ''} ${hashtags || ''}`.trim() || 'Posted via Zavira Salon';
    console.log('[Twitter] Creating tweet with text:', tweetText);

    const tweet = await rwClient.v2.tweet({
      text: tweetText,
      media: {
        media_ids: [mediaId]
      }
    });

    console.log('[Twitter] Success! Tweet ID:', tweet.data.id);

    return res.status(200).json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
      message: 'Video posted to X/Twitter successfully'
    });

  } catch (error) {
    console.error('[Twitter] Error:', error.message);
    console.error('[Twitter] Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
