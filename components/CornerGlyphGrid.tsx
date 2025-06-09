
import React from 'react';

interface CornerGlyphGridProps {
  position: 'top-left' | 'bottom-right';
  glyphColorClass?: string;
  glyphSizeClass?: string;
  gridGapClass?: string;
}

export const CornerGlyphGrid: React.FC<CornerGlyphGridProps> = ({ 
  position, 
  glyphColorClass = 'text-sky-400', // Default for empty state, can be overridden
  glyphSizeClass = 'text-lg sm:text-xl md:text-2xl', // Default for empty state
  gridGapClass = 'gap-1 sm:gap-1.5' // Default gap aiming for better squareness
}) => {
  const opacities = position === 'top-left' 
    ? [ [0.25, 0.20, 0.15], [0.20, 0.15, 0.10], [0.15, 0.10, 0.05] ]
    : [ [0.05, 0.10, 0.15], [0.10, 0.15, 0.20], [0.15, 0.20, 0.25] ];
  
  const baseClasses = `${glyphColorClass} ${glyphSizeClass} leading-none`; // leading-none is crucial for minimizing extra vertical space

  return (
    <div 
      className={`absolute ${position === 'top-left' ? 'top-2 left-2 sm:top-3 sm:left-3' : 'bottom-2 right-2 sm:bottom-3 sm:right-3'} grid grid-cols-3 ${gridGapClass} select-none z-0`} 
      aria-hidden="true"
    >
      {opacities.flat().map((opacity, index) => (
        <span 
          key={index} 
          className={baseClasses} 
          style={{ opacity: opacity }}
        >
          ⦾
        </span>
      ))}
    </div>
  );
};
