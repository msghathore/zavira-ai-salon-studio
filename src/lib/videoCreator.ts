import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

export interface VideoCreationOptions {
  imageUrl: string;
  audioUrl: string;
  duration?: number; // seconds, default 15
  outputFormat?: 'mp4' | 'webm';
}

export interface VideoCreationResult {
  videoUrl: string;
  videoBlob: Blob;
  duration: number;
}

// Initialize FFmpeg (call once)
export async function initFFmpeg(onProgress?: (progress: number) => void): Promise<void> {
  if (isLoaded && ffmpeg) return;

  ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) {
      onProgress(Math.round(progress * 100));
    }
  });

  // Load FFmpeg core from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isLoaded = true;
}

// Convert data URL to Uint8Array
function dataURLToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Create video from image + audio
export async function createVideoFromImageAndAudio(
  options: VideoCreationOptions,
  onProgress?: (progress: number, stage: string) => void
): Promise<VideoCreationResult> {
  if (!ffmpeg || !isLoaded) {
    onProgress?.(0, 'Loading FFmpeg...');
    await initFFmpeg((p) => onProgress?.(p * 0.2, 'Loading FFmpeg...'));
  }

  const duration = options.duration || 15;
  const outputFormat = options.outputFormat || 'mp4';

  try {
    onProgress?.(20, 'Fetching image...');

    // Fetch and write image to FFmpeg filesystem
    let imageData: Uint8Array;
    if (options.imageUrl.startsWith('data:')) {
      imageData = dataURLToUint8Array(options.imageUrl);
    } else {
      imageData = await fetchFile(options.imageUrl);
    }
    await ffmpeg!.writeFile('input.jpg', imageData);

    onProgress?.(40, 'Fetching audio...');

    // Fetch and write audio to FFmpeg filesystem
    let audioData: Uint8Array;
    if (options.audioUrl.startsWith('data:')) {
      audioData = dataURLToUint8Array(options.audioUrl);
    } else {
      // For Audius URLs, we need to handle CORS
      try {
        audioData = await fetchFile(options.audioUrl);
      } catch (e) {
        // If CORS fails, create silent audio
        console.warn('Could not fetch audio, creating video without sound');
        // Create a silent video instead
        onProgress?.(60, 'Creating video (no audio)...');
        await ffmpeg!.exec([
          '-loop', '1',
          '-i', 'input.jpg',
          '-c:v', 'libx264',
          '-t', duration.toString(),
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
          '-r', '30',
          `output.${outputFormat}`
        ]);

        onProgress?.(90, 'Finalizing...');
        const data = await ffmpeg!.readFile(`output.${outputFormat}`);
        const videoBlob = new Blob([data as unknown as BlobPart], { type: `video/${outputFormat}` });
        const videoUrl = URL.createObjectURL(videoBlob);

        // Cleanup
        await ffmpeg!.deleteFile('input.jpg');
        await ffmpeg!.deleteFile(`output.${outputFormat}`);

        onProgress?.(100, 'Complete!');
        return { videoUrl, videoBlob, duration };
      }
    }
    await ffmpeg!.writeFile('input.mp3', audioData);

    onProgress?.(60, 'Creating video...');

    // Create video: static image + audio, scaled for social media (9:16 vertical)
    await ffmpeg!.exec([
      '-loop', '1',
      '-i', 'input.jpg',
      '-i', 'input.mp3',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', duration.toString(),
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
      '-r', '30',
      '-shortest',
      `output.${outputFormat}`
    ]);

    onProgress?.(90, 'Finalizing...');

    // Read output video
    const data = await ffmpeg!.readFile(`output.${outputFormat}`);
    const videoBlob = new Blob([data as unknown as BlobPart], { type: `video/${outputFormat}` });
    const videoUrl = URL.createObjectURL(videoBlob);

    // Cleanup FFmpeg filesystem
    await ffmpeg!.deleteFile('input.jpg');
    await ffmpeg!.deleteFile('input.mp3');
    await ffmpeg!.deleteFile(`output.${outputFormat}`);

    onProgress?.(100, 'Complete!');

    return {
      videoUrl,
      videoBlob,
      duration,
    };
  } catch (error) {
    console.error('Video creation error:', error);
    throw new Error(`Failed to create video: ${error}`);
  }
}

// Upload video blob to Supabase and get public URL
export async function uploadVideoToSupabase(
  videoBlob: Blob,
  supabase: any,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${userId}/${timestamp}-video.mp4`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(filename, videoBlob, {
      contentType: 'video/mp4',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(filename);

  return publicUrl;
}
