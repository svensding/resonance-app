
import React from 'react';

interface CornerGlyphGridProps {
  position: 'top-left' | 'bottom-right';
  glyphColorClass?: string;
  glyphSizeClass?: string;
  gridGapClass?: string;
}

export const CornerGlyphGrid: React.FC<CornerGlyphGridProps> = ({ 
  position, 
  glyphColorClass = 'text-sky-400', 
  glyphSizeClass = 'text-[clamp(1rem,3vh,1.8rem)]', 
  gridGapClass = 'gap-[0.5vh]' 
}) => {
  const opacities = position === 'top-left' 
    ? [ [0.25, 0.20, 0.15], [0.20, 0.15, 0.10], [0.15, 0.10, 0.05] ]
    : [ [0.05, 0.10, 0.15], [0.10, 0.15, 0.20], [0.15, 0.20, 0.25] ];
  
  const baseClasses = `${glyphColorClass} ${glyphSizeClass} leading-none`;
  const glyphCharacter = position === 'top-left' ? '⦾' : '⟁';

  return (
    <div 
      className={`absolute ${position === 'top-left' ? 'top-[1vh] left-[1vh]' : 'bottom-[1vh] right-[1vh]'} grid grid-cols-3 ${gridGapClass} select-none z-0`} 
      aria-hidden="true"
    >
      {opacities.flat().map((opacity, index) => (
        <span 
          key={index} 
          className={baseClasses} 
          style={{ opacity: opacity }}
        >
          {glyphCharacter}
        </span>
      ))}
    </div>
  );
};