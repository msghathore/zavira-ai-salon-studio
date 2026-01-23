export interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  artwork: {
    '150x150': string;
    '480x480': string;
    '1000x1000': string;
  };
  stream_url?: string;
  duration: number;
  genre: string;
}

async function getAudiusHost(): Promise<string> {
  // Use hardcoded fallback - Audius API endpoint detection is unreliable
  return 'https://discoveryprovider.audius.co';
}

export async function getTrendingTracks(timeRange: 'week' | 'month' | 'allTime' = 'week', limit: number = 10): Promise<AudiusTrack[]> {
  try {
    const host = await getAudiusHost();
    const url = `${host}/v1/tracks/trending?time=${timeRange}&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Audius API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.data?.map((track: any) => ({
      id: track.id || '',
      title: track.title || 'Unknown Track',
      artist: track.user?.name || 'Unknown Artist',
      artwork: {
        '150x150': track.artwork?.['150x150'] || '',
        '480x480': track.artwork?.['480x480'] || track.artwork?.['150x150'] || '',
        '1000x1000': track.artwork?.['1000x1000'] || track.artwork?.['480x480'] || '',
      },
      stream_url: track.stream_url || '',
      duration: track.duration || 0,
      genre: track.genre || 'Unknown',
    })) || [];
    
  } catch (error) {
    console.error('Error fetching trending tracks:', error);
    return [];
  }
}

export async function getTrackStreamUrl(trackId: string): Promise<string | null> {
  try {
    const host = await getAudiusHost();
    const url = `${host}/v1/tracks/${trackId}/stream`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'audio/mpeg',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Stream error: ${response.status}`);
    }
    
    return response.url || url;
    
  } catch (error) {
    console.error('Error getting stream URL:', error);
    return null;
  }
}
