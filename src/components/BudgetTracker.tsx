import React, { useState, useEffect, useCallback } from 'react';

interface UsageStats {
  totalImagesGenerated: number;
  totalCost: number;
  dailyImages: Record<string, number>;
  dailyCost: Record<string, number>;
  lastUpdated: string;
}

const COST_PER_IMAGE = 0.05;
const STORAGE_KEY = 'zavira_usage_stats';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadStats(): UsageStats {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return createEmptyStats();
    }
  }
  return createEmptyStats();
}

function createEmptyStats(): UsageStats {
  const today = getTodayKey();
  return {
    totalImagesGenerated: 0,
    totalCost: 0,
    dailyImages: { [today]: 0 },
    dailyCost: { [today]: 0 },
    lastUpdated: new Date().toISOString(),
  };
}

function saveStats(stats: UsageStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function trackImageGeneration(count: number = 1): UsageStats {
  const stats = loadStats();
  const today = getTodayKey();

  stats.totalImagesGenerated += count;
  stats.totalCost += count * COST_PER_IMAGE;
  stats.dailyImages[today] = (stats.dailyImages[today] || 0) + count;
  stats.dailyCost[today] = (stats.dailyCost[today] || 0) + (count * COST_PER_IMAGE);
  stats.lastUpdated = new Date().toISOString();

  saveStats(stats);
  return stats;
}

export function getUsageStats(): UsageStats {
  return loadStats();
}

export function resetDailyStats(): UsageStats {
  const stats = loadStats();
  const today = getTodayKey();
  stats.dailyImages[today] = 0;
  stats.dailyCost[today] = 0;
  stats.lastUpdated = new Date().toISOString();
  saveStats(stats);
  return stats;
}

export default function BudgetTracker() {
  const [stats, setStats] = useState<UsageStats>(createEmptyStats);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const today = getTodayKey();
  const todayImages = stats.dailyImages[today] || 0;
  const todayCost = stats.dailyCost[today] || 0;
  const remainingBudget = 5.00 - todayCost;

  return (
    <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Usage Tracker</h2>
          <span className={`text-gray-400 text-sm ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Today</div>
            <div className="text-2xl font-bold text-emerald-400">{todayImages}</div>
            <div className="text-gray-500 text-xs">images</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Today Spent</div>
            <div className="text-2xl font-bold text-rose-400">${todayCost.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">of $5.00</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Budget Remaining</span>
            <span className={remainingBudget < 1 ? 'text-rose-400' : 'text-emerald-400'}>
              ${remainingBudget.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${remainingBudget < 1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min((remainingBudget / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total Images</div>
              <div className="text-white font-semibold">{stats.totalImagesGenerated}</div>
            </div>
            <div>
              <div className="text-gray-400">Total Spent</div>
              <div className="text-white font-semibold">${stats.totalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Avg per Image</div>
              <div className="text-white font-semibold">${COST_PER_IMAGE.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Last Updated</div>
              <div className="text-white font-semibold text-xs">
                {new Date(stats.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setStats(resetDailyStats());
            }}
            className="mt-4 w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Reset Today's Stats
          </button>
        </div>
      )}
    </div>
  );
}
