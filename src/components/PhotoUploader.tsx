import React, { useState, useRef } from 'react';

export default function PhotoUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    console.log('Files selected');
  };

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Add Salon Photos</h2>

      <p className="text-gray-600 mb-4">
        Drag &amp; drop your salon equipment photos. Auto-categorizes by content.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { name: 'Hair Station', icon: '💇', desc: 'Chairs, mirrors, tools' },
          { name: 'Manicure Table', icon: '💅', desc: 'Tables, lamps, tools' },
          { name: 'Pedicure Chair', icon: '💆', desc: 'Chairs, foot bath' },
          { name: 'Spa Ambiance', icon: '🧖', desc: 'Decor, reception, waiting area' },
        ].map((category) => (
          <div key={category.name} className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{category.icon}</span>
              <div>
                <div className="font-semibold text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-500">{category.desc}</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-400">
              0 photos
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
        >
          <span>Browse Files...</span>
        </label>
      </div>
    </div>
  );
}
