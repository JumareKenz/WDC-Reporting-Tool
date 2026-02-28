import React from 'react';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Data Freshness Indicator
 * 
 * Shows when data was last updated and provides refresh action
 */

const DataFreshness = ({ 
  updatedAt, 
  isStale,
  onRefresh,
  isRefreshing,
  className = '' 
}) => {
  if (!updatedAt) return null;

  const age = Date.now() - new Date(updatedAt).getTime();
  const isVeryStale = age > 10 * 60 * 1000; // 10 minutes

  const getTimeLabel = () => {
    const seconds = Math.floor(age / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`
        inline-flex items-center gap-1.5 text-xs
        transition-colors
        ${isVeryStale 
          ? 'text-red-600 hover:text-red-700' 
          : isStale 
            ? 'text-amber-600 hover:text-amber-700'
            : 'text-gray-400 hover:text-gray-600'}
        ${className}
      `}
      aria-label={isRefreshing ? 'Refreshing data' : `Data updated ${getTimeLabel()}, click to refresh`}
    >
      {isRefreshing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : isVeryStale ? (
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      <span>
        {isRefreshing ? 'Updating...' : `Updated ${getTimeLabel()}`}
      </span>
    </button>
  );
};

export default DataFreshness;
