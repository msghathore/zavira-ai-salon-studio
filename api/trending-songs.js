// Cache for trending songs - refresh every 24 hours
let cachedTracks = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Return cached tracks if still fresh
    if (cachedTracks.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log('[TrendingSongs] Returning cached tracks, age:', Date.now() - cacheTimestamp);
      return res.status(200).json(cachedTracks);
    }

    console.log('[TrendingSongs] Fetching fresh trending tracks from Audius...');

    // Fetch latest trending from Audius
    const response = await fetch('https://discoveryprovider.audius.co/v1/tracks/trending?time=week&limit=20');

    if (!response.ok) {
      console.error('[TrendingSongs] Audius API error:', response.status);
      // Return cached tracks even if stale, or empty array
      return res.status(200).json(cachedTracks.length > 0 ? cachedTracks : []);
    }

    const data = await response.json();

    // Parse and cache the tracks
    cachedTracks = (data.data || []).map((track) => ({
      id: track.id || '',
      title: track.title || 'Unknown',
      artist: track.user?.name || 'Unknown Artist',
      artwork: {
        '150x150': track.artwork?.['150x150'] || '',
        '480x480': track.artwork?.['480x480'] || track.artwork?.['150x150'] || '',
      },
      stream_url: track.stream_url || '',
      duration: track.duration || 0,
      genre: track.genre || 'Unknown',
    })).slice(0, 20); // Limit to 20 tracks

    cacheTimestamp = Date.now();

    console.log('[TrendingSongs] Cached', cachedTracks.length, 'tracks');

    return res.status(200).json(cachedTracks);

  } catch (error) {
    console.error('[TrendingSongs] Error:', error.message);
    // Return cached tracks as fallback
    return res.status(200).json(cachedTracks);
  }
}
