
import React, { useEffect, useState, useRef } from 'react';
import { ThemeIdentifier, CustomThemeData, MicroDeck, DeckSet, getDisplayDataForCard } from '../services/geminiService'; 
import { CornerGlyphGrid } from './CornerGlyphGrid';

export interface DrawnCardDisplayData {
  id: string;
  promptText: string | null; 
  themeIdentifier: ThemeIdentifier; // MicroDeckId or CustomThemeId
  deckSetId?: string | null; // ID of the DeckSet it was drawn from, if applicable
  feedback: 'liked' | 'disliked' | null;
  audioData?: string | null; 
  audioMimeType?: string | null;
  llmPromptForTextGeneration?: string; 
  rawLlmOutput?: string | null; 
  cardBackNotesText?: string | null;
  cardBackAudioData?: string | null;
  cardBackAudioMimeType?: string | null;
  isNewest?: boolean;
  // themeColor is now derived internally or passed if already known
  drawnForParticipantName?: string | null; 
  isLoadingPlaceholder?: boolean; 
  // customDeck is now handled by getDisplayDataForCard
  isFaded?: boolean; 
  themeBeingDrawnNamePlaceholder?: string | null; // Name of microdeck or custom deck being drawn
  activeParticipantNameForPlaceholder?: string | null;
  isCulminationCard?: boolean;
  currentDrawingThemeColorForPlaceholder?: string | null; // Explicitly for placeholder
}

interface DrawnCardProps extends DrawnCardDisplayData {
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onPlayAudioForMainPrompt: (audioDetails: { text: string | null; audioData: string | null; audioMimeType: string | null }) => void;
  onFetchAndPlayCardBackAudio: (cardId: string, textToSpeak: string) => void;
  allCustomDecksForLookup: CustomThemeData[]; 
}

const CARD_ASPECT_RATIO_MULTIPLIER = 7 / 5; 
const TEXT_REVEAL_DURATION_MS = 1200;
const LONG_PROMPT_THRESHOLD = 240; 
const VERY_LONG_PROMPT_THRESHOLD_NEWEST = 300;


interface ParsedGuidanceSection {
    heading: string;
    content: string;
}

const DrawnCardComponent: React.FC<DrawnCardProps> = ({
  id,
  promptText,
  themeIdentifier,
  deckSetId,
  feedback,
  audioData, 
  audioMimeType,
  llmPromptForTextGeneration,
  rawLlmOutput,
  cardBackNotesText,
  cardBackAudioData,
  cardBackAudioMimeType,
  isNewest = false,
  drawnForParticipantName,
  isLoadingPlaceholder = false,
  onLike,
  onDislike,
  onPlayAudioForMainPrompt,
  onFetchAndPlayCardBackAudio,
  isFaded = false,
  themeBeingDrawnNamePlaceholder,
  activeParticipantNameForPlaceholder,
  isCulminationCard = false,
  allCustomDecksForLookup = [],
  currentDrawingThemeColorForPlaceholder,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showLLMDetailsView, setShowLLMDetailsView] = useState(false);
  const [llmDetailsTab, setLlmDetailsTab] = useState<'input' | 'output'>('input');
  const [showCardBackView, setShowCardBackView] = useState(false);
  const [isLoadingCardBackAudio, setIsLoadingCardBackAudio] = useState(false);
  const [parsedGuidance, setParsedGuidance] = useState<ParsedGuidanceSection[]>([]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isTextAnimatedIn, setIsTextAnimatedIn] = useState(false);
  const [isTextFullyVisible, setIsTextFullyVisible] = useState(false); 
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setIsTextAnimatedIn(false); setIsTextFullyVisible(false); 
    setShowLLMDetailsView(false); setShowCardBackView(false); setIsLoadingCardBackAudio(false); 

    if (isLoadingPlaceholder || !promptText || !themeIdentifier) {
      setIsRevealed(false); return;
    }

    if (isNewest) {
      setIsRevealed(false); 
      revealTimerRef.current = setTimeout(() => {
        setIsRevealed(true); 
        revealTimerRef.current = setTimeout(() => {
          setIsTextAnimatedIn(true);
          revealTimerRef.current = setTimeout(() => setIsTextFullyVisible(true), TEXT_REVEAL_DURATION_MS);
        }, 100); 
      }, 50); 
    } else {
      setIsRevealed(true); setIsTextAnimatedIn(true); setIsTextFullyVisible(true); 
    }
    return () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current); };
  }, [promptText, themeIdentifier, isNewest, id, isLoadingPlaceholder]);

  const cardFaceBaseClasses = "rounded-xl shadow-xl flex flex-col overflow-hidden";
  const subtleSolidBorder = "border border-slate-700/60"; 
  const overlayBaseClasses = "bg-slate-800/40"; 
  const overlayDashedBorderClasses = "border-2 border-dashed border-slate-600";
  
  const glyphColor = "text-white/70"; 
  const glyphSize = isNewest ? "text-base xs:text-lg sm:text-xl md:text-2xl" : "text-sm sm:text-base";
  const glyphGap = isNewest ? "gap-0.5 xs:gap-1 sm:gap-1.5" : "gap-0.5 sm:gap-1";


  const handleToggleCardBackView = () => {
    if (cardBackNotesText && cardBackNotesText.trim() !== "") { 
        setShowCardBackView(prev => !prev);
        if (showLLMDetailsView) setShowLLMDetailsView(false); 
    }
  };

  const handlePlayCardBackAudio = async () => {
    if (!cardBackNotesText || isLoadingCardBackAudio || cardBackNotesText.trim() === "") return;
    setIsLoadingCardBackAudio(true);
    try {
        if (cardBackAudioData && cardBackAudioMimeType) {
            onPlayAudioForMainPrompt({ text: null, audioData: cardBackAudioData, audioMimeType: cardBackAudioMimeType }); 
        } else {
            await onFetchAndPlayCardBackAudio(id, cardBackNotesText);
        }
    } catch (error) { console.error("Error initiating card back audio playback:", error); }
    finally { setIsLoadingCardBackAudio(false); }
  };
  
  const GUIDANCE_HEADINGS = ["Intent & Invitation", "Simple Steps or Guidance", "Clarifying Concepts", "Inspirational Nudges", "Deeper Dive Question"];
  useEffect(() => {
    if (cardBackNotesText) {
      const sections: ParsedGuidanceSection[] = [];
      let remainingText = cardBackNotesText;
      for (let i = 0; i < GUIDANCE_HEADINGS.length; i++) {
        const currentHeading = GUIDANCE_HEADINGS[i]; const nextHeading = (i + 1 < GUIDANCE_HEADINGS.length) ? GUIDANCE_HEADINGS[i+1] : null;
        const headingPattern = `**${currentHeading}:**`; const headingIndex = remainingText.indexOf(headingPattern);
        if (headingIndex !== -1) {
          let contentStartIndex = headingIndex + headingPattern.length; let contentEndIndex = remainingText.length;
          if (nextHeading) {
            const nextHeadingPattern = `**${nextHeading}:**`; const nextHeadingActualIndex = remainingText.indexOf(nextHeadingPattern, contentStartIndex);
            if (nextHeadingActualIndex !== -1) contentEndIndex = nextHeadingActualIndex;
          }
          const content = remainingText.substring(contentStartIndex, contentEndIndex).trim();
          if (content) sections.push({ heading: currentHeading, content });
          remainingText = remainingText.substring(contentEndIndex); 
        }
      }
      if (sections.length === 0 && cardBackNotesText.trim()) sections.push({ heading: "Guidance", content: cardBackNotesText.trim() });
      setParsedGuidance(sections);
    } else setParsedGuidance([]);
  }, [cardBackNotesText]);

  const renderCardBackNotes = () => {
    if (!parsedGuidance.length) return <p className="text-xs sm:text-sm text-slate-400 font-atkinson-regular text-center">No additional guidance for this card.</p>;
    return (
      <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
        {parsedGuidance.map((section, index) => (
          section.content.trim() ? (
            <div key={index}>
              <h6 className="font-semibold text-xs sm:text-sm md:text-base text-slate-300 mb-0.5">{section.heading}</h6>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 font-atkinson-regular whitespace-pre-wrap">{section.content}</p>
            </div>
          ) : null
        ))}
      </div>
    );
  };

  if (isLoadingPlaceholder) {
    const baseWidthClass = isNewest ? "w-full max-w-[calc(100vw-6rem)] xs:max-w-xs sm:max-w-sm md:max-w-md" : "w-full max-w-xs";
    let loadingText = `Drawing from ${themeBeingDrawnNamePlaceholder || 'a source'}...`;
    if (activeParticipantNameForPlaceholder) loadingText = `Drawing for ${activeParticipantNameForPlaceholder} from ${themeBeingDrawnNamePlaceholder || 'a source'}...`;
    
    return (
      <div className={`${baseWidthClass} perspective mx-auto relative`} style={{ height: 'auto' }}>
        <div style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} className="relative">
          <div 
            className={`absolute inset-0 ${currentDrawingThemeColorForPlaceholder ? `bg-gradient-to-br ${currentDrawingThemeColorForPlaceholder}` : 'bg-slate-900'} 
                       rounded-xl shadow-xl ${subtleSolidBorder} shimmer-effect animate-pulse-slow 
                       flex flex-col items-center justify-center p-3 sm:p-4 text-center overflow-hidden`}
          >
            <div className={`absolute inset-0 ${overlayBaseClasses} rounded-xl`}></div>
            <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap}/>
            <div className="flex flex-col items-center justify-center flex-grow relative z-10"> 
              <p className={`text-2xl xs:text-3xl sm:text-4xl font-semibold font-playfair text-white/70 brand-text-container`}><span className="brand-text-r">R</span>esonance <span className="font-normal">⦾</span></p>
              <p className="text-[0.65rem] xs:text-xs sm:text-sm text-slate-300/80 mt-2 sm:mt-3 relative z-10">{loadingText}</p>
            </div>
            <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap}/>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isRevealed && !promptText && !isLoadingPlaceholder) return null;

  const { name: themeDisplayName, colorClass: themeColor } = getDisplayDataForCard(themeIdentifier, deckSetId || null, allCustomDecksForLookup);
  
  const baseWidthClass = isNewest 
    ? "w-full max-w-[calc(100vw-6rem)] xs:max-w-xs sm:max-w-sm md:max-w-md" 
    : "w-full max-w-[140px] xs:max-w-[160px] sm:max-w-[180px] md:max-w-xs"; 
  const themeNameSizeClasses = isNewest ? "text-[0.6rem] xs:text-xs sm:text-sm" : "text-[0.55rem] xs:text-[0.6rem] sm:text-[0.65rem]";
  const participantNameSizeClasses = isNewest ? "text-[0.55rem] xs:text-[0.65rem] sm:text-xs" : "text-[0.5rem] xs:text-[0.55rem] sm:text-[0.6rem]";
  const utilityButtonIconSize = isNewest ? "h-4 w-4 xs:h-5 sm:h-6" : "h-3 w-3 sm:h-4";
  const utilityButtonPadding = isNewest ? "p-1 xs:p-1.5 sm:p-2" : "p-0.5 sm:p-1";
  const utilityButtonRotateIconFontSize = isNewest ? '0.75rem xs:0.8rem sm:1rem' : '0.6rem sm:0.8rem';
  const cardPaddingClass = isNewest ? "p-2 xs:p-3 sm:p-4" : "p-1.5 xs:p-2 sm:p-2.5"; 
  const promptTextHorizontalPadding = isNewest ? "px-2 xs:px-3 sm:px-4 md:px-6" : "px-1.5 xs:px-2"; 
  
  const promptTextStyle: React.CSSProperties = { textWrap: 'balance' as any, lineHeight: isNewest ? '1.25' : '1.2' };
  if (!isNewest || isTextFullyVisible) promptTextStyle.color = 'white';
  else { 
    promptTextStyle.color = 'transparent'; promptTextStyle.backgroundImage = 'linear-gradient(105deg, white 50%, transparent 70%)';
    promptTextStyle.backgroundRepeat = 'no-repeat'; promptTextStyle.backgroundClip = 'text'; promptTextStyle.WebkitBackgroundClip = 'text';
    promptTextStyle.backgroundSize = '200% 100%'; promptTextStyle.backgroundPosition = '100% 0'; 
    promptTextStyle.transitionProperty = 'background-position'; promptTextStyle.transitionTimingFunction = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    if (isTextAnimatedIn) { promptTextStyle.backgroundPosition = '0% 0'; promptTextStyle.transitionDuration = `${TEXT_REVEAL_DURATION_MS}ms`; }
    else promptTextStyle.transitionDuration = '0ms';
  }
  
  const brandingTextSize = isNewest ? "text-[0.55rem] xs:text-[0.6rem] sm:text-xs" : "text-[0.45rem] xs:text-[0.5rem] sm:text-[0.55rem]";
  const actionButtonBaseClasses = `rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100`;
  const actionButtonSizeClasses = isNewest ? "p-1 xs:p-1.5 sm:p-2" : "p-0.5 xs:p-1";
  const actionButtonIconSize = isNewest ? "h-4 w-4 xs:h-5 sm:h-6" : "h-3 w-3 xs:h-3.5 sm:h-4";

  let promptTextSizeClasses = "";
  if (isNewest && !showCardBackView && !showLLMDetailsView) {
     if (promptText && promptText.length > VERY_LONG_PROMPT_THRESHOLD_NEWEST) {
        promptTextSizeClasses = "text-lg xs:text-xl sm:text-2xl md:text-3xl";
     } else if (promptText && promptText.length > LONG_PROMPT_THRESHOLD) {
        promptTextSizeClasses = "text-xl xs:text-2xl sm:text-3xl md:text-4xl";
     } else {
        promptTextSizeClasses = "text-2xl xs:text-3xl sm:text-4xl md:text-5xl";
     }
  } else if (!isNewest) { 
    promptTextSizeClasses = (promptText && promptText.length > LONG_PROMPT_THRESHOLD) ? "text-[0.7rem] xs:text-xs sm:text-sm md:text-base" : "text-xs xs:text-sm sm:text-base md:text-lg";
  }

  const cardBackTitle = "Guidance"; 

  return (
    <div 
      ref={cardRef} 
      className={`${baseWidthClass} perspective break-inside-avoid-column mx-auto relative group ${isFaded ? 'transition-opacity duration-500 opacity-50' : 'opacity-100'}`}
      style={{ height: 'auto' }} 
    >
      <div style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} className="relative">
        <div className={`absolute inset-0 preserve-3d transition-transform duration-700 ease-in-out ${isRevealed ? 'rotate-y-180' : ''}`}>
          {/* Card Pre-Reveal Face */}
          <div className={`absolute w-full h-full backface-hidden ${overlayBaseClasses} ${overlayDashedBorderClasses} rounded-xl shadow-xl flex flex-col items-center justify-center p-3 sm:p-4 text-center overflow-hidden`}>
            <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
            <div className="text-4xl xs:text-5xl sm:text-6xl text-sky-500/50 font-playfair" aria-hidden="true">⦾</div>
            <p className="text-lg xs:text-xl font-semibold text-white/70 mt-1 sm:mt-2 font-playfair brand-text-container"><span className="brand-text-r">R</span>esonance</p> 
            {isNewest && !isRevealed && <p className="text-xs text-slate-400/80 mt-1">(Drawing...)</p>}
            <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
          </div>

          {/* Card Post-Reveal Face */}
          <div className={`absolute w-full h-full backface-hidden rotate-y-180 
                           ${themeColor ? `bg-gradient-to-br ${themeColor}` : 'bg-slate-900'} 
                           ${cardFaceBaseClasses} ${subtleSolidBorder}
                           ${(isRevealed && isNewest && !showLLMDetailsView && !showCardBackView) ? 'shimmer-effect' : ''} flex flex-col`}>
            <div className={`absolute inset-0 ${overlayBaseClasses} rounded-xl`}></div>

            {isRevealed && cardBackNotesText && cardBackNotesText.trim() !== "" && !showLLMDetailsView && (
              <button onClick={handleToggleCardBackView} className={`absolute top-1.5 left-1.5 xs:top-2 xs:left-2 sm:top-3 sm:left-3 ${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100`} aria-label={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`} title={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`}>
                <span className={utilityButtonIconSize} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: utilityButtonRotateIconFontSize }}>↻</span>
              </button>
            )}
            {isRevealed && llmPromptForTextGeneration && !showCardBackView && !showLLMDetailsView && (
              <button onClick={() => { setShowLLMDetailsView(true); setShowCardBackView(false); setLlmDetailsTab('input'); }} className={`absolute top-1.5 right-1.5 xs:top-2 xs:right-2 sm:top-3 sm:right-3 ${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100`} aria-label="Show LLM Details" title="Show LLM Details">
                <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </button>
            )}
            
            <div className={`relative z-10 flex flex-col flex-grow h-full ${cardPaddingClass}`}>
              {!showLLMDetailsView && <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />}
              <div className={`flex-grow overflow-y-auto hide-scrollbar scrollbar-thumb-white/40 scrollbar-track-transparent my-0.5 sm:my-1 flex flex-col w-full
                  ${showLLMDetailsView ? 'items-stretch justify-start' : showCardBackView ? 'items-center justify-start pt-0.5 sm:pt-1 md:pt-2' : 'items-center justify-center pt-3 sm:pt-4 md:pt-5 pb-3 sm:pb-4 md:pb-5'}`}>
                {showLLMDetailsView ? (
                  <div className="flex flex-col h-full w-full">
                     <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                        <div className="flex space-x-1 sm:space-x-1.5">
                          <button onClick={() => setLlmDetailsTab('input')} className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] xs:text-xs sm:text-sm rounded-md ${llmDetailsTab === 'input' ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Input</button>
                          <button onClick={() => setLlmDetailsTab('output')} className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[0.6rem] xs:text-xs sm:text-sm rounded-md ${llmDetailsTab === 'output' ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Output</button>
                        </div>
                        <button onClick={() => setShowLLMDetailsView(false)} className={`${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-20`} aria-label="Close LLM Details" title="Close LLM Details">
                           <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className={`overflow-y-auto text-slate-300 bg-slate-900/60 p-1.5 sm:p-2 md:p-3 rounded-md scrollbar-thin flex-grow text-[0.55rem] xs:text-[0.6rem] sm:text-xs`}>
                        <pre className="whitespace-pre-wrap font-normal">{llmDetailsTab === 'input' ? (llmPromptForTextGeneration || "No input details.") : (rawLlmOutput || "No raw output.")}</pre>
                      </div>
                  </div>
                ) : showCardBackView && cardBackNotesText && cardBackNotesText.trim() !== "" ? (
                  <div className="flex flex-col flex-grow w-full text-center">
                    <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                        <div className="flex-1 text-center">
                            <h4 className={`font-playfair ${themeNameSizeClasses} text-white/90 font-medium tracking-wide`}>{themeDisplayName}</h4>
                            {drawnForParticipantName && !isCulminationCard && (<span className={`block text-white/70 ${participantNameSizeClasses} font-normal tracking-wide truncate -mt-0.5`}>for {drawnForParticipantName}</span>)}
                            <h5 className={`font-playfair ${isNewest ? 'text-xs xs:text-sm' : 'text-[0.6rem] xs:text-xs'} text-slate-300 font-medium tracking-wide mt-0.5 sm:mt-1 mb-0.5 sm:mb-1.5`}>{cardBackTitle}</h5>
                        </div>
                        {cardBackNotesText && cardBackNotesText.trim() !== "" && (
                             <button onClick={handlePlayCardBackAudio} disabled={isLoadingCardBackAudio} className={`ml-1 sm:ml-2 p-0.5 sm:p-1 rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-all duration-200 ${isLoadingCardBackAudio ? 'animate-spin cursor-default' : ''} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/20`} aria-label={`Play audio for ${cardBackTitle}`} title={`Play audio for ${cardBackTitle}`}>
                                {isLoadingCardBackAudio ? (<svg className={`animate-spin ${utilityButtonIconSize}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) 
                                : (<svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>)}
                            </button>
                        )}
                    </div>
                    <div className={`flex-grow text-left overflow-y-auto scrollbar-thin pr-0.5 sm:pr-1 font-atkinson-regular`}>{renderCardBackNotes()}</div>
                  </div>
                ) : (
                  <>
                    <div className="mb-0.5 sm:mb-1 w-full text-center">
                        <h4 className={`font-playfair ${themeNameSizeClasses} text-white/90 font-medium tracking-wide truncate`}>{themeDisplayName}</h4>
                        {drawnForParticipantName && !isCulminationCard && (<span className={`block text-white/70 ${participantNameSizeClasses} font-normal tracking-wide truncate -mt-0.5`}>for {drawnForParticipantName}</span>)}
                    </div>
                    <div className={`flex-grow flex items-center justify-center ${promptTextHorizontalPadding}`}>
                        <p className={`${promptTextSizeClasses} font-semibold text-white text-center whitespace-pre-wrap`} style={promptTextStyle}>{promptText}</p>
                    </div>
                  </>
                )}
              </div> 
              {!showLLMDetailsView && (
                <div className="relative z-[1] flex justify-between items-center pt-0.5 sm:pt-1 mt-auto w-full">
                  <div className={`font-playfair ${brandingTextSize} text-white/70 select-none brand-text-container`}><span className="font-semibold"><span className="brand-text-r">R</span>esonance</span> ⦾</div>
                  <div className="flex items-center space-x-0.5 xs:space-x-1 sm:space-x-1.5">
                    <button onClick={() => onDislike(id)} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} ${feedback === 'disliked' ? 'bg-sky-700/90 text-white scale-110 ring-1 ring-sky-500' : 'bg-black/30 hover:bg-slate-600/70 text-slate-300 hover:text-white'}`} aria-label="Dislike" title="Dislike">
                      <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} viewBox="0 0 20 20" fill="currentColor"><path d="M15.707 4.293a1 1 0 00-1.414 0L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10l4.293-4.293a1 1 0 000-1.414z" /></svg>
                    </button>
                    <button onClick={() => onPlayAudioForMainPrompt({ text: promptText, audioData, audioMimeType })} disabled={(!promptText && !audioData) || isLoadingPlaceholder || (promptText && promptText.startsWith("The Resonance seems to be quiet"))} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} bg-black/30 hover:bg-sky-600/80 text-slate-300 hover:text-white disabled:opacity-50 disabled:hover:bg-black/30`} aria-label="Play Audio" title="Play Audio">
                      <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    <button onClick={() => onLike(id)} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} ${feedback === 'liked' ? 'bg-sky-700/90 text-white scale-110 ring-1 ring-sky-500' : 'bg-black/30 hover:bg-slate-600/70 text-slate-300 hover:text-white'}`} aria-label="Like" title="Like">
                      <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              )}
              {!showLLMDetailsView && <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DrawnCard = React.memo(DrawnCardComponent);