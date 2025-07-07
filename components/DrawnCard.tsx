
import React, { useEffect, useState, useRef } from 'react';
import { ThemeIdentifier, CustomThemeData, getDisplayDataForCard, DrawnCardData } from '../services/geminiService'; 
import { CornerGlyphGrid } from './CornerGlyphGrid';
import { CountdownTimer } from './CountdownTimer';

export interface DrawnCardDisplayData {
  id: string;
  promptText: string;
  themedDeckId: ThemeIdentifier; 
  feedback: 'liked' | 'disliked' | null;
  audioData: string | null; 
  audioMimeType: string | null;
  cardBackNotesText: string | null;
  isNewest?: boolean;
  drawnForParticipantName?: string | null; 
  isFaded?: boolean; 
  isTimed?: boolean;
  timerDuration?: number | null;
  isCompletedActivity?: boolean;
  isFollowUp?: boolean;
  activeFollowUpCard?: DrawnCardData | null;
  followUpPromptText?: string | null;
  hasFollowUp: boolean; // Add this prop explicitly
}

interface DrawnCardProps extends DrawnCardDisplayData {
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onPlayAudioForMainPrompt: (audioDetails: { cardId: string; text: string | null; audioData: string | null; audioMimeType: string | null }) => void;
  onFetchAndPlayCardBackAudio: (cardId: string, textToSpeak: string) => void;
  onTimerEnd: (id: string) => void;
  onRedoTimedActivity: (id: string) => void;
  allCustomDecksForLookup: CustomThemeData[]; 
  activeCardAudio: { cardId: string; type: 'prompt' | 'notes' } | null;
  onStopAudio: () => void;
}

const CARD_ASPECT_RATIO_MULTIPLIER = 7 / 5; 
const LONG_PROMPT_THRESHOLD = 240; 
const VERY_LONG_PROMPT_THRESHOLD_NEWEST = 300;


interface ParsedGuidanceSection {
    heading: string;
    content: string;
}

const DrawnCardComponent: React.FC<DrawnCardProps> = (props) => {
  const {
    id,
    promptText,
    themedDeckId,
    feedback,
    audioData, 
    audioMimeType,
    cardBackNotesText,
    isNewest = false,
    drawnForParticipantName,
    onLike,
    onDislike,
    onPlayAudioForMainPrompt,
    onFetchAndPlayCardBackAudio,
    onTimerEnd,
    onRedoTimedActivity,
    isFaded = false, 
    allCustomDecksForLookup = [],
    activeCardAudio,
    onStopAudio,
    isTimed,
    timerDuration,
    isCompletedActivity,
    isFollowUp,
    activeFollowUpCard,
    hasFollowUp,
  } = props;

  const [isRevealed, setIsRevealed] = useState(!isNewest);
  const [showCardBackView, setShowCardBackView] = useState(false);
  const [isLoadingCardBackAudio, setIsLoadingCardBackAudio] = useState(false);
  const [parsedGuidance, setParsedGuidance] = useState<ParsedGuidanceSection[]>([]);
  const [isFollowUpOnTop, setIsFollowUpOnTop] = useState(true);
  
  const hasPlayedAudioRef = useRef(false);
  const cardFlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowCardBackView(false);
    setIsLoadingCardBackAudio(false);
    hasPlayedAudioRef.current = false;
    
    if (activeFollowUpCard) {
      setIsFollowUpOnTop(true);
    }

    if (isNewest && !activeFollowUpCard) {
        setIsRevealed(false); 
        const revealTimer = setTimeout(() => setIsRevealed(true), 100);
        return () => clearTimeout(revealTimer);
    } else {
        setIsRevealed(true);
    }
  }, [id, isNewest, activeFollowUpCard]);
  

  useEffect(() => {
    const cardNode = cardFlipRef.current;
    
    const handleTransitionEnd = () => {
      // Play audio for the newest card once it's revealed, unless it's a follow-up (handled by App.tsx)
      if (isRevealed && isNewest && !hasPlayedAudioRef.current && !isFollowUp && !isTimed) {
          hasPlayedAudioRef.current = true;
          onPlayAudioForMainPrompt({ cardId: id, text: promptText, audioData, audioMimeType });
      }
    };

    if (cardNode) {
        cardNode.addEventListener('transitionend', handleTransitionEnd);
    }

    // Direct audio play for timed cards, as they don't have a flip animation
    if (isRevealed && isNewest && !hasPlayedAudioRef.current && isTimed && !isFollowUp) {
      hasPlayedAudioRef.current = true;
      onPlayAudioForMainPrompt({ cardId: id, text: promptText, audioData, audioMimeType });
    }

    return () => {
        if (cardNode) {
            cardNode.removeEventListener('transitionend', handleTransitionEnd);
        }
    };
  }, [isRevealed, isNewest, id, promptText, audioData, audioMimeType, onPlayAudioForMainPrompt, isFollowUp, isTimed]);


  const cardFaceBaseClasses = "rounded-xl shadow-xl flex flex-col overflow-hidden font-normal"; 
  const subtleSolidBorder = "border border-slate-700/60"; 
  const overlayBaseClasses = "bg-slate-800/40"; 
  const overlayDashedBorderClasses = "border-2 border-dashed border-slate-600";
  
  const glyphColor = "text-white/70"; 
  const glyphSize = isNewest ? "text-[clamp(1rem,2.5vh,1.5rem)]" : "text-[clamp(0.8rem,2vh,1.2rem)]";
  const glyphGap = isNewest ? "gap-[0.5vh]" : "gap-[0.3vh]";

  const handleToggleCardBackView = () => {
    if (cardBackNotesText && cardBackNotesText.trim() !== "") { 
        setShowCardBackView(prev => !prev);
    }
  };

  const handlePlayCardBackAudioInternal = async () => {
    if (!cardBackNotesText || isLoadingCardBackAudio || cardBackNotesText.trim() === "") return;
    setIsLoadingCardBackAudio(true);
    try {
        await onFetchAndPlayCardBackAudio(id, cardBackNotesText);
    } catch (error) { console.error("Error initiating card back audio playback:", error); }
    finally { setIsLoadingCardBackAudio(false); }
  };
  
  const GUIDANCE_HEADINGS = ["The Idea", "Getting Started", "Deeper Dive", "Explore Further"];
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
            if (nextHeadingActualIndex !== -1) contentEndIndex = Math.min(contentEndIndex, nextHeadingActualIndex);
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
    if (!parsedGuidance.length) return <p className="text-[clamp(0.8rem,2.2vh,1.1rem)] text-slate-400 font-normal text-center leading-[1.2]">No additional guidance for this card.</p>;
    return (
      <div className="space-y-[1.2vh]">
        {parsedGuidance.map((section, index) => (
          section.content.trim() ? (
            <div key={index}>
              <h6 className="font-bold text-[clamp(0.8rem,2vh,1.05rem)] text-slate-300 mb-[0.2vh] leading-snug">{section.heading}</h6>
              <p className="text-[clamp(0.75rem,1.9vh,0.95rem)] text-slate-200 font-normal whitespace-pre-wrap leading-snug">{section.content}</p>
            </div>
          ) : null
        ))}
      </div>
    );
  };

  const baseWidthClass = isNewest 
    ? "w-[75vw] sm:w-[65vw] md:w-[55vw] lg:w-[45vw] max-w-md" 
    : "w-[40vw] xs:w-[35vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] max-w-xs"; 

  const cardLogoBaseStyle: React.CSSProperties = {
    fontFamily: "'Atkinson Hyperlegible', sans-serif",
    fontWeight: 200, 
    textTransform: 'uppercase',
  };
  
  const cardLogoTextStyle = {
    ...cardLogoBaseStyle,
    letterSpacing: '0.1em', 
    fontSize: isNewest ? 'clamp(0.5rem, 1.4vw, 0.75rem)' : 'clamp(0.4rem, 1.2vw, 0.65rem)',
    lineHeight: 1.2,
    color: 'rgba(255,255,255,0.7)',
  };

  const isThisPromptAudioPlaying = activeCardAudio?.cardId === id && activeCardAudio?.type === 'prompt';
  const isThisNotesAudioPlaying = activeCardAudio?.cardId === id && activeCardAudio?.type === 'notes';

  const utilityAndActionButtonsVisibilityClasses = isNewest
    ? 'opacity-80 hover:opacity-100'
    : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100';

  const actionButtonBaseClasses = `rounded-full transition-all duration-300 ease-in-out ${utilityAndActionButtonsVisibilityClasses}`;
  
  const { name: themeDisplayName, colorClass: themeColor } = getDisplayDataForCard(themedDeckId, allCustomDecksForLookup);
  
  const themeNameSizeClasses = isNewest ? "text-[clamp(0.6rem,1.8vw,0.9rem)]" : "text-[clamp(0.55rem,1.5vw,0.8rem)]";
  const participantNameSizeClasses = isNewest ? "text-[clamp(0.55rem,1.6vw,0.85rem)]" : "text-[clamp(0.5rem,1.4vw,0.75rem)]";
  const utilityButtonIconSize = isNewest ? "h-[2.8vh] w-[2.8vh] max-h-6 max-w-6" : "h-[2.2vh] w-[2.2vh] max-h-5 max-w-5";
  const utilityButtonPadding = isNewest ? "p-[1vh]" : "p-[0.8vh]";
  const utilityButtonRotateIconFontSize = isNewest ? 'text-[clamp(0.75rem,1.8vh,1.1rem)]' : 'text-[clamp(0.6rem,1.5vh,0.9rem)]';
  const cardPaddingClass = isNewest ? "p-[2vh]" : "p-[1.5vh]"; 
  const promptTextHorizontalPadding = isNewest ? "px-[3vw]" : "px-[2vw]"; 
  
  const promptTextStyle: React.CSSProperties = { textWrap: 'balance' as any, lineHeight: '1.2' };
  
  const actionButtonSizeClasses = isNewest ? "p-[1vh]" : "p-[0.8vh]";
  const actionButtonIconSize = isNewest ? "h-[2.8vh] w-[2.8vh] max-h-6 max-w-6" : "h-[2.2vh] w-[2.2vh] max-h-5 max-w-5";

  let promptTextSizeClasses = "font-normal"; 
  if (isNewest && !showCardBackView) {
      if (isTimed) {
        promptTextSizeClasses = "text-[clamp(1rem,3vw,1.8rem)] font-normal";
      } else if (promptText && promptText.length > VERY_LONG_PROMPT_THRESHOLD_NEWEST) {
        promptTextSizeClasses = "text-[clamp(1rem,2.8vw,1.65rem)] font-normal"; 
     } else if (promptText && promptText.length > LONG_PROMPT_THRESHOLD) {
        promptTextSizeClasses = "text-[clamp(1.1rem,3.5vw,1.9rem)] font-normal";    
     } else {
        promptTextSizeClasses = "text-[clamp(1.2rem,4vw,2.2rem)] font-normal";   
     }
  } else if (!isNewest) { 
    promptTextSizeClasses = (promptText && promptText.length > LONG_PROMPT_THRESHOLD) ? "text-[clamp(0.7rem,2.2vw,1rem)] font-normal" : "text-[clamp(0.75rem,2.5vw,1.1rem)] font-normal";
  }

  const cardBackTitle = "Guidance"; 
  const preRevealLogoTextStyle: React.CSSProperties = {
    ...cardLogoBaseStyle,
    fontSize: isNewest ? 'clamp(1.5rem, 4.5vh, 2.5rem)' : 'clamp(1.2rem, 3.5vh, 2rem)',
    letterSpacing: '0.1em',
    color: 'rgba(203, 213, 225, 0.9)', 
  };

  const themeDisplayTitleStyle: React.CSSProperties = {
    fontFamily: "'Atkinson Hyperlegible', sans-serif",
    fontWeight: 400, 
  }

  const rotationClass = isRevealed ? 'rotate-y-180' : '';
  
  const handleToggleStack = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (activeFollowUpCard) {
          setIsFollowUpOnTop(prev => !prev);
      }
  };

  const renderFollowUpCard = () => {
    if (!activeFollowUpCard) return null;

    const followUpProps: DrawnCardProps = {
        ...props,
        ...activeFollowUpCard,
        id: activeFollowUpCard.id,
        promptText: activeFollowUpCard.text,
        isNewest: props.isNewest,
        isFollowUp: true,
        activeFollowUpCard: null,
        hasFollowUp: true, // A follow up card is part of a set
        onRedoTimedActivity: () => {},
    };

    return (
        <div 
          className={`absolute inset-0 transition-all duration-500 ease-in-out
          ${isFollowUpOnTop ? 'z-20' : 'z-10 transform translate-x-3 -translate-y-3 rotate-2'}`}
        >
            <DrawnCard {...followUpProps} />
        </div>
    );
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompletedActivity && isTimed && onRedoTimedActivity && !activeFollowUpCard) {
        onRedoTimedActivity(id);
    }
  }
  
  const StackNav = () => {
      if (!hasFollowUp || !isNewest) return null;

      const displayText = activeFollowUpCard ? (isFollowUpOnTop ? '2/2' : '1/2') : '1/2';
      const disableNext = !activeFollowUpCard || isFollowUpOnTop;
      const disablePrev = !isFollowUpOnTop;

      return(
        <div className="absolute top-[1.5vh] right-[1.5vh] z-30 select-none flex items-center bg-black/40 text-white text-[clamp(0.6rem,1.5vh,0.8rem)] font-bold rounded-full shadow-lg">
            <button onClick={handleToggleStack} className="px-2 py-0.5 hover:bg-white/20 rounded-l-full disabled:opacity-50 disabled:cursor-not-allowed" disabled={disablePrev} aria-label="Previous card in stack">{'<'}</button>
            <span className="px-1">{displayText}</span>
            <button onClick={handleToggleStack} className="px-2 py-0.5 hover:bg-white/20 rounded-r-full disabled:opacity-50 disabled:cursor-not-allowed" disabled={disableNext} aria-label="Next card in stack">{'>'}</button>
        </div>
      );
  }

  const parentCursorClass = isCompletedActivity && isTimed && !activeFollowUpCard ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseWidthClass} perspective break-inside-avoid-column mx-auto relative group`} 
      style={{
          height: 'auto',
          transform: `scale(${isNewest && activeFollowUpCard ? 0.95 : 1})`,
          transition: 'transform 0.4s ease-out',
      }}
    >
      <StackNav />
      <div 
        style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} 
        className={`relative`}
      >
        <div 
            className={`absolute inset-0 transition-all duration-500 ease-in-out
             ${!isFollowUpOnTop ? 'z-20' : `z-10 ${activeFollowUpCard ? '' : parentCursorClass} transform -translate-x-3 translate-y-3 -rotate-2`}`}
            onClick={handleCardClick}
        >
          <div ref={cardFlipRef} className={`absolute inset-0 preserve-3d transition-transform duration-700 ease-in-out ${rotationClass}`}>
            {/* Card Pre-Reveal Face (Back) */}
            <div className={`absolute w-full h-full backface-hidden ${overlayBaseClasses} ${overlayDashedBorderClasses} rounded-xl shadow-xl flex flex-col items-center justify-center p-[2vh] text-center overflow-hidden`}>
              <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
               <div className="flex flex-col items-center justify-center space-y-0"> 
                  <div style={preRevealLogoTextStyle}>RESONANCE</div>
              </div>
              <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
            </div>

            {/* Card Post-Reveal Face (Front) */}
            <div className={`absolute w-full h-full backface-hidden rotate-y-180 
                            ${themeColor ? `bg-gradient-to-br ${themeColor}` : 'bg-slate-900'} 
                            ${cardFaceBaseClasses} ${subtleSolidBorder}
                            ${(isRevealed && isNewest && !showCardBackView && !activeFollowUpCard) ? 'shimmer-effect' : ''} flex flex-col ${isFaded ? 'opacity-40' : ''}`}>
              
              <div className="absolute inset-0 bg-slate-800/40 rounded-xl"></div>
              
              <div className={`relative z-10 flex flex-col flex-grow h-full ${cardPaddingClass}`}>
                <div className="absolute top-[1.5vh] left-[1.5vh] z-20">
                   {isRevealed && cardBackNotesText && cardBackNotesText.trim() !== "" && (
                      <button onClick={handleToggleCardBackView} className={`${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 ${utilityAndActionButtonsVisibilityClasses}`} aria-label={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`} title={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`}>
                        <span className={`${utilityButtonIconSize} flex items-center justify-center ${utilityButtonRotateIconFontSize}`}>↻</span>
                      </button>
                    )}
                </div>

                <div className={`flex-grow overflow-y-auto hide-scrollbar scrollbar-thumb-white/40 my-[0.5vh] flex flex-col w-full
                    ${showCardBackView ? 'items-center justify-start pt-[0.5vh] md:pt-[1vh]' : 'items-center justify-center pt-[1vh] md:pt-[1.5vh] pb-[1vh] md:pb-[1.5vh]'}`}>
                  {showCardBackView && cardBackNotesText && cardBackNotesText.trim() !== "" ? (
                    <div className="flex flex-col flex-grow w-full text-center">
                      <div className="flex justify-between items-center mb-[0.5vh]">
                          <div className="flex-1 text-center">
                              <h4 className={`text-white/90 font-normal tracking-wide leading-[1.2] text-[clamp(0.6rem,1.6vw,0.85rem)]`} style={themeDisplayTitleStyle}>{themeDisplayName}</h4>
                              {drawnForParticipantName && (<span className={`block text-white/70 font-normal tracking-wide truncate -mt-[0.2vh] leading-[1.2] text-[clamp(0.55rem,1.5vw,0.8rem)]`}>for {drawnForParticipantName}</span>)}
                              <h5 className={`text-[clamp(0.7rem,1.8vh,1rem)] text-slate-300 font-bold tracking-wide mt-[0.5vh] mb-[0.8vh] leading-[1.2]`}>{cardBackTitle}</h5>
                          </div>
                          {cardBackNotesText && cardBackNotesText.trim() !== "" && (
                              <button 
                                  onClick={isThisNotesAudioPlaying ? onStopAudio : handlePlayCardBackAudioInternal} 
                                  disabled={isLoadingCardBackAudio} 
                                  className={`ml-[0.5vw] p-[0.8vh] rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-all duration-200 ${isLoadingCardBackAudio ? 'animate-spin cursor-default' : ''} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/20`} 
                                  aria-label={isThisNotesAudioPlaying ? `Stop audio for ${cardBackTitle}` : `Play audio for ${cardBackTitle}`} 
                                  title={isThisNotesAudioPlaying ? `Stop audio for ${cardBackTitle}` : `Play audio for ${cardBackTitle}`}
                              >
                                  {isLoadingCardBackAudio ? (<svg className={`animate-spin ${utilityButtonIconSize}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) 
                                  : isThisNotesAudioPlaying ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 10v4M15 10v4" /></svg>
                                  ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  )}
                              </button>
                          )}
                      </div>
                      <div className={`flex-grow text-left overflow-y-auto scrollbar-thin pr-[0.5vw] font-normal`}>{renderCardBackNotes()}</div>
                    </div>
                  ) : (
                    <>
                      {!showCardBackView && <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />}
                      <div className="mb-[0.5vh] w-full text-center">
                          <h4 className={`${themeNameSizeClasses} text-white/90 font-normal tracking-wide truncate leading-[1.2]`} style={themeDisplayTitleStyle}>{themeDisplayName}</h4>
                          {drawnForParticipantName && (<span className={`block text-white/70 ${participantNameSizeClasses} font-normal tracking-wide truncate -mt-[0.2vh] leading-[1.2]`}>for {drawnForParticipantName}</span>)}
                      </div>
                      <div className={`flex-grow flex items-center justify-center ${promptTextHorizontalPadding}`}>
                          <p className={`${promptTextSizeClasses} text-white text-center whitespace-pre-wrap`} style={promptTextStyle}>{promptText}</p>
                      </div>
                      {!showCardBackView && <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />}
                    </>
                  )}
                </div>
                
                <div className="flex-shrink-0 w-full pt-1">
                  {isTimed && !isCompletedActivity && isNewest && !isFollowUp && (
                      timerDuration != null && timerDuration > 0 ? (
                          <CountdownTimer duration={timerDuration} onEnd={() => onTimerEnd(id)} />
                      ) : timerDuration === 0 ? (
                          <div className="flex items-center justify-center p-3">
                              <button
                                  onClick={() => onTimerEnd(id)}
                                  className="px-6 py-2 bg-sky-600 text-white font-bold rounded-full hover:bg-sky-500 transition-colors shadow-lg"
                              >
                                  Continue
                              </button>
                          </div>
                      ) : null
                  )}
                </div>
                
                <div className="relative z-[1] flex-shrink-0 flex justify-between items-center w-full mt-auto">
                    <div className="flex flex-col items-start text-white/70 select-none">
                       <div style={cardLogoTextStyle} className={`transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>RESONANCE</div>
                    </div>
                    <div className={`flex items-center space-x-[0.8vw] transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                      <button onClick={() => onDislike(id)} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} ${feedback === 'disliked' ? 'bg-sky-700/90 text-white scale-110 ring-1 ring-sky-500' : 'bg-black/30 hover:bg-slate-600/70 text-slate-300 hover:text-white'}`} aria-label="Dislike" title="Dislike">
                        <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} viewBox="0 0 20 20" fill="currentColor"><path d="M15.707 4.293a1 1 0 00-1.414 0L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10l4.293-4.293a1 1 0 000-1.414z" /></svg>
                      </button>
                      <button 
                        onClick={isThisPromptAudioPlaying ? onStopAudio : () => onPlayAudioForMainPrompt({ cardId: id, text: promptText, audioData, audioMimeType })} 
                        disabled={!promptText || (promptText && promptText.startsWith("The Resonance seems to be quiet")) || (isTimed && !isCompletedActivity && !activeFollowUpCard)} 
                        className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} bg-black/30 hover:bg-sky-600/80 text-slate-300 hover:text-white disabled:opacity-50 disabled:hover:bg-black/30 disabled:cursor-not-allowed`} 
                        aria-label={isThisPromptAudioPlaying ? "Stop Audio" : "Play Audio"} 
                        title={isThisPromptAudioPlaying ? "Stop Audio" : "Play Audio"}
                      >
                        {isThisPromptAudioPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 10v4M15 10v4" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </button>
                      <button onClick={() => onLike(id)} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} ${feedback === 'liked' ? 'bg-sky-700/90 text-white scale-110 ring-1 ring-sky-500' : 'bg-black/30 hover:bg-slate-600/70 text-slate-300 hover:text-white'}`} aria-label="Like" title="Like">
                        <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        {renderFollowUpCard()}
      </div>
    </div>
  );
};

export const DrawnCard = React.memo(DrawnCardComponent);