import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// X/Twitter API credentials from environment variables
const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY || 'emRSMVh0OGFZR09rQUdfbHdvNDI6MTpjaQ';
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET || 'xjpRxhMHu0KVv8fXRIQwm8nuLrThiL6nJX8QEZeCZfKJaqC4nJ';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '1991972613456097281-m6rYKHcB9tLkLTKT1OJj5dKjqbUPX3';
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || 'e25MZ3GOCsISVRYHCRRxYMgMgFptSaAzCZclsXpwP9snA';

// Initialize OAuth 1.0a
const oauth = OAuth({
  consumer: {
    key: TWITTER_CONSUMER_KEY,
    secret: TWITTER_CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const token = {
  key: TWITTER_ACCESS_TOKEN,
  secret: TWITTER_ACCESS_TOKEN_SECRET
};

// Helper function to make OAuth-signed requests
async function makeOAuthRequest(url, method, body = null, isFormData = false) {
  const request_data = {
    url,
    method
  };

  const headers = oauth.toHeader(oauth.authorize(request_data, token));

  const fetchOptions = {
    method,
    headers: {
      ...headers,
    }
  };

  if (body) {
    if (isFormData) {
      // For multipart form data, don't set Content-Type (fetch will set it with boundary)
      fetchOptions.body = body;
    } else if (typeof body === 'string') {
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOptions.body = body;
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, fetchOptions);
  return response;
}

// Step 1: INIT - Initialize chunked upload
async function initUpload(totalBytes, mimeType) {
  console.log('[Twitter] INIT: Starting upload for', totalBytes, 'bytes');

  const params = new URLSearchParams({
    command: 'INIT',
    media_type: mimeType,
    media_category: 'tweet_video',
    total_bytes: totalBytes.toString()
  });

  const response = await makeOAuthRequest(
    'https://upload.twitter.com/1.1/media/upload.json',
    'POST',
    params.toString()
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Twitter] INIT failed:', response.status, error);
    throw new Error(`INIT failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[Twitter] INIT success, media_id:', data.media_id_string);
  return data.media_id_string;
}

// Step 2: APPEND - Upload video chunks
async function appendChunk(mediaId, chunk, segmentIndex) {
  console.log('[Twitter] APPEND: Uploading segment', segmentIndex, 'size:', chunk.length);

  const formData = new FormData();
  formData.append('command', 'APPEND');
  formData.append('media_id', mediaId);
  formData.append('segment_index', segmentIndex.toString());
  formData.append('media', new Blob([chunk]), 'video.mp4');

  const response = await makeOAuthRequest(
    'https://upload.twitter.com/1.1/media/upload.json',
    'POST',
    formData,
    true
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Twitter] APPEND failed:', response.status, error);
    throw new Error(`APPEND failed: ${response.status} - ${error}`);
  }

  console.log('[Twitter] APPEND success for segment', segmentIndex);
  return true;
}

// Step 3: FINALIZE - Complete the upload
async function finalizeUpload(mediaId) {
  console.log('[Twitter] FINALIZE: Completing upload for media_id:', mediaId);

  const params = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId
  });

  const response = await makeOAuthRequest(
    'https://upload.twitter.com/1.1/media/upload.json',
    'POST',
    params.toString()
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Twitter] FINALIZE failed:', response.status, error);
    throw new Error(`FINALIZE failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[Twitter] FINALIZE success:', JSON.stringify(data));

  // Check if processing is needed
  if (data.processing_info) {
    return { mediaId, processingInfo: data.processing_info };
  }

  return { mediaId, processingInfo: null };
}

// Step 3.5: STATUS - Check processing status (for videos)
async function checkStatus(mediaId) {
  console.log('[Twitter] STATUS: Checking processing for media_id:', mediaId);

  const params = new URLSearchParams({
    command: 'STATUS',
    media_id: mediaId
  });

  const response = await makeOAuthRequest(
    `https://upload.twitter.com/1.1/media/upload.json?${params.toString()}`,
    'GET'
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Twitter] STATUS failed:', response.status, error);
    throw new Error(`STATUS failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[Twitter] STATUS:', JSON.stringify(data.processing_info));
  return data.processing_info;
}

// Wait for video processing to complete
async function waitForProcessing(mediaId, maxWaitTime = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkStatus(mediaId);

    if (!status) {
      console.log('[Twitter] Processing complete (no status returned)');
      return true;
    }

    if (status.state === 'succeeded') {
      console.log('[Twitter] Processing succeeded');
      return true;
    }

    if (status.state === 'failed') {
      console.error('[Twitter] Processing failed:', status.error);
      throw new Error(`Video processing failed: ${status.error?.message || 'Unknown error'}`);
    }

    // Wait before checking again
    const waitTime = (status.check_after_secs || 5) * 1000;
    console.log('[Twitter] Processing in progress, waiting', waitTime, 'ms');
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  throw new Error('Video processing timed out');
}

// Step 4: POST TWEET - Create tweet with video
async function postTweet(text, mediaId) {
  console.log('[Twitter] POST: Creating tweet with media_id:', mediaId);

  const tweetData = {
    text: text,
    media: {
      media_ids: [mediaId]
    }
  };

  const response = await makeOAuthRequest(
    'https://api.twitter.com/2/tweets',
    'POST',
    tweetData
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Twitter] POST tweet failed:', response.status, error);
    throw new Error(`POST tweet failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[Twitter] Tweet posted successfully:', data.data?.id);
  return data;
}

// Main handler
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
    const { videoUrl, caption, hashtags } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    console.log('[Twitter] Starting post to X/Twitter');
    console.log('[Twitter] Video URL:', videoUrl);
    console.log('[Twitter] Caption:', caption);
    console.log('[Twitter] Hashtags:', hashtags);

    // Step 1: Download video from URL
    console.log('[Twitter] Downloading video...');
    const videoResponse = await fetch(videoUrl);

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const mimeType = videoResponse.headers.get('content-type') || 'video/mp4';

    console.log('[Twitter] Video downloaded, size:', videoBuffer.length, 'bytes, type:', mimeType);

    // Step 2: INIT upload
    const mediaId = await initUpload(videoBuffer.length, mimeType);

    // Step 3: APPEND chunks (1MB chunks for reliability)
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    let segmentIndex = 0;

    for (let offset = 0; offset < videoBuffer.length; offset += CHUNK_SIZE) {
      const chunk = videoBuffer.slice(offset, offset + CHUNK_SIZE);
      await appendChunk(mediaId, chunk, segmentIndex);
      segmentIndex++;
    }

    // Step 4: FINALIZE upload
    const { processingInfo } = await finalizeUpload(mediaId);

    // Step 5: Wait for processing if needed
    if (processingInfo) {
      await waitForProcessing(mediaId);
    }

    // Step 6: POST tweet
    const tweetText = `${caption || ''} ${hashtags || ''}`.trim();
    const result = await postTweet(tweetText, mediaId);

    console.log('[Twitter] Success! Tweet ID:', result.data?.id);

    return res.status(200).json({
      success: true,
      tweetId: result.data?.id,
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
