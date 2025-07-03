
import React from 'react';
import { CornerGlyphGrid } from './CornerGlyphGrid';
import { GlyphPatternRow } from './DrawnCardsHistoryView';

const CARD_ASPECT_RATIO_MULTIPLIER = 7 / 5;

interface CardShuffleAnimationProps {
    colorClasses?: string[];
}

const ShuffleCardContent: React.FC = () => {
    const resonanceTextStyle: React.CSSProperties = {
        fontFamily: "'Atkinson Hyperlegible', sans-serif",
        fontWeight: 200,
        letterSpacing: '0.15em',
        fontSize: 'clamp(1.5rem, 5vh, 2.8rem)',
        textTransform: 'uppercase',
        color: 'rgba(203, 213, 225, 0.9)',
    };

    const glyphBaseSize = "text-[clamp(1rem,3.5vh,2rem)]";
    const glyphColor = "text-slate-500";
    const cornerGlyphColor = "text-slate-600";
    const cornerGlyphSize = "text-[clamp(1rem,2.5vh,1.5rem)]";
    const cornerGlyphGap = "gap-[0.5vh]";

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-[2vh] text-center overflow-hidden">
            <div className="absolute inset-0 bg-slate-800/40 rounded-xl"></div>
            <CornerGlyphGrid position="top-left" glyphColorClass={cornerGlyphColor} glyphSizeClass={cornerGlyphSize} gridGapClass={cornerGlyphGap}/>
            
            <div className="flex flex-col items-center justify-center flex-grow relative z-10 space-y-[0.3em] sm:space-y-[0.5em]">
              <GlyphPatternRow glyphs={[{ char: "⦾", opacity: 0.33 }]} baseSizeClass={glyphBaseSize} colorClass={glyphColor} />
              <GlyphPatternRow glyphs={[
                  { char: "⦾", opacity: 0.33 }, { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.33 }
              ]} baseSizeClass={glyphBaseSize} colorClass={glyphColor}/>
              <GlyphPatternRow glyphs={[
                  { char: "⦾", opacity: 0.33 }, { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.9 }, 
                  { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.33 }
              ]} baseSizeClass={glyphBaseSize} colorClass={glyphColor}/>
              <div className="my-[0.5em] sm:my-[0.8em]"><p style={resonanceTextStyle}>RESONANCE</p></div>
              <GlyphPatternRow glyphs={[
                  { char: "⟁", opacity: 0.33 }, { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.9 }, 
                  { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.33 }
              ]} baseSizeClass={glyphBaseSize} colorClass={glyphColor}/>
              <GlyphPatternRow glyphs={[
                  { char: "⟁", opacity: 0.33 }, { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.33 }
              ]} baseSizeClass={glyphBaseSize} colorClass={glyphColor}/>
              <GlyphPatternRow glyphs={[{ char: "⟁", opacity: 0.33 }]} baseSizeClass={glyphBaseSize} colorClass={glyphColor} />
            </div>
            
            <CornerGlyphGrid position="bottom-right" glyphColorClass={cornerGlyphColor} glyphSizeClass={cornerGlyphSize} gridGapClass={cornerGlyphGap}/>
        </div>
    );
};

export const CardShuffleAnimation: React.FC<CardShuffleAnimationProps> = ({ colorClasses = [] }) => {
    const baseWidthClass = "w-[75vw] sm:w-[65vw] md:w-[55vw] lg:w-[45vw] max-w-md";
    const defaultColor = 'from-slate-700 to-slate-800';

    const getColorClass = (index: number): string => {
        if (colorClasses.length === 0) return defaultColor;
        return colorClasses[index % colorClasses.length] || defaultColor;
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`${baseWidthClass} perspective mx-auto relative`} style={{ height: 'auto' }}>
                <div style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full relative">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`shuffle-card animate-shuffle-${i + 1} bg-gradient-to-br ${getColorClass(i)}`}>
                                    <ShuffleCardContent />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
