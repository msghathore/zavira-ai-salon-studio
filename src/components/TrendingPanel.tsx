import React, { useState } from 'react';

export default function TrendingPanel() {
  const [trending] = useState({
    music: '',
    hashtags: '#ZaviraSalon #WinnipegSalon #HairInspo #SalonVibes #BookNow',
  });

  return (
    <div className="p-6 bg-white border-2 border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Data</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trending Music Link
          </label>
          <input
            type="url"
            placeholder="Paste TikTok sound link..."
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900"
          />
        </div>

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
          <strong>How to Get Trending Music (5 min/day):</strong>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Open TikTok app</li>
            <li>Go to Discover &gt; Sound Tracker</li>
            <li>Copy link from trending sound</li>
            <li>Paste link above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
