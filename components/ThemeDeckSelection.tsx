import React, { useMemo } from 'react';
import { 
    ThemeIdentifier, CustomThemeData, ThemedDeck,
    getVisibleDecks,
    SocialContext,
    AgeFilters,
    DECK_CATEGORIES,
    getDisplayDataForCard
} from '../services/geminiService';
import { ThemedDeckButton } from './ThemedDeckButton';
import { useDragToScroll } from '../hooks/useDragToScroll'; 

interface ThemeDeckSelectionProps {
  onDraw: (itemId: ThemedDeck['id'] | CustomThemeData['id'] | "RANDOM") => void;
  isDrawingInProgress?: boolean;
  interactionsDisabled?: boolean;
  customDecks: CustomThemeData[];
  onAddCustomDeck: () => void;
  onEditCustomDeck: (deck: CustomThemeData) => void; 
  onShowDeckInfo: (itemId: ThemedDeck['id'] | CustomThemeData['id']) => void;
  groupSetting: SocialContext;
  ageFilters: AgeFilters;
}

export const ThemeDeckSelection: React.FC<ThemeDeckSelectionProps> = ({ 
    onDraw, 
    isDrawingInProgress = false,
    interactionsDisabled = false,
    customDecks, 
    onAddCustomDeck,
    onEditCustomDeck,
    onShowDeckInfo,
    groupSetting,
    ageFilters,
}) => {
  const scrollContainerRef = useDragToScroll<HTMLDivElement>(); 

  const deckButtonContainerStyle = "flex-shrink-0 h-full aspect-[5/7]";
  const drawActionDisabled = isDrawingInProgress || interactionsDisabled;
  const utilityActionsDisabled = interactionsDisabled;

  const visibleDecks = useMemo(() => getVisibleDecks(groupSetting, ageFilters), [groupSetting, ageFilters]);

  const categorizedDecks = useMemo(() => {
    const categories: { category: typeof DECK_CATEGORIES[0]; decks: ThemedDeck[] }[] = [];
    DECK_CATEGORIES.forEach(cat => {
      const decksInCategory = visibleDecks.filter(deck => deck.category === cat.id);
      if (decksInCategory.length > 0) {
        categories.push({ category: cat, decks: decksInCategory });
      }
    });
    return categories;
  }, [visibleDecks]);

  return (
    <div className="w-full h-full flex items-center p-2 sm:p-3 relative bg-transparent" > 
      <div 
        ref={scrollContainerRef} 
        className="flex h-full overflow-x-auto hide-scrollbar space-x-3 sm:space-x-4 justify-start items-center cursor-grab active:cursor-grabbing bg-transparent w-full"
        style={{ isolation: 'isolate' }} 
      >
        <div key="RANDOM" className={deckButtonContainerStyle}> 
            <ThemedDeckButton
                itemId="RANDOM" 
                itemName="Surprise Me!"
                colorClass="from-indigo-400 to-violet-500 hover:from-indigo-500 hover:to-violet-600"
                onDrawClick={() => onDraw("RANDOM")}
                drawActionDisabled={drawActionDisabled}
                utilityActionsDisabled={utilityActionsDisabled}
                isRandomButton={true}
            />
        </div>

        {categorizedDecks.map(({ category, decks }) => (
            <React.Fragment key={category.id}>
                <div className="flex-shrink-0 h-full flex items-center justify-center text-center font-bold text-slate-500 uppercase tracking-widest text-xs transform -rotate-90">
                   {category.name}
                </div>
                {decks.map(deck => {
                    const { colorClass } = getDisplayDataForCard(deck.id, customDecks);
                    return (
                        <div key={deck.id} className={deckButtonContainerStyle}> 
                            <ThemedDeckButton
                                itemId={deck.id}
                                itemName={deck.name}
                                colorClass={colorClass}
                                onDrawClick={() => onDraw(deck.id)}
                                drawActionDisabled={drawActionDisabled}
                                utilityActionsDisabled={utilityActionsDisabled}
                                onShowInfo={() => onShowDeckInfo(deck.id)}
                                isDeckSet={true}
                            />
                        </div>
                    );
                })}
            </React.Fragment>
        ))}

        {customDecks.length > 0 && (
            <React.Fragment>
                 <div className="flex-shrink-0 h-full flex items-center justify-center text-center font-bold text-slate-500 uppercase tracking-widest text-xs transform -rotate-90">
                   Custom
                </div>
                {customDecks.map(deck => (
                    <div key={deck.id} className={deckButtonContainerStyle}>
                        <ThemedDeckButton
                            itemId={deck.id}
                            itemName={deck.name}
                            colorClass={deck.colorClass}
                            onDrawClick={() => onDraw(deck.id)}
                            drawActionDisabled={drawActionDisabled}
                            utilityActionsDisabled={utilityActionsDisabled}
                            customDeckData={deck}
                            onEditCustomDeck={onEditCustomDeck}
                            onShowInfo={() => onShowDeckInfo(deck.id)}
                        />
                    </div>
                ))}
            </React.Fragment>
        )}
        
        <div className={`${deckButtonContainerStyle} flex items-center justify-center`}>
            <button
                onClick={onAddCustomDeck}
                disabled={drawActionDisabled} 
                className={`w-full h-full flex flex-col items-center justify-center bg-slate-700 rounded-lg border-2 border-dashed border-slate-500 text-slate-400 transition-all duration-200 p-2 focus:outline-none 
                            ${drawActionDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-600 hover:border-sky-400 hover:text-sky-300 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900'}`}
                aria-label="Add new custom deck"
                title="Add a new custom deck"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-1/3 w-1/3 max-h-10 max-w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs sm:text-sm font-semibold mt-1 text-center">Add Deck</span>
            </button>
        </div>
      </div>
    </div>
  );
};
