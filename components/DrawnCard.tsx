

import React, { useEffect, useState, useRef } from 'react';
import { ThemeIdentifier, CustomThemeData, MicroDeck, DeckSet, getDisplayDataForCard } from '../services/geminiService'; 
import { CornerGlyphGrid } from './CornerGlyphGrid';
import { GlyphPatternRow } from './DrawnCardsHistoryView'; 

export interface DrawnCardDisplayData {
  id: string;
  promptText: string | null; 
  themeIdentifier: ThemeIdentifier; 
  deckSetId?: string | null; 
  feedback: 'liked' | 'disliked' | null;
  audioData?: string | null; 
  audioMimeType?: string | null;
  llmPromptForTextGeneration?: string; 
  rawLlmOutput?: string | null; 
  cardBackNotesText?: string | null;
  cardBackAudioData?: string | null;
  cardBackAudioMimeType?: string | null;
  isNewest?: boolean;
  drawnForParticipantName?: string | null; 
  isLoadingPlaceholder?: boolean; 
  isFaded?: boolean; 
  themeBeingDrawnNamePlaceholder?: string | null; 
  activeParticipantNameForPlaceholder?: string | null;
  currentDrawingThemeColorForPlaceholder?: string | null; 
  isFirstEverCardForDisplay?: boolean;
}

interface DrawnCardProps extends DrawnCardDisplayData {
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onPlayAudioForMainPrompt: (audioDetails: { cardId: string; text: string | null; audioData: string | null; audioMimeType: string | null }) => void;
  onFetchAndPlayCardBackAudio: (cardId: string, textToSpeak: string) => void;
  allCustomDecksForLookup: CustomThemeData[]; 
  activeCardAudio: { cardId: string; type: 'prompt' | 'notes' } | null;
  onStopAudio: () => void;
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
  allCustomDecksForLookup = [],
  currentDrawingThemeColorForPlaceholder,
  activeCardAudio,
  onStopAudio,
  isFirstEverCardForDisplay = false,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showLLMDetailsView, setShowLLMDetailsView] = useState(false);
  const [llmDetailsTab, setLlmDetailsTab] = useState<'input' | 'output'>('input');
  const [showCardBackView, setShowCardBackView] = useState(false);
  const [isLoadingCardBackAudio, setIsLoadingCardBackAudio] = useState(false);
  const [parsedGuidance, setParsedGuidance] = useState<ParsedGuidanceSection[]>([]);
  const [showInitialButtons, setShowInitialButtons] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isTextAnimatedIn, setIsTextAnimatedIn] = useState(false);
  const [isTextFullyVisible, setIsTextFullyVisible] = useState(false); 
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstEverCardForDisplay && isNewest) {
        setShowInitialButtons(true);
        const timer = setTimeout(() => {
            setShowInitialButtons(false);
        }, 10000); // 10 seconds
        return () => clearTimeout(timer);
    }
  }, [isFirstEverCardForDisplay, isNewest, id]);


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
        if (showLLMDetailsView) setShowLLMDetailsView(false); 
    }
  };

  const handlePlayCardBackAudioInternal = async () => {
    if (!cardBackNotesText || isLoadingCardBackAudio || cardBackNotesText.trim() === "") return;
    setIsLoadingCardBackAudio(true);
    try {
        if (cardBackAudioData && cardBackAudioMimeType) {
            onPlayAudioForMainPrompt({ cardId: id, text: null, audioData: cardBackAudioData, audioMimeType: cardBackAudioMimeType });
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
    if (!parsedGuidance.length) return <p className="text-[clamp(0.65rem,1.8vh,0.85rem)] text-slate-400 font-normal text-center leading-[1.2]">No additional guidance for this card.</p>; // Adjusted size
    return (
      <div className="space-y-[1vh]">
        {parsedGuidance.map((section, index) => (
          section.content.trim() ? (
            <div key={index}>
              <h6 className="font-bold text-[clamp(0.7rem,2vh,0.9rem)] text-slate-300 mb-[0.2vh] leading-[1.2]">{section.heading}</h6> {/* Adjusted size */}
              <p className="text-[clamp(0.65rem,1.8vh,0.85rem)] text-slate-200 font-normal whitespace-pre-wrap leading-[1.2]">{section.content}</p> {/* Adjusted size */}
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

  const loadingGlyphBaseSize = "text-[clamp(1rem,3.5vh,2rem)]";
  const loadingGlyphColor = "text-slate-200/60";

  const isThisPromptAudioPlaying = activeCardAudio?.cardId === id && activeCardAudio?.type === 'prompt';
  const isThisNotesAudioPlaying = activeCardAudio?.cardId === id && activeCardAudio?.type === 'notes';

  let actionButtonOpacityClasses = "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100";
  if (showInitialButtons) {
      actionButtonOpacityClasses = "opacity-100";
  }
  const actionButtonBaseClasses = `rounded-full transition-all duration-500 ease-in-out ${actionButtonOpacityClasses}`;

  if (isLoadingPlaceholder) {
    let loadingText = `Drawing from ${themeBeingDrawnNamePlaceholder || 'a source'}...`;
    if (activeParticipantNameForPlaceholder) loadingText = `Drawing for ${activeParticipantNameForPlaceholder} from ${themeBeingDrawnNamePlaceholder || 'a source'}...`;
    
    const loadingResonanceTextStyle: React.CSSProperties = {
      fontFamily: "'Atkinson Hyperlegible', sans-serif",
      fontWeight: 200, 
      letterSpacing: '0.15em', 
      fontSize: 'clamp(1.5rem, 4.5vh, 2.5rem)',
      textTransform: 'uppercase',
      color: 'rgba(203, 213, 225, 0.8)', 
    };

    return (
      <div className={`${baseWidthClass} perspective mx-auto relative`} style={{ height: 'auto' }}>
        <div style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} className="relative">
          <div 
            className={`absolute inset-0 ${currentDrawingThemeColorForPlaceholder ? `bg-gradient-to-br ${currentDrawingThemeColorForPlaceholder}` : 'bg-slate-900'} 
                       rounded-xl shadow-xl ${subtleSolidBorder} shimmer-effect animate-pulse-slow 
                       flex flex-col items-center justify-center p-[2vh] text-center overflow-hidden`}
          >
            <div className={`absolute inset-0 ${overlayBaseClasses} rounded-xl`}></div>
            <CornerGlyphGrid position="top-left" glyphColorClass="text-slate-600" glyphSizeClass={glyphSize} gridGapClass={glyphGap}/>
            
            <div className="flex flex-col items-center justify-center flex-grow relative z-10 space-y-[0.3em] sm:space-y-[0.5em]">
              <GlyphPatternRow glyphs={[{ char: "⦾", opacity: 0.33 }]} baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor} spacingClass="gap-x-[1em]" />
              <GlyphPatternRow glyphs={[
                  { char: "⦾", opacity: 0.33 }, { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.33 }
              ]} spacingClass="gap-x-[1em]" baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor}/>
              <GlyphPatternRow glyphs={[
                  { char: "⦾", opacity: 0.33 }, { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.9 }, 
                  { char: "⟁", opacity: 0.66 }, { char: "⦾", opacity: 0.33 }
              ]} spacingClass="gap-x-[1em]" baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor}/>
              <div className="my-[0.5em] sm:my-[0.8em]"><p style={loadingResonanceTextStyle}>RESONANCE</p></div>
              <GlyphPatternRow glyphs={[
                  { char: "⟁", opacity: 0.33 }, { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.9 }, 
                  { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.33 }
              ]} spacingClass="gap-x-[1em]" baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor}/>
              <GlyphPatternRow glyphs={[
                  { char: "⟁", opacity: 0.33 }, { char: "⦾", opacity: 0.66 }, { char: "⟁", opacity: 0.33 }
              ]} spacingClass="gap-x-[1em]" baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor}/>
              <GlyphPatternRow glyphs={[{ char: "⟁", opacity: 0.33 }]} baseSizeClass={loadingGlyphBaseSize} colorClass={loadingGlyphColor} spacingClass="gap-x-[1em]" />
              <p className="text-[clamp(0.65rem,2vh,0.9rem)] text-slate-300/80 mt-[1vh] relative z-10">{loadingText}</p>
            </div>
            <CornerGlyphGrid position="bottom-right" glyphColorClass="text-slate-600" glyphSizeClass={glyphSize} gridGapClass={glyphGap}/>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isRevealed && !promptText && !isLoadingPlaceholder) return null;

  const { name: themeDisplayName, colorClass: themeColor } = getDisplayDataForCard(themeIdentifier, deckSetId || null, allCustomDecksForLookup);
  
  const themeNameSizeClasses = isNewest ? "text-[clamp(0.6rem,1.8vw,0.9rem)]" : "text-[clamp(0.55rem,1.5vw,0.8rem)]";
  const participantNameSizeClasses = isNewest ? "text-[clamp(0.55rem,1.6vw,0.85rem)]" : "text-[clamp(0.5rem,1.4vw,0.75rem)]";
  const utilityButtonIconSize = isNewest ? "h-[2.8vh] w-[2.8vh] max-h-6 max-w-6" : "h-[2.2vh] w-[2.2vh] max-h-5 max-w-5";
  const utilityButtonPadding = isNewest ? "p-[1vh]" : "p-[0.8vh]";
  const utilityButtonRotateIconFontSize = isNewest ? 'text-[clamp(0.75rem,1.8vh,1.1rem)]' : 'text-[clamp(0.6rem,1.5vh,0.9rem)]';
  const cardPaddingClass = isNewest ? "p-[2vh]" : "p-[1.5vh]"; 
  const promptTextHorizontalPadding = isNewest ? "px-[3vw]" : "px-[2vw]"; 
  
  const promptTextStyle: React.CSSProperties = { textWrap: 'balance' as any, lineHeight: '1.2' };
  if (!isNewest || isTextFullyVisible) promptTextStyle.color = 'white';
  else { 
    promptTextStyle.color = 'transparent'; promptTextStyle.backgroundImage = 'linear-gradient(105deg, white 50%, transparent 70%)';
    promptTextStyle.backgroundRepeat = 'no-repeat'; promptTextStyle.backgroundClip = 'text'; promptTextStyle.WebkitBackgroundClip = 'text';
    promptTextStyle.backgroundSize = '200% 100%'; promptTextStyle.backgroundPosition = '100% 0'; 
    promptTextStyle.transitionProperty = 'background-position'; promptTextStyle.transitionTimingFunction = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    if (isTextAnimatedIn) { promptTextStyle.backgroundPosition = '0% 0'; promptTextStyle.transitionDuration = `${TEXT_REVEAL_DURATION_MS}ms`; }
    else promptTextStyle.transitionDuration = '0ms';
  }
  
  const actionButtonSizeClasses = isNewest ? "p-[1vh]" : "p-[0.8vh]";
  const actionButtonIconSize = isNewest ? "h-[2.8vh] w-[2.8vh] max-h-6 max-w-6" : "h-[2.2vh] w-[2.2vh] max-h-5 max-w-5";

  let promptTextSizeClasses = "font-normal"; 
  if (isNewest && !showCardBackView && !showLLMDetailsView) {
     if (promptText && promptText.length > VERY_LONG_PROMPT_THRESHOLD_NEWEST) {
        promptTextSizeClasses = "text-[clamp(0.9rem,2.5vw,1.5rem)] font-normal"; 
     } else if (promptText && promptText.length > LONG_PROMPT_THRESHOLD) {
        promptTextSizeClasses = "text-[clamp(1rem,3vw,1.75rem)] font-normal";    
     } else {
        promptTextSizeClasses = "text-[clamp(1.1rem,3.5vw,2rem)] font-normal";   
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


  return (
    <div 
      ref={cardRef} 
      className={`${baseWidthClass} perspective break-inside-avoid-column mx-auto relative group opacity-100`} 
      style={{ height: 'auto' }} 
    >
      <div style={{ paddingTop: `${CARD_ASPECT_RATIO_MULTIPLIER * 100}%` }} className="relative">
        <div className={`absolute inset-0 preserve-3d transition-transform duration-700 ease-in-out ${isRevealed ? 'rotate-y-180' : ''}`}>
          {/* Card Pre-Reveal Face */}
          <div className={`absolute w-full h-full backface-hidden ${overlayBaseClasses} ${overlayDashedBorderClasses} rounded-xl shadow-xl flex flex-col items-center justify-center p-[2vh] text-center overflow-hidden`}>
            <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
             <div className="flex flex-col items-center justify-center space-y-0"> 
                <div style={preRevealLogoTextStyle}>RESONANCE</div>
            </div>
            {isNewest && !isRevealed && <p className="text-[clamp(0.6rem,1.8vh,0.8rem)] text-slate-400/80 mt-[0.5vh] font-normal">(Drawing...)</p>}
            <CornerGlyphGrid position="bottom-right" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />
          </div>

          {/* Card Post-Reveal Face */}
          <div className={`absolute w-full h-full backface-hidden rotate-y-180 
                           ${themeColor ? `bg-gradient-to-br ${themeColor}` : 'bg-slate-900'} 
                           ${cardFaceBaseClasses} ${subtleSolidBorder}
                           ${(isRevealed && isNewest && !showLLMDetailsView && !showCardBackView) ? 'shimmer-effect' : ''} flex flex-col`}>
            <div className={`absolute inset-0 ${overlayBaseClasses} rounded-xl`}></div>

            {isRevealed && cardBackNotesText && cardBackNotesText.trim() !== "" && !showLLMDetailsView && (
              <button onClick={handleToggleCardBackView} className={`absolute top-[1vh] left-[1vh] ${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100`} aria-label={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`} title={showCardBackView ? "Show Prompt Text" : `Show ${cardBackTitle}`}>
                <span className={`${utilityButtonIconSize} flex items-center justify-center ${utilityButtonRotateIconFontSize}`}>↻</span>
              </button>
            )}
            {isRevealed && llmPromptForTextGeneration && !showCardBackView && !showLLMDetailsView && (
              <button onClick={() => { setShowLLMDetailsView(true); setShowCardBackView(false); setLlmDetailsTab('input'); }} className={`absolute top-[1vh] right-[1vh] ${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100`} aria-label="Show LLM Details" title="Show LLM Details">
                <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </button>
            )}
            
            <div className={`relative z-10 flex flex-col flex-grow h-full ${cardPaddingClass}`}>
              {!showLLMDetailsView && <CornerGlyphGrid position="top-left" glyphColorClass={glyphColor} glyphSizeClass={glyphSize} gridGapClass={glyphGap} />}
              <div className={`flex-grow overflow-y-auto hide-scrollbar scrollbar-thumb-white/40 scrollbar-track-transparent my-[0.5vh] flex flex-col w-full
                  ${showLLMDetailsView ? 'items-stretch justify-start' : showCardBackView ? 'items-center justify-start pt-[0.5vh] md:pt-[1vh]' : 'items-center justify-center pt-[1vh] md:pt-[1.5vh] pb-[1vh] md:pb-[1.5vh]'}`}>
                {showLLMDetailsView ? (
                  <div className="flex flex-col h-full w-full">
                     <div className="flex items-center justify-between mb-[0.5vh]">
                        <div className="flex space-x-[0.5vw]">
                          <button onClick={() => setLlmDetailsTab('input')} className={`px-[1vw] py-[0.3vh] text-[clamp(0.6rem,1.5vh,0.8rem)] rounded-md ${llmDetailsTab === 'input' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 font-normal'}`}>Input</button>
                          <button onClick={() => setLlmDetailsTab('output')} className={`px-[1vw] py-[0.3vh] text-[clamp(0.6rem,1.5vh,0.8rem)] rounded-md ${llmDetailsTab === 'output' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 font-normal'}`}>Output</button>
                        </div>
                        <button onClick={() => setShowLLMDetailsView(false)} className={`${utilityButtonPadding} rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors duration-200 z-20`} aria-label="Close LLM Details" title="Close LLM Details">
                           <svg xmlns="http://www.w3.org/2000/svg" className={utilityButtonIconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className={`overflow-y-auto text-slate-300 bg-slate-900/60 p-[1vh] rounded-md scrollbar-thin flex-grow text-[clamp(0.55rem,1.2vh,0.75rem)]`}>
                        <pre className="whitespace-pre-wrap font-atkinson-mono font-normal">{llmDetailsTab === 'input' ? (llmPromptForTextGeneration || "No input details.") : (rawLlmOutput || "No raw output.")}</pre>
                      </div>
                  </div>
                ) : showCardBackView && cardBackNotesText && cardBackNotesText.trim() !== "" ? (
                  <div className="flex flex-col flex-grow w-full text-center">
                    <div className="flex justify-between items-center mb-[0.5vh]">
                        <div className="flex-1 text-center">
                            <h4 className={`${themeNameSizeClasses} text-white/90 font-normal tracking-wide leading-[1.2]`} style={themeDisplayTitleStyle}>{themeDisplayName}</h4>
                            {drawnForParticipantName && (<span className={`block text-white/70 ${participantNameSizeClasses} font-normal tracking-wide truncate -mt-[0.2vh] leading-[1.2]`}>for {drawnForParticipantName}</span>)}
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
                    <div className="mb-[0.5vh] w-full text-center">
                        <h4 className={`${themeNameSizeClasses} text-white/90 font-normal tracking-wide truncate leading-[1.2]`} style={themeDisplayTitleStyle}>{themeDisplayName}</h4>
                        {drawnForParticipantName && (<span className={`block text-white/70 ${participantNameSizeClasses} font-normal tracking-wide truncate -mt-[0.2vh] leading-[1.2]`}>for {drawnForParticipantName}</span>)}
                    </div>
                    <div className={`flex-grow flex items-center justify-center ${promptTextHorizontalPadding}`}>
                        <p className={`${promptTextSizeClasses} text-white text-center whitespace-pre-wrap`} style={promptTextStyle}>{promptText}</p>
                    </div>
                  </>
                )}
              </div> 
              {!showLLMDetailsView && (
                <div className="relative z-[1] flex justify-between items-center pt-[0.5vh] mt-auto w-full">
                  <div className="flex flex-col items-start text-white/70 select-none">
                    <div style={cardLogoTextStyle}>RESONANCE</div>
                  </div>
                  <div className="flex items-center space-x-[0.8vw]">
                    <button onClick={() => onDislike(id)} className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} ${feedback === 'disliked' ? 'bg-sky-700/90 text-white scale-110 ring-1 ring-sky-500' : 'bg-black/30 hover:bg-slate-600/70 text-slate-300 hover:text-white'}`} aria-label="Dislike" title="Dislike">
                      <svg xmlns="http://www.w3.org/2000/svg" className={actionButtonIconSize} viewBox="0 0 20 20" fill="currentColor"><path d="M15.707 4.293a1 1 0 00-1.414 0L10 8.586 5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10l4.293-4.293a1 1 0 000-1.414z" /></svg>
                    </button>
                    <button 
                      onClick={isThisPromptAudioPlaying ? onStopAudio : () => onPlayAudioForMainPrompt({ cardId: id, text: promptText, audioData, audioMimeType })} 
                      disabled={(!promptText && !audioData) || isLoadingPlaceholder || (promptText && promptText.startsWith("The Resonance seems to be quiet"))} 
                      className={`${actionButtonBaseClasses} ${actionButtonSizeClasses} bg-black/30 hover:bg-sky-600/80 text-slate-300 hover:text-white disabled:opacity-50 disabled:hover:bg-black/30`} 
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