import React, { useState, useEffect } from 'react';
import { getTrendingTracks, AudiusTrack } from '../lib/audius';

export default function TrendingPanel() {
  const [trending] = useState({
    music: '',
    hashtags: '#ZaviraSalon #WinnipegSalon #HairInspo #SalonVibes #BookNow',
  });
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<AudiusTrack | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/trending-songs');
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        const trendingTracks = await response.json();
        setTracks(trendingTracks);

        if (trendingTracks.length > 0 && !selectedTrack) {
          setSelectedTrack(trendingTracks[0]);
        }
      } catch (error) {
        console.error('[TrendingPanel] Error fetching tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const handlePlayPause = (track: AudiusTrack) => {
    if (playingTrackId === track.id) {
      if (audio) {
        audio.pause();
        setPlayingTrackId(null);
      }
    } else {
      if (audio) {
        audio.pause();
      }
      
      if (track.stream_url) {
        console.log('[TrendingPanel] Playing track:', track.title, 'URL:', track.stream_url);
        const newAudio = new Audio(track.stream_url);
        newAudio.crossOrigin = 'anonymous';
        newAudio.play().catch((error) => {
          console.error('[TrendingPanel] Playback failed:', error.message);
        });
        setAudio(newAudio);
        setPlayingTrackId(track.id);

        newAudio.addEventListener('ended', () => {
          setPlayingTrackId(null);
        });
      } else {
        console.warn('[TrendingPanel] No stream URL for track:', track.title);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Music</h2>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading trending tracks...
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No trending tracks available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track)}
                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  selectedTrack?.id === track.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500 ring-opacity-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-3 p-3">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <img
                      src={track.artwork['480x480'] || track.artwork['150x150']}
                      alt={track.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(track);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-60 transition-all"
                    >
                      {playingTrackId === track.id ? (
                        <span className="text-white text-xl">⏸</span>
                      ) : (
                        <span className="text-white text-xl">▶</span>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {track.title}
                    </h3>
                    <p className="text-gray-600 text-sm truncate">
                      {track.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatDuration(track.duration)}</span>
                      {track.genre && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          {track.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTrack && (
          <div className="mt-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Selected Track</h4>
            <p className="text-sm text-gray-700 font-medium">{selectedTrack.title}</p>
            <p className="text-sm text-gray-600 mb-2">{selectedTrack.artist}</p>
            <div className="text-xs text-gray-500 break-all">
              Stream URL: {selectedTrack.stream_url}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trending Hashtags
          </label>
          <textarea
            defaultValue={trending.hashtags}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900"
            rows={4}
          />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <strong>Trending Music from Audius:</strong>
          <p className="mt-2">
            Browse trending tracks above. Click play to preview, select a track to use it with your posts.
            Music will be automatically included when you review content for posting.
          </p>
        </div>
      </div>
    </div>
  );
}
