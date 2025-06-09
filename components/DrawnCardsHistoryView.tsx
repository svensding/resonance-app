

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
  isLoadingNewCard: boolean; 
  isLoadingNextCard: boolean; 
  customDecks: CustomThemeData[];
  themeBeingDrawnName?: string | null; 
  activeParticipantNameForPlaceholder?: string | null;
  onOpenVoiceSettings: () => void;
  currentDrawingThemeColor: string | null; 
  activeCardAudio: { cardId: string; type: 'prompt' | 'notes' } | null;
  onStopAudio: () => void;
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
  isLoadingNewCard, isLoadingNextCard, 
  customDecks, themeBeingDrawnName, activeParticipantNameForPlaceholder,
  onOpenVoiceSettings,
  currentDrawingThemeColor,
  activeCardAudio,
  onStopAudio,
}) => {

  const newestCard = history[0]; 
  const olderCards = history.slice(isLoadingNextCard ? 0 : 1); 

  const showEmptyStateCard = !isLoadingNewCard && !isLoadingNextCard && history.length === 0;
  const isMainCardAreaActive = isLoadingNewCard || isLoadingNextCard || newestCard || showEmptyStateCard;
  
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


  return (
    <div className="w-full max-w-6xl px-[2vw] flex flex-col items-center font-normal">
      <div className="w-full flex flex-row justify-center items-start gap-[1vw] sm:gap-[2vw] mb-[2vh] sm:mb-[3vh]">
        <div className="flex-grow w-full"> 
          {isLoadingNextCard || isLoadingNewCard ? (
            <DrawnCard
              id="loading-placeholder"
              isLoadingPlaceholder={true}
              isNewest={true}
              promptText={null}
              themeIdentifier={"SBP_01"} 
              feedback={null}
              onLike={() => {}} onDislike={() => {}}
              onPlayAudioForMainPrompt={() => {}} onFetchAndPlayCardBackAudio={() => {}}
              currentDrawingThemeColorForPlaceholder={currentDrawingThemeColor || undefined} 
              themeBeingDrawnNamePlaceholder={themeBeingDrawnName || undefined}
              activeParticipantNameForPlaceholder={activeParticipantNameForPlaceholder}
              allCustomDecksForLookup={customDecks}
              activeCardAudio={activeCardAudio}
              onStopAudio={onStopAudio}
            />
          ) : newestCard ? (
            <DrawnCard
              key={newestCard.id + "-newest"}
              id={newestCard.id}
              promptText={newestCard.text}
              themeIdentifier={newestCard.themeIdentifier}
              deckSetId={newestCard.deckSetId}
              feedback={newestCard.feedback}
              audioData={newestCard.audioData}
              audioMimeType={newestCard.audioMimeType}
              llmPromptForTextGeneration={newestCard.llmPromptForTextGeneration}
              rawLlmOutput={newestCard.rawLlmOutput}
              cardBackNotesText={newestCard.cardBackNotesText}
              cardBackAudioData={newestCard.cardBackAudioData}
              cardBackAudioMimeType={newestCard.cardBackAudioMimeType}
              isNewest={true}
              drawnForParticipantName={newestCard.drawnForParticipantName}
              isFaded={newestCard.isFaded}
              onLike={onLike} onDislike={onDislike}
              onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
              onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
              allCustomDecksForLookup={customDecks}
              activeCardAudio={activeCardAudio}
              onStopAudio={onStopAudio}
            />
          ) : showEmptyStateCard ? (
            renderEmptyState()
          ) : null}
        </div>
        
        {isMainCardAreaActive && (
          <div className="flex-shrink-0 flex flex-col items-center space-y-2 w-auto min-w-[5vh] sm:min-w-[6vh] mt-[1vh] ml-[1vw]">
            <button 
                onClick={onOpenVoiceSettings}
                className="p-1.5 xs:p-2 sm:p-2.5 md:p-3 rounded-full bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 w-[5vh] h-[5vh] sm:w-[5.5vh] sm:h-[5.5vh] md:w-[6vh] md:h-[6vh] flex items-center justify-center"
                aria-label="Open Voice Settings" title="Voice & Audio Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"></path>
                </svg>
            </button>
          </div>
        )}
      </div>

      {olderCards.length > 0 && (
        <div className="mt-[3vh] sm:mt-[4vh] w-full" style={{paddingBottom: 'calc(var(--footer-height-actual) + 2vh)'}}>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-[1.5vw] sm:gap-[2vw]">
            {olderCards.map((card) => (
              <div key={card.id + "-older"} className="mb-[1.5vw] sm:mb-[2vw]">
                <DrawnCard
                  id={card.id}
                  promptText={card.text}
                  themeIdentifier={card.themeIdentifier}
                  deckSetId={card.deckSetId}
                  feedback={card.feedback}
                  audioData={card.audioData}
                  audioMimeType={card.audioMimeType}
                  llmPromptForTextGeneration={card.llmPromptForTextGeneration}
                  rawLlmOutput={card.rawLlmOutput}
                  cardBackNotesText={card.cardBackNotesText}
                  cardBackAudioData={card.cardBackAudioData}
                  cardBackAudioMimeType={card.cardBackAudioMimeType}
                  isNewest={false}
                  drawnForParticipantName={card.drawnForParticipantName}
                  isFaded={card.isFaded}
                  onLike={onLike} onDislike={onDislike}
                  onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
                  onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
                  allCustomDecksForLookup={customDecks}
                  activeCardAudio={activeCardAudio}
                  onStopAudio={onStopAudio}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
