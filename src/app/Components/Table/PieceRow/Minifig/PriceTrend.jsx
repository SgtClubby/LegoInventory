// src/app/Components/Table/PieceRow/Minifig/PriceTrend.jsx

import React from 'react';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

/**
 * Component to display price trend indicators
 * 
 * @param {Object} props - Component props
 * @param {Object} props.trend - Trend data with direction and percentage
 * @param {string} props.size - Size of the trend indicator (small, medium, large)
 * @returns {React.ReactElement} The PriceTrend component
 */
export default function PriceTrend({ trend, size = 'medium' }) {
  if (!trend || trend.direction === 'none') {
    return null;
  }
  
  const isUp = trend.direction === 'up';
  const percentage = trend.percentage || 0;
  
  // Size classes
  const sizeClasses = {
    small: 'h-3 w-3 text-xs',
    medium: 'h-4 w-4 text-sm',
    large: 'h-5 w-5 text-base'
  };
  
  // Color classes
  const colorClass = isUp 
    ? 'text-red-500' // Price increase is red (negative for collector)
    : 'text-green-500'; // Price decrease is green (positive for collector)
  
  return (
    <span className={`inline-flex items-center ${colorClass}`}>
      {isUp ? (
        <TrendingUp className={sizeClasses[size]} />
      ) : (
        <TrendingDown className={sizeClasses[size]} />
      )}
      {percentage > 0 && (
        <span className="ml-0.5 text-xs font-medium">{percentage}%</span>
      )}
    </span>
  );
}
