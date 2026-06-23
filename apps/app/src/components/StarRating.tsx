import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
}

export const StarRating = React.memo(({ rating, count, size = 14 }: StarRatingProps) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            className={
              i < fullStars
                ? 'fill-[#ea580c] text-[#ea580c]'
                : i === fullStars && hasHalf
                  ? 'fill-[#ea580c]/50 text-[#ea580c]'
                  : 'fill-transparent text-slate-300'
            }
          />
        ))}
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-slate-400">({count})</span>
      )}
    </div>
  );
});

StarRating.displayName = 'StarRating';
