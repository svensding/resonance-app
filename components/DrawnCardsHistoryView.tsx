

import React from 'react';
import { DrawnCard, DrawnCardDisplayData } from './DrawnCard';
import { DrawnCardData as CardHistoryItemType } from '../App';
import { CustomThemeData, ThemeIdentifier, MicroDeck, DeckSet, getDisplayDataForCard } from '../services/geminiService';
import { CornerGlyphGrid } from './CornerGlyphGrid';

interface DrawnCardsHistoryViewProps {
  history: CardHistoryItemType[];
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onPlayAudioForMainPrompt: (audioDetails: { text: string | null; audioData: string | null; audioMimeType: string | null }) => void;
  onFetchAndPlayCardBackAudio: (cardId: string, textToSpeak: string) => void;
  isLoadingNewCard: boolean; 
  isLoadingNextCard: boolean; 
  customDecks: CustomThemeData[];
  themeBeingDrawnName?: string | null; // Name of MicroDeck or CustomDeck being drawn
  activeParticipantNameForPlaceholder?: string | null;
  onOpenVoiceSettings: () => void;
  currentDrawingThemeColor: string | null; // Color of DeckSet or CustomDeck being drawn
}

export const DrawnCardsHistoryView: React.FC<DrawnCardsHistoryViewProps> = ({ 
  history, onLike, onDislike, onPlayAudioForMainPrompt, onFetchAndPlayCardBackAudio,
  isLoadingNewCard, isLoadingNextCard, 
  customDecks, themeBeingDrawnName, activeParticipantNameForPlaceholder,
  onOpenVoiceSettings,
  currentDrawingThemeColor
}) => {

  const newestCard = history[0]; 
  const olderCards = history.slice(isLoadingNextCard ? 0 : 1); 

  const showEmptyStateCard = !isLoadingNewCard && !isLoadingNextCard && history.length === 0;
  const isMainCardAreaActive = isLoadingNewCard || isLoadingNextCard || newestCard || showEmptyStateCard;


  const renderEmptyState = () => (
    <div className="w-full max-w-[calc(100vw-2rem)] xs:max-w-sm sm:max-w-md perspective mx-auto relative" style={{ height: 'auto' }}>
      <div style={{ paddingTop: `${(7 / 5) * 100}%` }} className="relative">
        <div className="absolute inset-0 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl shadow-xl flex flex-col items-center justify-center p-3 sm:p-4 text-center shimmer-effect overflow-hidden">
          <CornerGlyphGrid position="top-left" glyphColorClass="text-white/70" glyphSizeClass="text-base xs:text-lg sm:text-xl md:text-2xl" gridGapClass="gap-0.5 xs:gap-1 sm:gap-1.5"/>
          <div className="flex flex-col items-center justify-center flex-grow relative z-10"> 
            <p className="text-2xl xs:text-3xl sm:text-4xl font-semibold font-playfair text-white/70 brand-text-container"><span className="brand-text-r">R</span>esonance <span className="font-normal">⦾</span></p>
          </div>
          <p className="text-[0.65rem] xs:text-xs sm:text-sm text-slate-400 mt-auto pt-1 sm:pt-2 relative z-10">Select a theme from the top to draw your first card.</p>
          <CornerGlyphGrid position="bottom-right" glyphColorClass="text-white/70" glyphSizeClass="text-base xs:text-lg sm:text-xl md:text-2xl" gridGapClass="gap-0.5 xs:gap-1 sm:gap-1.5"/>
        </div>
      </div>
    </div>
  );


  return (
    <div className="w-full max-w-6xl px-2 xs:px-3 sm:px-4 md:px-6 flex flex-col items-center">
      <div className="w-full flex flex-row justify-center items-start gap-1 xs:gap-2 sm:gap-4 mb-3 sm:mb-4 md:mb-6 pt-[10vh] pb-[5vh]">
        {/* Ensure this max-w allows space for the button on smaller screens */}
        <div className="flex-grow w-full max-w-[calc(100%-2.5rem)] xs:max-w-[calc(100%-3rem)] sm:max-w-md">
          {isLoadingNextCard || isLoadingNewCard ? (
            <DrawnCard
              id="loading-placeholder"
              isLoadingPlaceholder={true}
              isNewest={true}
              promptText={null}
              themeIdentifier={"SBP_01" as ThemeIdentifier} // Dummy valid ID for placeholder structure
              feedback={null}
              onLike={() => {}} onDislike={() => {}}
              onPlayAudioForMainPrompt={() => {}} onFetchAndPlayCardBackAudio={() => {}}
              currentDrawingThemeColorForPlaceholder={currentDrawingThemeColor || undefined} 
              themeBeingDrawnNamePlaceholder={themeBeingDrawnName || undefined}
              activeParticipantNameForPlaceholder={activeParticipantNameForPlaceholder}
              allCustomDecksForLookup={customDecks}
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
              isCulminationCard={newestCard.isCulminationCard}
              onLike={onLike} onDislike={onDislike}
              onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
              onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
              allCustomDecksForLookup={customDecks}
            />
          ) : showEmptyStateCard ? (
            renderEmptyState()
          ) : null}
        </div>
        
        {isMainCardAreaActive ? (
           <div className="flex-shrink-0 w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 mt-1 sm:mt-1.5 md:mt-2 ml-1 xs:ml-0">
             <button 
                onClick={onOpenVoiceSettings}
                className="p-1.5 xs:p-2 sm:p-2.5 md:p-3 rounded-full bg-slate-700 hover:bg-sky-600 text-slate-300 hover:text-white transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Open Voice Settings" title="Voice & Audio Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
             </button>
           </div>
        ) : ( <div className="flex-shrink-0 w-8 h-8 xs:w-9 sm:w-10 md:w-12"></div> )} {/* Keep spacing consistent */}
      </div>
      
      {olderCards.length > 0 && (
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 pb-20 sm:pb-24">
          {olderCards.map((cardData) => {
             const displayData: DrawnCardDisplayData = {
              id: cardData.id,
              promptText: cardData.text,
              themeIdentifier: cardData.themeIdentifier,
              deckSetId: cardData.deckSetId,
              feedback: cardData.feedback,
              audioData: cardData.audioData,
              audioMimeType: cardData.audioMimeType,
              llmPromptForTextGeneration: cardData.llmPromptForTextGeneration,
              rawLlmOutput: cardData.rawLlmOutput,
              cardBackNotesText: cardData.cardBackNotesText,
              cardBackAudioData: cardData.cardBackAudioData,
              cardBackAudioMimeType: cardData.cardBackAudioMimeType,
              isNewest: false, 
              drawnForParticipantName: cardData.drawnForParticipantName,
              isFaded: cardData.isFaded,
              isCulminationCard: cardData.isCulminationCard,
            };
            return (
              <DrawnCard
                key={cardData.id}
                {...displayData}
                onLike={onLike} onDislike={onDislike}
                onPlayAudioForMainPrompt={onPlayAudioForMainPrompt}
                onFetchAndPlayCardBackAudio={onFetchAndPlayCardBackAudio}
                allCustomDecksForLookup={customDecks}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};