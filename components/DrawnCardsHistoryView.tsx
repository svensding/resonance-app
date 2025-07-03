import React from 'react';
import { DrawnCard, DrawnCardDisplayData } from './DrawnCard';
import { DrawnCardData as CardHistoryItemType } from '../App';
import { CustomThemeData } from '../services/geminiService';
import { CornerGlyphGrid } from './CornerGlyphGrid';

interface DrawnCardsHistoryViewProps {
  history: CardHistoryItemType[];
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onPlayAudioForMainPrompt: (audioDetails: { cardId: string; text: string | null; audioData: string | null; audioMimeType: string | null }) => void;
  onFetchAndPlayCardBackAudio: (cardId: string, textToSpeak: string) => void;
  customDecks: CustomThemeData[];
  activeCardAudio: { cardId: string; type: 'prompt' | 'notes' } | null;
  onStopAudio: () => void;
  thinkingTextForNewestCard?: string | null;
  isDrawingInProgress: boolean;
}

interface GlyphPatternRowProps {
  glyphs: Array<{ char: string; opacity: number; sizeClass?: string }>;
  spacingClass?: string;
  baseSizeClass?: string;
  colorClass?: string;
  lineHeightClass?: string;
}

export const GlyphPatternRow: React.FC<GlyphPatternRowProps> = ({ 
  glyphs, 
  spacingClass = "gap-x-[1em]", 
  baseSizeClass = "text-[clamp(1.2rem,4vh,2.2rem)]", 
  colorClass = "text-slate-500",
  lineHeightClass = "leading-tight"
}) => (
  <div className={`flex justify-center items-center ${spacingClass} ${lineHeightClass}`}>
    {glyphs.map((g, index) => (
      <span 
        key={index} 
        className={`${g.sizeClass || baseSizeClass} ${colorClass} font-normal`}
        style={{ opacity: g.opacity }}
        aria-hidden="true"
      >
        {g.char}
      </span>
    ))}
  </div>
);


export const DrawnCardsHistoryView: React.FC<DrawnCardsHistoryViewProps> = ({ 
  history, onLike, onDislike, onPlayAudioForMainPrompt, onFetchAndPlayCardBackAudio,
  customDecks, 
  activeCardAudio,
  onStopAudio,
  thinkingTextForNewestCard,
  isDrawingInProgress,
}) => {

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

  const renderEmptyState = () => (
    <div className="w-[75vw] sm:w-[65vw] md:w-[55vw] lg:w-[45vw] max-w-md perspective mx-auto relative font-normal" style={{ height: 'auto' }}>
      <div style={{ paddingTop: `${(7 / 5) * 100}%` }} className="relative">
        <div className="absolute inset-0 bg-slate-800/60 border-2 border-dashed border-slate-700 rounded-xl shadow-xl flex flex-col items-center justify-center p-[2vh] text-center shimmer-effect overflow-hidden">
          <CornerGlyphGrid position="top-left" glyphColorClass="text-slate-600" glyphSizeClass="text-[clamp(1rem,2.5vh,1.5rem)]" gridGapClass="gap-[0.5vh]"/>
          
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
          
          <p className="text-[clamp(0.65rem,2vh,0.9rem)] text-slate-400/90 mt-auto pt-[1vh] relative z-10 font-normal">Select a theme from the top to draw your first card.</p>
          <CornerGlyphGrid position="bottom-right" glyphColorClass="text-slate-600" glyphSizeClass="text-[clamp(1rem,2.5vh,1.5rem)]" gridGapClass="gap-[0.5vh]"/>
        </div>
      </div>
    </div>
  );
  
  if (history.length === 0) {
    return (
      <div className="w-full max-w-6xl px-[2vw] flex flex-col items-center font-normal">
        {renderEmptyState()}
      </div>
    );
  }

  const newestCard = history[0];
  const olderCards = history.slice(1);

  return (
    <div className="w-full max-w-6xl px-[2vw] flex flex-col items-center font-normal">
      {/* Newest Card */}
      <div className="mb-[3vh] w-full flex justify-center">
        <DrawnCard
            key={newestCard.id}
            id={newestCard.id}
            promptText={newestCard.text}
            themeIdentifier={newestCard.themeIdentifier}
            deckSetId={newestCard.deckSetId}
            feedback={newestCard.feedback}
            audioData={newestCard.audioData}
            audioMimeType={newestCard.audioMimeType}
            cardBackNotesText={newestCard.cardBackNotesText}
            isNewest={true}
            drawnForParticipantName={newestCard.drawnForParticipantName}
            isLoadingPlaceholder={!newestCard.text}
            isFaded={newestCard.isFaded}
            thinkingTextForPlaceholder={thinkingTextForNewestCard}
            onLike={onLike}
            onDislike={onDislike}
            onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
            onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
            allCustomDecksForLookup={customDecks}
            activeCardAudio={activeCardAudio}
            onStopAudio={onStopAudio}
        />
      </div>

      {/* History Grid */}
      {olderCards.length > 0 && (
        <div className="w-full border-t-2 border-slate-700/50 pt-[3vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-[2vw] gap-y-[3vh]">
            {olderCards.map((card) => (
              <DrawnCard
                key={card.id}
                id={card.id}
                promptText={card.text}
                themeIdentifier={card.themeIdentifier}
                deckSetId={card.deckSetId}
                feedback={card.feedback}
                isNewest={false}
                drawnForParticipantName={card.drawnForParticipantName}
                onLike={onLike}
                onDislike={onDislike}
                onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
                onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
                allCustomDecksForLookup={customDecks}
                audioData={card.audioData}
                audioMimeType={card.audioMimeType}
                cardBackNotesText={card.cardBackNotesText}
                isFaded={card.isFaded}
                activeCardAudio={activeCardAudio}
                onStopAudio={onStopAudio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
