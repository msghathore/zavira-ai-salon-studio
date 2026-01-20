import React, { useState } from 'react';

interface BudgetData {
  dailyBudget: number;
  imagesToday: number;
  postsToday: number;
  imageCost: number;
  remaining: number;
}

export default function BudgetTracker() {
  const [budget] = useState<BudgetData>({
    dailyBudget: 0.50,
    imagesToday: 0,
    postsToday: 0,
    imageCost: 0,
    remaining: 0.50,
  });

  const targetImagesPerDay = 10;
  const targetPostsPerDay = 15;

  return (
    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Budget Tracker</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Today&apos;s Budget</h3>
            <div className="text-3xl font-bold text-black">${budget.dailyBudget.toFixed(2)}</div>
            <div className="text-sm text-gray-500">per day</div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Images Generated:</span>
                <span className="font-semibold text-black">{budget.imagesToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Image Cost:</span>
                <span className="font-semibold text-black">${budget.imageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Posts Scheduled:</span>
                <span className="font-semibold text-black">{budget.postsToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining:</span>
                <span className={`font-semibold ${budget.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {budget.remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Stay within {targetPostsPerDay} posts/day to maintain ${budget.dailyBudget}/day budget.
          </p>
        </div>
      </div>
    </div>
  );
}
