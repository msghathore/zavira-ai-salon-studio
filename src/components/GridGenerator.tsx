import React, { useState } from 'react';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  serviceType: string;
  client: string;
  selected: boolean;
}

export default function GridGenerator() {
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = () => {
    setImages([]);
    setTimeout(() => {
      const newImages: GeneratedImage[] = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          newImages.push({
            id: `cell-${row}-${col}`,
            url: '',
            prompt: `Row ${row + 1}, Col ${col + 1}`,
            serviceType: 'hair',
            client: 'Female 30s Long Hair',
            selected: false,
          });
        }
      }
      setImages(newImages);
    }, 1000);
  };

  const selectedCount = images.filter((img) => img.selected).length;

  const handleSelect = (id: string) => {
    const updated = images.map((img) =>
      img.id === id ? { ...img, selected: !img.selected } : img
    );
    setImages(updated);
  };

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Generate 4x4 Grid</h2>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleGenerate}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Generate Grid
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        Cost: $0.80 per grid (16 images) • Uses up to 14 reference photos from your salon
      </div>

      <div className={`grid grid-cols-4 gap-3 ${images.length > 0 ? '' : 'opacity-50'}`}>
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => handleSelect(image.id)}
            className={`relative aspect-square border-2 rounded-lg cursor-pointer transition-all ${
              image.selected ? 'border-black ring-2 ring-black' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              {image.url ? (
                <div className="text-white font-bold">
                  {image.selected ? '✓' : 'Loading...'}
                </div>
              ) : (
                <div className="text-white font-bold">
                  {image.id.split('-')[1].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1 bg-white/90 text-xs text-gray-700">
              {image.serviceType}
            </div>
          </div>
        ))}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
          <span>{selectedCount} selected</span>
          <button className="text-gray-900 hover:underline">
            Use Selected
          </button>
        </div>
      )}
    </div>
  );
}
