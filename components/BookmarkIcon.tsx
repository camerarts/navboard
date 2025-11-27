import React, { useState } from 'react';

interface BookmarkIconProps {
  url: string;
  title: string;
  className?: string;
}

const COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-cyan-100 text-cyan-600',
];

const BookmarkIcon: React.FC<BookmarkIconProps> = ({ url, title, className = "" }) => {
  const [error, setError] = useState(false);

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    domain = '';
  }

  // Use a reliable favicon service (API by iowen is robust in CN regions)
  // Fallback to Google if needed, but here we just handle the error state
  const faviconUrl = `https://api.iowen.cn/favicon/${domain}.png`;

  // Deterministic color based on title length
  const colorIndex = (title?.length || 0) % COLORS.length;
  const colorClass = COLORS[colorIndex];
  const letter = title ? title.charAt(0).toUpperCase() : '#';

  if (error || !domain) {
    return (
      <div 
        className={`flex items-center justify-center font-bold shadow-inner ${colorClass} ${className}`} 
        style={{ fontSize: '100%' }} // Relative sizing
      >
        {letter}
      </div>
    );
  }

  return (
    <img 
      src={faviconUrl}
      alt={title} 
      className={`object-cover ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export default BookmarkIcon;
