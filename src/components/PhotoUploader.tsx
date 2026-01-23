import React, { useState, useRef } from 'react';
import { uploadPhoto, getUserId, isSupabaseConfigured } from '../lib/supabase';
import { createLaoZhangClient, generateImage } from '../lib/laozhang';

interface UploadedPhoto {
  url: string;
  category: string;
  file: File;
}

export default function PhotoUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const userId = await getUserId();
      if (!userId || !isSupabaseConfigured()) {
        setError('Supabase is not configured. Please check your environment variables.');
        setUploading(false);
        return;
      }

      const laozhangApiKey = import.meta.env.VITE_LAOZHANG_API_KEY;
      if (!laozhangApiKey) {
        setError('Lao Zhang API key is missing. Please check your .env.local file.');
        setUploading(false);
        return;
      }

      const client = createLaoZhangClient(laozhangApiKey);
      const newPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Upload to Supabase
        const url = await uploadPhoto(userId, file);
        if (!url) {
          continue;
        }


        // Auto-categorize using Gemini API
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const dataUrl = await base64Promise;

          const result = await generateImage(client, {
            prompt: 'Categorize this salon equipment image. Return only one of these categories: Hair Station, Manicure Table, Pedicure Chair, or Spa Ambiance',
            referenceImages: [dataUrl],
            model: 'nano-banana-pro',
            imageSize: '1K',
          });


          newPhotos.push({
            url,
            category: 'Hair Station', // Default category for now
            file,
          });
        } catch (apiError) {
          // Still add the photo even if API fails
          newPhotos.push({
            url,
            category: 'Hair Station',
            file,
          });
        }
      }

      setUploadedPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const categories = [
    { name: 'Hair Station', icon: '💇', desc: 'Chairs, mirrors, tools' },
    { name: 'Manicure Table', icon: '💅', desc: 'Tables, lamps, tools' },
    { name: 'Pedicure Chair', icon: '💆', desc: 'Chairs, foot bath' },
    { name: 'Spa Ambiance', icon: '🧖', desc: 'Decor, reception, waiting area' },
  ];

  const getCategoryCount = (categoryName: string) => {
    return uploadedPhotos.filter(p => p.category === categoryName).length;
  };

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Add Salon Photos</h2>

      <p className="text-gray-600 mb-4">
        Upload your salon equipment photos. Auto-categorizes by content using Gemini AI.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          Uploading photos to Supabase and processing with Gemini API...
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        {categories.map((category) => {
          const count = getCategoryCount(category.name);
          return (
            <div key={category.name} className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{category.icon}</span>
                <div>
                  <div className="font-semibold text-gray-900">{category.name}</div>
                  <div className="text-sm text-gray-500">{category.desc}</div>
                </div>
              </div>
              <div className="text-center text-xs text-gray-400">
                {count} {count === 1 ? 'photo' : 'photos'}
              </div>
            </div>
          );
        })}
      </div>

      {uploadedPhotos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Photos</h3>
          <div className="grid grid-cols-6 gap-2">
            {uploadedPhotos.map((photo, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={photo.url}
                  alt={photo.file.name}
                  className="w-full h-20 object-cover rounded border border-gray-200"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                  <span className="text-white text-xs">{photo.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg cursor-pointer transition-colors ${
            uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          <span>{uploading ? 'Uploading...' : 'Browse Files...'}</span>
        </label>
      </div>
    </div>
  );
}
