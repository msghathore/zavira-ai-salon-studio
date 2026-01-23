import React, { useState, useEffect } from 'react';
import { getTrendingTracks, AudiusTrack } from '../lib/audius';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  serviceType: string;
  client: string;
  selected: boolean;
}

export default function ReviewPanel() {
  const [reviewing, setReviewing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#ZaviraSalon #Winnipeg #HairSalon #HairInspo #SalonVibes');
  const [trendingTrack, setTrendingTrack] = useState<AudiusTrack | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchTrendingTrack = async () => {
      setLoadingTrack(true);
      try {
        const response = await fetch('/api/trending-songs');
        if (!response.ok) throw new Error('Failed to fetch trending songs');
        const tracks = await response.json();
        if (tracks.length > 0) {
          setTrendingTrack(tracks[0]);
        }
      } catch (error) {
        console.error('[ReviewPanel] Error fetching trending track:', error);
      } finally {
        setLoadingTrack(false);
      }
    };

    fetchTrendingTrack();
  }, []);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const handlePlayPause = () => {
    if (!trendingTrack) return;

    if (playingTrackId === trendingTrack.id) {
      if (audio) {
        audio.pause();
        setPlayingTrackId(null);
      }
    } else {
      if (audio) {
        audio.pause();
      }

      if (trendingTrack.stream_url) {
        console.log('[ReviewPanel] Playing track:', trendingTrack.title, 'URL:', trendingTrack.stream_url);
        const newAudio = new Audio(trendingTrack.stream_url);
        newAudio.crossOrigin = 'anonymous';
        newAudio.play().catch((error) => {
          console.error('[ReviewPanel] Playback failed:', error.message);
        });
        setAudio(newAudio);
        setPlayingTrackId(trendingTrack.id);

        newAudio.addEventListener('ended', () => {
          setPlayingTrackId(null);
        });
      } else {
        console.warn('[ReviewPanel] No stream URL for track:', trendingTrack?.title);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleApprove = () => {
    setReviewing(true);
  };

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Review &amp; Approve</h2>

      {!selectedImage && (
        <div className="text-center py-12 text-gray-500">
          Select an image from the grid first
        </div>
      )}

      {selectedImage && (
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            {selectedImage.url ? (
              <img src={selectedImage.url} alt={selectedImage.prompt} className="w-full h-full object-contain" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-400">Loading image...</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Edit auto-generated caption..."
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900"
              rows={4}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {caption.length}/200 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hashtags (comma-separated)
            </label>
            <textarea
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#ZaviraSalon #HairInspo"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trending Music
            </label>
            {loadingTrack ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-gray-200">
                Loading trending music...
              </div>
            ) : trendingTrack ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img
                      src={trendingTrack.artwork['480x480'] || trendingTrack.artwork['150x150']}
                      alt={trendingTrack.title}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      onClick={handlePlayPause}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-60 transition-all"
                    >
                      {playingTrackId === trendingTrack.id ? (
                        <span className="text-white text-2xl">⏸</span>
                      ) : (
                        <span className="text-white text-2xl">▶</span>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {trendingTrack.title}
                    </h3>
                    <p className="text-gray-600 truncate">{trendingTrack.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatDuration(trendingTrack.duration)}</span>
                      {trendingTrack.genre && (
                        <span className="text-xs px-2 py-0.5 bg-white text-gray-700 rounded-full">
                          {trendingTrack.genre}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      Automatically included in post
                    </p>
                  </div>
                </div>
                <input type="hidden" value={trendingTrack.stream_url || ''} name="musicUrl" />
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-gray-200">
                No trending music available
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleApprove}
              disabled={reviewing}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-400"
            >
              {reviewing ? 'Approving...' : 'Approve for Posting'}
            </button>

            <button
              onClick={() => setSelectedImage(null)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300"
            >
              Back to Grid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
