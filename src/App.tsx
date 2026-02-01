import React, { useState, useEffect, useRef } from 'react';
import { getTrendingTracks, AudiusTrack } from './lib/audius';
import { generatePlatformCaptions, PlatformCaptions, ServiceType, isQuotaExhausted } from './lib/captionGenerator';
import { createVideoFromImageAndAudio, initFFmpeg } from './lib/videoCreator';
import { supabase, getUserId, isSupabaseConfigured, createPostedContent, updatePostedStatus } from './lib/supabase';

// Environment variables
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL || '';
const PABBLY_WEBHOOK_URL = import.meta.env.VITE_PABBLY_WEBHOOK_URL || '';
const TWITTER_API_URL = import.meta.env.VITE_TWITTER_API_URL || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

type Platform = 'instagram' | 'facebook' | 'gmb' | 'twitter' | 'tiktok';

interface PostStatus {
  platform: Platform;
  status: 'pending' | 'posting' | 'success' | 'error';
  message?: string;
}

export default function App() {
  // State
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<AudiusTrack | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [captions, setCaptions] = useState<PlatformCaptions | null>(null);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('hair');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStage, setVideoStage] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [postStatuses, setPostStatuses] = useState<PostStatus[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [videoDuration, setVideoDuration] = useState(15);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = getUserId();

  // Load trending tracks on mount
  useEffect(() => {
    const loadTracks = async () => {
      setLoadingTracks(true);
      try {
        const response = await fetch('/api/trending-songs');
        if (response.ok) {
          const data = await response.json();
          setTracks(data.slice(0, 10));
          if (data.length > 0) {
            setSelectedTrack(data[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setLoadingTracks(false);
      }
    };
    loadTracks();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedPhoto(event.target?.result as string);
      setVideoUrl(null);
      setVideoBlob(null);
      setCaptions(null);
    };
    reader.readAsDataURL(file);
  };

  // Play/pause track
  const handlePlayPause = (track: AudiusTrack) => {
    if (playingTrackId === track.id) {
      audio?.pause();
      setPlayingTrackId(null);
      return;
    }

    audio?.pause();

    if (track.stream_url) {
      const newAudio = new Audio(track.stream_url);
      newAudio.crossOrigin = 'anonymous';
      newAudio.play().catch(console.error);
      setAudio(newAudio);
      setPlayingTrackId(track.id);
      newAudio.addEventListener('ended', () => setPlayingTrackId(null));
    }
  };

  // Generate captions for all platforms
  const handleGenerateCaptions = async () => {
    if (!uploadedPhoto) return;

    setLoadingCaptions(true);
    try {
      const result = await generatePlatformCaptions(uploadedPhoto, GEMINI_API_KEY, serviceType);
      setCaptions(result);
    } catch (error) {
      console.error('Failed to generate captions:', error);
    } finally {
      setLoadingCaptions(false);
    }
  };

  // Create video from photo + music
  const handleCreateVideo = async () => {
    if (!uploadedPhoto || !selectedTrack) return;

    setCreatingVideo(true);
    setVideoProgress(0);
    setVideoStage('Initializing...');

    try {
      const result = await createVideoFromImageAndAudio(
        {
          imageUrl: uploadedPhoto,
          audioUrl: selectedTrack.stream_url || '',
          duration: videoDuration,
        },
        (progress, stage) => {
          setVideoProgress(progress);
          setVideoStage(stage);
        }
      );

      setVideoUrl(result.videoUrl);
      setVideoBlob(result.videoBlob);

      // Auto-generate captions if not already done
      if (!captions) {
        handleGenerateCaptions();
      }
    } catch (error) {
      console.error('Failed to create video:', error);
      alert('Failed to create video. Please try again.');
    } finally {
      setCreatingVideo(false);
    }
  };

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Post to selected platforms
  const handlePostToAll = async () => {
    if (!videoUrl || !captions || selectedPlatforms.length === 0) return;

    setIsPosting(true);
    setPostStatuses(selectedPlatforms.map(p => ({ platform: p, status: 'pending' })));

    // Upload video to Supabase first
    let publicVideoUrl = videoUrl;
    if (videoBlob && isSupabaseConfigured()) {
      try {
        const timestamp = Date.now();
        const filename = `${userId}/${timestamp}-video.mp4`;
        const { error } = await supabase.storage
          .from('videos')
          .upload(filename, videoBlob, { contentType: 'video/mp4' });

        if (!error) {
          const { data } = supabase.storage.from('videos').getPublicUrl(filename);
          publicVideoUrl = data.publicUrl;
        }
      } catch (e) {
        console.error('Failed to upload video:', e);
      }
    }

    // Post to each platform
    for (const platform of selectedPlatforms) {
      setPostStatuses(prev =>
        prev.map(s => s.platform === platform ? { ...s, status: 'posting' } : s)
      );

      try {
        const caption = captions[platform];
        let webhookUrl = '';

        if (platform === 'instagram' || platform === 'facebook') {
          webhookUrl = MAKE_WEBHOOK_URL;
        } else if (platform === 'gmb') {
          webhookUrl = PABBLY_WEBHOOK_URL;
        } else if (platform === 'twitter') {
          webhookUrl = TWITTER_API_URL;
        }

        if (webhookUrl) {
          const payload = {
            videoUrl: publicVideoUrl,
            caption: caption.caption,
            hashtags: caption.hashtags,
            platform,
            timestamp: new Date().toISOString(),
          };

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            setPostStatuses(prev =>
              prev.map(s => s.platform === platform ? { ...s, status: 'success' } : s)
            );
          } else {
            throw new Error('Post failed');
          }
        } else {
          setPostStatuses(prev =>
            prev.map(s => s.platform === platform ? { ...s, status: 'error', message: 'No webhook configured' } : s)
          );
        }
      } catch (error) {
        setPostStatuses(prev =>
          prev.map(s => s.platform === platform ? { ...s, status: 'error', message: String(error) } : s)
        );
      }
    }

    setIsPosting(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const platformInfo = {
    instagram: { name: 'Instagram', icon: 'IG' },
    facebook: { name: 'Facebook', icon: 'FB' },
    gmb: { name: 'Google Business', icon: 'GB' },
    twitter: { name: 'X/Twitter', icon: 'X' },
    tiktok: { name: 'TikTok', icon: 'TT' },
  };

  const serviceTypes: { id: ServiceType; label: string }[] = [
    { id: 'hair', label: 'Hair' },
    { id: 'nail', label: 'Nails' },
    { id: 'tattoo', label: 'Tattoo' },
    { id: 'massage', label: 'Massage' },
    { id: 'facial', label: 'Facial' },
    { id: 'glow', label: 'General' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>ZAVIRA SALON STUDIO</h1>
        <p style={styles.subtitle}>Create and post videos to social media</p>
      </header>

      <main style={styles.main}>
        {/* Step 1: Upload Photo */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Upload Photo</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />

          {!uploadedPhoto ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadButton}
            >
              + Select Photo
            </button>
          ) : (
            <div style={styles.photoPreview}>
              <img src={uploadedPhoto} alt="Uploaded" style={styles.previewImage} />
              <button
                onClick={() => {
                  setUploadedPhoto(null);
                  setPhotoFile(null);
                  setVideoUrl(null);
                  setVideoBlob(null);
                  setCaptions(null);
                }}
                style={styles.changeButton}
              >
                Change Photo
              </button>
            </div>
          )}
        </section>

        {/* Step 2: Select Service Type */}
        {uploadedPhoto && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Select Service Type</h2>
            <div style={styles.serviceGrid}>
              {serviceTypes.map(st => (
                <button
                  key={st.id}
                  onClick={() => {
                    setServiceType(st.id);
                    setCaptions(null);
                  }}
                  style={{
                    ...styles.serviceButton,
                    ...(serviceType === st.id ? styles.serviceButtonActive : {}),
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Select Music */}
        {uploadedPhoto && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Select Music (Copyright-Free)</h2>
            <p style={styles.hint}>All tracks from Audius are licensed for social media use</p>

            {loadingTracks ? (
              <p style={styles.loading}>Loading tracks...</p>
            ) : (
              <div style={styles.trackList}>
                {tracks.map(track => (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    style={{
                      ...styles.trackItem,
                      ...(selectedTrack?.id === track.id ? styles.trackItemSelected : {}),
                    }}
                  >
                    <img
                      src={track.artwork?.['150x150'] || ''}
                      alt=""
                      style={styles.trackArtwork}
                    />
                    <div style={styles.trackInfo}>
                      <p style={styles.trackTitle}>{track.title}</p>
                      <p style={styles.trackArtist}>{track.artist}</p>
                    </div>
                    <span style={styles.trackDuration}>{formatDuration(track.duration)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(track);
                      }}
                      style={styles.playButton}
                    >
                      {playingTrackId === track.id ? '||' : '▶'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video Duration */}
            <div style={styles.durationPicker}>
              <label style={styles.label}>Video Duration:</label>
              <div style={styles.durationButtons}>
                {[10, 15, 20, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setVideoDuration(d)}
                    style={{
                      ...styles.durationButton,
                      ...(videoDuration === d ? styles.durationButtonActive : {}),
                    }}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 4: Create Video */}
        {uploadedPhoto && selectedTrack && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>4. Create Video</h2>

            {!videoUrl ? (
              <div>
                <button
                  onClick={handleCreateVideo}
                  disabled={creatingVideo}
                  style={{
                    ...styles.primaryButton,
                    ...(creatingVideo ? styles.buttonDisabled : {}),
                  }}
                >
                  {creatingVideo ? 'Creating...' : 'Create Video'}
                </button>

                {creatingVideo && (
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${videoProgress}%` }} />
                    </div>
                    <p style={styles.progressText}>{videoStage} ({videoProgress}%)</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.videoPreview}>
                <video
                  src={videoUrl}
                  controls
                  style={styles.video}
                />
                <button
                  onClick={() => {
                    setVideoUrl(null);
                    setVideoBlob(null);
                  }}
                  style={styles.changeButton}
                >
                  Recreate Video
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 5: Captions */}
        {videoUrl && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>5. Captions (Auto-Generated)</h2>

            {!captions ? (
              <button
                onClick={handleGenerateCaptions}
                disabled={loadingCaptions}
                style={{
                  ...styles.secondaryButton,
                  ...(loadingCaptions ? styles.buttonDisabled : {}),
                }}
              >
                {loadingCaptions ? 'Generating...' : 'Generate Captions'}
              </button>
            ) : (
              <div style={styles.captionsGrid}>
                {(Object.keys(platformInfo) as Platform[]).map(platform => (
                  <div key={platform} style={styles.captionCard}>
                    <h4 style={styles.captionPlatform}>{platformInfo[platform].name}</h4>
                    <p style={styles.captionText}>{captions[platform].caption}</p>
                    <p style={styles.captionHashtags}>{captions[platform].hashtags}</p>
                  </div>
                ))}
              </div>
            )}

            {isQuotaExhausted() && (
              <p style={styles.quotaWarning}>Using default captions (API quota reached)</p>
            )}
          </section>
        )}

        {/* Step 6: Post */}
        {videoUrl && captions && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>6. Select Platforms & Post</h2>

            <div style={styles.platformGrid}>
              {(Object.keys(platformInfo) as Platform[]).map(platform => {
                const status = postStatuses.find(s => s.platform === platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    style={{
                      ...styles.platformButton,
                      ...(selectedPlatforms.includes(platform) ? styles.platformButtonSelected : {}),
                      ...(status?.status === 'success' ? styles.platformButtonSuccess : {}),
                      ...(status?.status === 'error' ? styles.platformButtonError : {}),
                    }}
                    disabled={isPosting}
                  >
                    <span style={styles.platformIcon}>{platformInfo[platform].icon}</span>
                    <span style={styles.platformName}>{platformInfo[platform].name}</span>
                    {status?.status === 'posting' && <span style={styles.statusDot}>...</span>}
                    {status?.status === 'success' && <span style={styles.statusCheck}>✓</span>}
                    {status?.status === 'error' && <span style={styles.statusX}>✗</span>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handlePostToAll}
              disabled={isPosting || selectedPlatforms.length === 0}
              style={{
                ...styles.postButton,
                ...(isPosting || selectedPlatforms.length === 0 ? styles.buttonDisabled : {}),
              }}
            >
              {isPosting ? 'Posting...' : `Post to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
            </button>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Zavira Salon & Spa Winnipeg</p>
      </footer>
    </div>
  );
}

// Clean white/black styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #E5E5E5',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666666',
    margin: '8px 0 0 0',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  section: {
    marginBottom: '32px',
    padding: '24px',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 16px 0',
  },
  uploadButton: {
    width: '100%',
    padding: '48px',
    border: '2px dashed #CCCCCC',
    borderRadius: '8px',
    backgroundColor: '#FAFAFA',
    color: '#666666',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  photoPreview: {
    textAlign: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  changeButton: {
    padding: '8px 16px',
    border: '1px solid #000000',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#000000',
    fontSize: '14px',
    cursor: 'pointer',
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  serviceButton: {
    padding: '12px',
    border: '1px solid #E5E5E5',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  serviceButtonActive: {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    borderColor: '#000000',
  },
  hint: {
    fontSize: '13px',
    color: '#888888',
    marginBottom: '12px',
  },
  loading: {
    color: '#888888',
    textAlign: 'center',
    padding: '24px',
  },
  trackList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
  },
  trackItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #E5E5E5',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  trackItemSelected: {
    backgroundColor: '#F5F5F5',
  },
  trackArtwork: {
    width: '48px',
    height: '48px',
    borderRadius: '4px',
    objectFit: 'cover',
    marginRight: '12px',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trackArtist: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#888888',
  },
  trackDuration: {
    fontSize: '12px',
    color: '#888888',
    marginRight: '12px',
  },
  playButton: {
    width: '36px',
    height: '36px',
    border: '1px solid #000000',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: '#000000',
    fontSize: '12px',
    cursor: 'pointer',
  },
  durationPicker: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
  },
  durationButtons: {
    display: 'flex',
    gap: '8px',
  },
  durationButton: {
    padding: '8px 16px',
    border: '1px solid #E5E5E5',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: '14px',
    cursor: 'pointer',
  },
  durationButtonActive: {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    borderColor: '#000000',
  },
  primaryButton: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#000000',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    border: '1px solid #000000',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#000000',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  progressContainer: {
    marginTop: '16px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E5E5E5',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '13px',
    color: '#888888',
    marginTop: '8px',
    textAlign: 'center',
  },
  videoPreview: {
    textAlign: 'center',
  },
  video: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  captionsGrid: {
    display: 'grid',
    gap: '12px',
  },
  captionCard: {
    padding: '16px',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
  },
  captionPlatform: {
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  captionText: {
    fontSize: '14px',
    margin: '0 0 8px 0',
    lineHeight: 1.5,
  },
  captionHashtags: {
    fontSize: '12px',
    color: '#666666',
    margin: 0,
    wordBreak: 'break-word',
  },
  quotaWarning: {
    fontSize: '13px',
    color: '#CC7700',
    marginTop: '12px',
    textAlign: 'center',
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  platformButton: {
    padding: '12px 8px',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  platformButtonSelected: {
    borderColor: '#000000',
    backgroundColor: '#F5F5F5',
  },
  platformButtonSuccess: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  platformButtonError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  platformIcon: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  platformName: {
    display: 'block',
    fontSize: '11px',
    color: '#666666',
  },
  statusDot: {
    display: 'block',
    fontSize: '12px',
    color: '#888888',
  },
  statusCheck: {
    display: 'block',
    fontSize: '14px',
    color: '#22C55E',
  },
  statusX: {
    display: 'block',
    fontSize: '14px',
    color: '#EF4444',
  },
  postButton: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#000000',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    padding: '24px',
    borderTop: '1px solid #E5E5E5',
    textAlign: 'center',
    fontSize: '13px',
    color: '#888888',
  },
};
