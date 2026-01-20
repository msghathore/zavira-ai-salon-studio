import React, { useState } from 'react';

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
  const [hashtags, setHashtags] = useState('');

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
