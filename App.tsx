

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DrawnCardDisplayData as SingleDrawnCardData } from './components/DrawnCard'; 
import { 
  generatePromptAndAudioFromGemini, GeminiPromptResponse as GeminiServiceResponse, 
  CustomThemeData, CustomThemeId, ThemeIdentifier, DeckSet, MicroDeck,
  VoiceName, LanguageCode, DEFAULT_VOICE_NAME, DEFAULT_LANGUAGE_CODE, GOOGLE_VOICES, LANGUAGES,
  GroupSetting, DEFAULT_GROUP_SETTING, GROUP_SETTINGS,
  DECK_SETS, ALL_MICRO_DECKS,
  getMicroDeckById, getCustomDeckById, getDeckSetById, getDisplayDataForCard,
  generateAudioForText, getStyleDirectiveForMicroDeck
} from './services/geminiService';
import { playAudioData, speakText, stopSpeechServicePlayback } from './services/speechService'; 
import { 
    MusicService, MusicSessionState, WeightedPrompt as LyriaWeightedPrompt, LiveMusicGenerationConfig as LyriaConfig 
    // Scale was previously imported from here
} from './services/musicService';
import { Scale } from '@google/genai'; // Import Scale directly from @google/genai
import { ApiKeyMessage } from './components/ApiKeyMessage';
import { ThemeDeckSelection } from './components/ThemeDeckSelection';
import { DrawnCardsHistoryView } from './components/DrawnCardsHistoryView';
import { BottomToolbar, Participant } from './components/BottomToolbar';
import { CustomDeckModal } from './components/CustomDeckModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { DeckInfoModal } from './components/DeckInfoModal'; 
import { GroupSettingModal } from './components/GroupSettingModal';
import { SvenAndLisaOnboardingModal } from './components/SvenAndLisaOnboardingModal';
import { PaulinaAndJoeOnboardingModal } from './components/PaulinaAndJoeOnboardingModal';


const MAX_HISTORY_WITH_AUDIO = 13; 

export interface DrawnCardData extends GeminiServiceResponse { 
  id: string;
  themeIdentifier: ThemeIdentifier; // MicroDeckId or CustomThemeId
  deckSetId?: string | null; // ID of the DeckSet it was drawn from, if applicable
  feedback: 'liked' | 'disliked' | null;
  timestamp: number;
  drawnForParticipantId?: string | null;
  drawnForParticipantName?: string | null;
  isFaded?: boolean; 
  cardBackAudioData?: string | null; 
  cardBackAudioMimeType?: string | null;
}

const LOCALSTORAGE_KEYS = {
  CUSTOM_DECKS: 'resonanceClio_customDecks_v3',
  VOICE_NAME: 'resonanceClio_selectedVoiceName_v1',
  LANGUAGE_CODE: 'resonanceClio_selectedLanguageCode_v1',
  IS_MUTED: 'resonanceClio_isAudioMuted_v1',
  GROUP_SETTING: 'resonanceClio_groupSetting_v1',
  SVEN_LISA_ONBOARDING_SHOWN: 'resonanceClio_svenLisaOnboardingShown_v1',
  PAULINA_JOE_ONBOARDING_SHOWN: 'resonanceClio_paulinaJoeOnboardingShown_v1',
  IS_MUSIC_ENABLED: 'resonanceClio_isMusicEnabled_v1',
  MUSIC_VOLUME: 'resonanceClio_musicVolume_v1', 
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error setting localStorage key "${key}":`, e);
  }
};


const App: React.FC = () => {
  const [drawnCardHistory, setDrawnCardHistory] = useState<DrawnCardData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [selectedGroupSetting, setSelectedGroupSetting] = useState<GroupSetting>(DEFAULT_GROUP_SETTING);
  const [showGroupSettingModal, setShowGroupSettingModal] = useState<boolean>(false);
  
  const [hasPlayedAudioForNewestCard, setHasPlayedAudioForNewestCard] = useState<boolean>(false);
  const [activeCardAudio, setActiveCardAudio] = useState<{ cardId: string; type: 'prompt' | 'notes' } | null>(null);

  const [customDecks, setCustomDecks] = useState<CustomThemeData[]>([]);
  const [showCustomDeckModal, setShowCustomDeckModal] = useState<boolean>(false);
  const [editingCustomDeck, setEditingCustomDeck] = useState<CustomThemeData | null>(null);
  
  const [themeBeingDrawnName, setThemeBeingDrawnName] = useState<string | null>(null);
  const [activeParticipantNameForPlaceholder, setActiveParticipantNameForPlaceholder] = useState<string | null>(null);
  const [currentDrawingThemeColor, setCurrentDrawingThemeColor] = useState<string | null>(null);

  const [showDeckInfoModal, setShowDeckInfoModal] = useState<boolean>(false);
  const [itemForInfoModal, setItemForInfoModal] = useState<DeckSet | CustomThemeData | null>(null);

  const [selectedVoiceName, setSelectedVoiceName] = useState<VoiceName>(DEFAULT_VOICE_NAME);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  

  // Special Modes State
  const [specialModeOnboardingDrawFn, setSpecialModeOnboardingDrawFn] = useState<(() => Promise<void>) | null>(null);
  const [showSvenAndLisaOnboardingModal, setShowSvenAndLisaOnboardingModal] = useState<boolean>(false);
  const [hasShownSvenAndLisaOnboarding, setHasShownSvenAndLisaOnboarding] = useState<boolean>(
      () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.SVEN_LISA_ONBOARDING_SHOWN, false)
  );
  const [showPaulinaAndJoeOnboardingModal, setShowPaulinaAndJoeOnboardingModal] = useState<boolean>(false);
  const [hasShownPaulinaAndJoeOnboarding, setHasShownPaulinaAndJoeOnboarding] = useState<boolean>(
      () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.PAULINA_JOE_ONBOARDING_SHOWN, false)
  );


  // Music Service State
  const musicServiceRef = useRef<MusicService | null>(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(
    () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUSIC_ENABLED, false)
  );
  const [musicSessionState, setMusicSessionState] = useState<MusicSessionState>('DISCONNECTED');
  const [musicError, setMusicError] = useState<string | null>(null);
  const [currentDeckSetForMusic, setCurrentDeckSetForMusic] = useState<DeckSet | null>(null);
  const [currentMicroDeckForMusic, setCurrentMicroDeckForMusic] = useState<MicroDeck | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(
    () => loadFromLocalStorage<number>(LOCALSTORAGE_KEYS.MUSIC_VOLUME, 0.5) 
  );


  useEffect(() => {
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.SVEN_LISA_ONBOARDING_SHOWN, hasShownSvenAndLisaOnboarding);
  }, [hasShownSvenAndLisaOnboarding]);

  useEffect(() => {
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.PAULINA_JOE_ONBOARDING_SHOWN, hasShownPaulinaAndJoeOnboarding);
  }, [hasShownPaulinaAndJoeOnboarding]);

  useEffect(() => {
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUSIC_ENABLED, isMusicEnabled);
  }, [isMusicEnabled]);

  useEffect(() => {
    saveToLocalStorage<number>(LOCALSTORAGE_KEYS.MUSIC_VOLUME, musicVolume);
  }, [musicVolume]);


  useEffect(() => {
    console.log("App mounted. Resonance (Deck Sets Architecture).");
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      setError("API_KEY for Gemini is not configured.");
    }

    const loadedDecks = loadFromLocalStorage<CustomThemeData[]>(LOCALSTORAGE_KEYS.CUSTOM_DECKS, []);
    setCustomDecks(loadedDecks);

    const loadedVoice = loadFromLocalStorage<VoiceName>(LOCALSTORAGE_KEYS.VOICE_NAME, DEFAULT_VOICE_NAME);
    setSelectedVoiceName(loadedVoice);
    const loadedLang = loadFromLocalStorage<LanguageCode>(LOCALSTORAGE_KEYS.LANGUAGE_CODE, DEFAULT_LANGUAGE_CODE);
    setSelectedLanguageCode(loadedLang);
    const loadedMute = loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUTED, false);
    setIsAudioMuted(loadedMute);

    const loadedGroupSetting = loadFromLocalStorage<GroupSetting>(LOCALSTORAGE_KEYS.GROUP_SETTING, DEFAULT_GROUP_SETTING);
    setSelectedGroupSetting(loadedGroupSetting);
    
    if (participants.length === 0) {
        const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
        setParticipants([defaultParticipant]);
        setActiveParticipantId(defaultParticipant.id);
    }


    return () => {
        stopSpeechServicePlayback();
        if (musicServiceRef.current) {
            musicServiceRef.current.disconnect();
        }
    };
  }, []);

  useEffect(() => {
    if (isMusicEnabled && process.env.API_KEY) {
        if (!musicServiceRef.current) {
            console.log("MusicService: Initializing and connecting due to isMusicEnabled=true.");
            musicServiceRef.current = new MusicService(
                process.env.API_KEY,
                (state) => setMusicSessionState(state),
                (err) => {
                    setMusicError(err);
                    console.error("MusicService Error Callback:", err);
                }
            );
            if (musicServiceRef.current) {
                 musicServiceRef.current.setVolume(musicVolume); 
                 musicServiceRef.current.connect(); 
            }
        } else {
            const currentMusicState = musicServiceRef.current.getCurrentInternalState();
            if (currentMusicState === 'DISCONNECTED' || currentMusicState === 'STOPPED' || currentMusicState === 'ERROR') {
                console.log(`MusicService: Already enabled, but service was ${currentMusicState}. Re-connecting.`);
                musicServiceRef.current.connect();
            }
        }
    } else if (!isMusicEnabled && musicServiceRef.current) {
        console.log("MusicService: Disabling music, disconnecting service.");
        musicServiceRef.current.disconnect();
        musicServiceRef.current = null;
        setMusicSessionState('DISCONNECTED'); 
    }
  }, [isMusicEnabled]); 

  useEffect(() => {
    if (musicServiceRef.current && isMusicEnabled) {
        musicServiceRef.current.setVolume(musicVolume);
    }
  }, [musicVolume, isMusicEnabled]);


  const handleMusicSteering = useCallback(async (newestCard: DrawnCardData | null) => {
    if (!isMusicEnabled || !musicServiceRef.current || !process.env.API_KEY) {
        return;
    }
    
    const currentMusicState = musicServiceRef.current.getCurrentInternalState();
    if (currentMusicState === 'ERROR' || currentMusicState === 'DISCONNECTED' || currentMusicState === 'CONNECTING') {
        console.log(`MusicService: Not in a steerable state (${currentMusicState}). Waiting for connection or resolution.`);
        return;
    }
    
    let promptsForMusic: LyriaWeightedPrompt[] = [];
    let configForMusic: Partial<LyriaConfig> = {};

    if (newestCard) {
        if (newestCard.themeIdentifier.startsWith("CUSTOM_")) {
            const customDeck = getCustomDeckById(newestCard.themeIdentifier as CustomThemeId, customDecks);
            if (customDeck) {
                promptsForMusic.push({ text: `custom theme, user-defined, ${customDeck.name}, ${customDeck.description.substring(0,100)}`, weight: 0.8 });
                configForMusic = { bpm: 80, density: 0.4, brightness: 0.55 };
            }
        } else {
            const microDeckForMusic = getMicroDeckById(newestCard.themeIdentifier as MicroDeck['id']);
            if (microDeckForMusic) {
                setCurrentMicroDeckForMusic(microDeckForMusic);
                const deckSetForMusic = microDeckForMusic.belongs_to_set ? getDeckSetById(microDeckForMusic.belongs_to_set) : null;
                setCurrentDeckSetForMusic(deckSetForMusic);

                let promptText = microDeckForMusic.llm_keywords;
                if (deckSetForMusic) promptText += `, ${deckSetForMusic.name.toLowerCase().replace(/\s+/g, '_')}`;
                promptsForMusic.push({ text: promptText, weight: 0.9 });
                
                const focus = microDeckForMusic.deck_inspiration_focus.toLowerCase();
                const maturity = microDeckForMusic.maturity_rating_hint;

                if (focus.includes("mindfulness") || focus.includes("somatic") || focus.includes("presence")) {
                    configForMusic = { bpm: 60, density: 0.2, brightness: 0.35, scale: Scale.PENTATONIC_MINOR };
                } else if (focus.includes("playful") || focus.includes("icebreaker") || focus.includes("witty")) {
                    configForMusic = { bpm: 110, density: 0.6, brightness: 0.65, scale: Scale.BLUES };
                } else if (focus.includes("authentic relating") || focus.includes("vulnerability") || focus.includes("shadow work") || focus.includes("inner child")) {
                    configForMusic = { bpm: 70, density: 0.3, brightness: 0.4, scale: Scale.MINOR };
                } else if (focus.includes("erotic") || focus.includes("sensual") || focus.includes("intimate")) {
                    configForMusic = { bpm: 85, density: 0.5, brightness: 0.5, scale: Scale.LYDIAN, muteDrums: maturity !== "Intimate/Explicit" };
                } else if (focus.includes("provocative") || focus.includes("edgy") || focus.includes("risk")) {
                     configForMusic = { bpm: 95, density: 0.55, brightness: 0.6, scale: Scale.PHRYGIAN };
                } else { 
                    configForMusic = { bpm: 90, density: 0.45, brightness: 0.5 };
                }
            }
        }
    }

    try {
        if (currentMusicState === 'CONNECTED' || currentMusicState === 'STOPPED') {
            console.log(`MusicService: State is ${currentMusicState}. Attempting to play music first, then steer.`);
            await musicServiceRef.current.playMusic(); 
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
        
        const stateAfterPlayAttempt = musicServiceRef.current.getCurrentInternalState();
        if (stateAfterPlayAttempt === 'PLAYING' || stateAfterPlayAttempt === 'LOADING_BUFFER' || stateAfterPlayAttempt === 'PLAY_REQUESTED') {
            if (promptsForMusic.length > 0) {
                console.log("MusicService: Steering music with new card context. Prompts:", promptsForMusic, "Config changes:", configForMusic);
                await musicServiceRef.current.steerMusic(promptsForMusic, configForMusic);
            } else if (!newestCard && stateAfterPlayAttempt === 'PLAYING') { 
                const activeLayers = musicServiceRef.current.getActiveLayerPrompts();
                if (activeLayers && activeLayers.length > 0) {
                    console.log("MusicService: No card, steering back to base music.");
                    await musicServiceRef.current.steerMusic([], {}); 
                    setCurrentMicroDeckForMusic(null);
                    setCurrentDeckSetForMusic(null);
                }
            }
        } else {
            console.warn(`MusicService: Could not steer. State after play attempt is ${stateAfterPlayAttempt}.`);
        }
    } catch (e: any) {
        console.error("MusicService: Error during music steering or play initiation:", e);
        setMusicError(e.message || "Error during music steering");
    }

  }, [isMusicEnabled, customDecks, musicServiceRef]);


  const handleGroupSettingChange = (newSetting: GroupSetting) => {
    setSelectedGroupSetting(newSetting);
    saveToLocalStorage(LOCALSTORAGE_KEYS.GROUP_SETTING, newSetting);
  };

  const handleOpenGroupSettingModal = () => setShowGroupSettingModal(true);
  const handleCloseGroupSettingModal = () => setShowGroupSettingModal(false);

  const handleSpecialModeOnboardingConfirm = () => {
    if (showSvenAndLisaOnboardingModal) {
        setHasShownSvenAndLisaOnboarding(true);
        setShowSvenAndLisaOnboardingModal(false);
    }
    if (showPaulinaAndJoeOnboardingModal) {
        setHasShownPaulinaAndJoeOnboarding(true);
        setShowPaulinaAndJoeOnboardingModal(false);
    }
    if (specialModeOnboardingDrawFn) {
        specialModeOnboardingDrawFn();
        setSpecialModeOnboardingDrawFn(null); 
    }
  };
  
  const handleRemoveParticipant = (participantIdToRemove: string) => {
    const newParticipants = participants.filter(p => p.id !== participantIdToRemove);
    setParticipants(newParticipants);
    if (activeParticipantId === participantIdToRemove) {
      setActiveParticipantId(newParticipants.length > 0 ? newParticipants[0].id : null);
    }
    if (newParticipants.length === 0) { 
        const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
        setParticipants([defaultParticipant]);
        setActiveParticipantId(defaultParticipant.id);
    }
  };

  const isSpecialModeActive = (
    mode: "SVEN_LISA" | "PAULINA_JOE",
    currentParticipants: Participant[]
  ): boolean => {
    if (selectedGroupSetting !== "SPECIAL") return false;

    const lowerCaseNames = currentParticipants.map(p => p.name.toLowerCase().trim()).filter(Boolean).sort();
    if (lowerCaseNames.length !== 2) return false;

    if (mode === "SVEN_LISA") {
      const svenLisaNamesSorted = ["lisa", "sven"].sort();
      return JSON.stringify(lowerCaseNames) === JSON.stringify(svenLisaNamesSorted);
    }
    if (mode === "PAULINA_JOE") {
      const paulinaJoeNamesSorted = ["joe", "paulina"].sort();
      return JSON.stringify(lowerCaseNames) === JSON.stringify(paulinaJoeNamesSorted);
    }
    return false;
  };


  const handleDrawNewCard = async (selectedThemeIdentifier: ThemeIdentifier) => {
    if (isLoading) return;
    if (!process.env.API_KEY) { setError("API_KEY for Gemini is not configured."); return; }
    
    const isSvenLisaCurrentlyActive = isSpecialModeActive("SVEN_LISA", participants);
    const isPaulinaJoeCurrentlyActive = isSpecialModeActive("PAULINA_JOE", participants);

    // Sven & Lisa Onboarding Check - simplified
    if (isSvenLisaCurrentlyActive && !hasShownSvenAndLisaOnboarding) {
        setSpecialModeOnboardingDrawFn(() => () => handleDrawNewCard(selectedThemeIdentifier)); 
        setShowSvenAndLisaOnboardingModal(true);
        return; 
    }
    // Paulina & Joe Onboarding Check
    if (isPaulinaJoeCurrentlyActive && !hasShownPaulinaAndJoeOnboarding) {
        setSpecialModeOnboardingDrawFn(() => () => handleDrawNewCard(selectedThemeIdentifier));
        setShowPaulinaAndJoeOnboardingModal(true);
        return;
    }

    setIsLoading(true); setError(null); setHasPlayedAudioForNewestCard(false); setActiveCardAudio(null);
    stopSpeechServicePlayback();
    
    let itemName = "Selected Theme";
    let deckSetIdForCard: string | null = null;
    let chosenItemForGemini: MicroDeck | CustomThemeData | null = null;
    let setNameForGemini: string = "User Selection";


    if (selectedThemeIdentifier === "RANDOM") {
        const allPossibleItems: (MicroDeck | CustomThemeData)[] = [...ALL_MICRO_DECKS, ...customDecks];
        const randomIndex = Math.floor(Math.random() * allPossibleItems.length);
        chosenItemForGemini = allPossibleItems[randomIndex];
        
        if ('internal_name' in chosenItemForGemini) { 
            itemName = chosenItemForGemini.internal_name;
            const parentSet = chosenItemForGemini.belongs_to_set ? getDeckSetById(chosenItemForGemini.belongs_to_set) : null;
            setNameForGemini = parentSet ? parentSet.name : "Assorted";
            deckSetIdForCard = parentSet?.id || null;
            setCurrentDrawingThemeColor(parentSet?.colorClass || "from-slate-600 to-slate-700");
        } else { 
            itemName = chosenItemForGemini.name;
            setNameForGemini = "Custom Decks";
            deckSetIdForCard = null; 
            setCurrentDrawingThemeColor(chosenItemForGemini.colorClass);
        }
    } else if (selectedThemeIdentifier.startsWith("CUSTOM_")) {
        chosenItemForGemini = getCustomDeckById(selectedThemeIdentifier as CustomThemeId, customDecks);
        if (chosenItemForGemini) {
            itemName = chosenItemForGemini.name;
            setNameForGemini = "Custom Decks";
            setCurrentDrawingThemeColor(chosenItemForGemini.colorClass);
        }
    } else { 
        const deckSet = DECK_SETS.find(ds => ds.id === selectedThemeIdentifier); 
        if (deckSet) {
            const microDecksInSet = ALL_MICRO_DECKS.filter(md => md.belongs_to_set === deckSet.id);
            if (microDecksInSet.length > 0) {
                const randomIndex = Math.floor(Math.random() * microDecksInSet.length);
                chosenItemForGemini = microDecksInSet[randomIndex];
                itemName = chosenItemForGemini.internal_name;
                setNameForGemini = deckSet.name;
                deckSetIdForCard = deckSet.id;
                setCurrentDrawingThemeColor(deckSet.colorClass);
            } else {
                 setError(`No micro-decks found for DeckSet "${deckSet.name}".`); setIsLoading(false); return;
            }
        } else { 
             const microDeck = getMicroDeckById(selectedThemeIdentifier as MicroDeck['id']);
             if (microDeck) {
                chosenItemForGemini = microDeck;
                itemName = microDeck.internal_name;
                const parentSet = microDeck.belongs_to_set ? getDeckSetById(microDeck.belongs_to_set) : null;
                setNameForGemini = parentSet ? parentSet.name : "Assorted";
                deckSetIdForCard = parentSet?.id || null;
                setCurrentDrawingThemeColor(parentSet?.colorClass || "from-slate-600 to-slate-700");
             } else {
                setError(`Theme "${selectedThemeIdentifier}" not found.`); setIsLoading(false); return;
             }
        }
    }
    
    if (!chosenItemForGemini) {
        setError("Could not determine a theme to draw from."); setIsLoading(false); return;
    }
    setThemeBeingDrawnName(itemName);
    const currentActiveParticipant = participants.find(p => p.id === activeParticipantId);
    setActiveParticipantNameForPlaceholder(currentActiveParticipant?.name || null);


    try {
      const participantNamesForPrompt = participants.map(p => p.name).filter(name => name && name.trim() !== "");
      const activeParticipantActualName = participants.find(p => p.id === activeParticipantId)?.name || null;
      
      const response = await generatePromptAndAudioFromGemini(
        setNameForGemini,
        chosenItemForGemini,
        participants.length,
        participantNamesForPrompt,
        activeParticipantActualName,
        selectedGroupSetting, 
        drawnCardHistory,
        customDecks, 
        selectedVoiceName,
        selectedLanguageCode
      );

      const newCard: DrawnCardData = {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        themeIdentifier: chosenItemForGemini.id,
        deckSetId: deckSetIdForCard,
        text: response.text,
        audioData: response.audioData,
        audioMimeType: response.audioMimeType,
        feedback: null,
        timestamp: Date.now(),
        llmPromptForTextGeneration: response.llmPromptForTextGeneration,
        rawLlmOutput: response.rawLlmOutput,
        cardBackNotesText: response.cardBackNotesText,
        cardBackAudioData: response.cardBackAudioData,
        cardBackAudioMimeType: response.cardBackAudioMimeType,
        drawnForParticipantId: activeParticipantId,
        drawnForParticipantName: activeParticipantActualName,
      };

      setDrawnCardHistory(prevHistory => {
        const updatedHistory = prevHistory.map(card => ({ ...card, isFaded: true }));
        return [newCard, ...updatedHistory].slice(0, MAX_HISTORY_WITH_AUDIO + 5); 
      });

      if (!isAudioMuted && newCard.audioData && newCard.audioMimeType) {
          if (!hasPlayedAudioForNewestCard) { 
            playAudioData(newCard.audioData!, newCard.audioMimeType!, isAudioMuted, () => setActiveCardAudio(null));
            setActiveCardAudio({ cardId: newCard.id, type: 'prompt' });
            setHasPlayedAudioForNewestCard(true);
          }
      } else if (!isAudioMuted && newCard.text) { 
          if (!hasPlayedAudioForNewestCard) {
            speakText(newCard.text, selectedLanguageCode, isAudioMuted, () => setActiveCardAudio(null));
            setActiveCardAudio({ cardId: newCard.id, type: 'prompt' });
            setHasPlayedAudioForNewestCard(true);
          }
      }
      handleMusicSteering(newCard);


    } catch (err: any) {
      console.error("Error drawing card:", err);
      setError(err.message || "Failed to draw card.");
      handleMusicSteering(null); 
    } finally {
      setIsLoading(false);
      setThemeBeingDrawnName(null);
      setActiveParticipantNameForPlaceholder(null);
      setCurrentDrawingThemeColor(null);
      
      if (participants.length > 1 && activeParticipantId) {
        const currentIndex = participants.findIndex(p => p.id === activeParticipantId);
        const nextIndex = (currentIndex + 1) % participants.length;
        setActiveParticipantId(participants[nextIndex].id);
      } else if (participants.length === 1 && !activeParticipantId) {
        setActiveParticipantId(participants[0].id); 
      }
    }
  };

  const handleLikeCard = (id: string) => {
    setDrawnCardHistory(prev => prev.map(card => card.id === id ? { ...card, feedback: 'liked' } : card));
  };
  const handleDislikeCard = (id: string) => {
    setDrawnCardHistory(prev => prev.map(card => card.id === id ? { ...card, feedback: 'disliked' } : card));
  };
  
  const handlePlayAudioForNewestCard = (audioDetails: { cardId: string, text: string | null; audioData: string | null; audioMimeType: string | null }) => {
    stopSpeechServicePlayback(); 

    if (isAudioMuted) return;

    if (audioDetails.audioData && audioDetails.audioMimeType) {
        playAudioData(audioDetails.audioData, audioDetails.audioMimeType, isAudioMuted, () => setActiveCardAudio(null));
        setActiveCardAudio({ cardId: audioDetails.cardId, type: 'prompt' });
    } else if (audioDetails.text) {
        speakText(audioDetails.text, selectedLanguageCode, isAudioMuted, () => setActiveCardAudio(null));
        setActiveCardAudio({ cardId: audioDetails.cardId, type: 'prompt' });
    }
    setHasPlayedAudioForNewestCard(true);
  };

  const handleFetchAndPlayCardBackAudio = async (cardId: string, textToSpeak: string) => {
    if (isAudioMuted || !textToSpeak.trim()) return;
    stopSpeechServicePlayback(); 
    
    const cardIndex = drawnCardHistory.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.warn("Card not found in history for card back audio.");
        return;
    }
    
    const card = drawnCardHistory[cardIndex];
    if (card.cardBackAudioData && card.cardBackAudioMimeType) {
        console.log("Using cached card back audio for card:", cardId);
        playAudioData(card.cardBackAudioData, card.cardBackAudioMimeType, isAudioMuted, () => setActiveCardAudio(null));
        setActiveCardAudio({ cardId, type: 'notes' });
        return;
    }

    console.log("Fetching new card back audio for card:", cardId);
    const microDeck = getMicroDeckById(card.themeIdentifier as MicroDeck['id']);
    const styleDirective = getStyleDirectiveForMicroDeck(microDeck, true);

    try {
        const audioResult = await generateAudioForText(textToSpeak, selectedVoiceName, styleDirective);
        if (audioResult.audioData && audioResult.audioMimeType) {
            setDrawnCardHistory(prev => {
                const newHistory = [...prev];
                const updatedCard = { ...newHistory[cardIndex], cardBackAudioData: audioResult.audioData, cardBackAudioMimeType: audioResult.audioMimeType };
                newHistory[cardIndex] = updatedCard;
                return newHistory;
            });
            playAudioData(audioResult.audioData, audioResult.audioMimeType, isAudioMuted, () => setActiveCardAudio(null));
            setActiveCardAudio({ cardId, type: 'notes' });
        } else {
            console.warn(`Failed to generate card back audio: ${audioResult.error}. Speaking text instead.`);
            speakText(textToSpeak, selectedLanguageCode, isAudioMuted, () => setActiveCardAudio(null));
            setActiveCardAudio({ cardId, type: 'notes' });
        }
    } catch (e: any) {
        console.error("Error fetching/playing card back audio:", e);
        speakText(textToSpeak, selectedLanguageCode, isAudioMuted, () => setActiveCardAudio(null)); 
        setActiveCardAudio({ cardId, type: 'notes' });
    }
  };

  const handleStopCurrentAudio = () => {
    stopSpeechServicePlayback(); 
  };

  const handleSaveCustomDeck = (name: string, description: string) => {
    const newDeck: CustomThemeData = {
      id: `CUSTOM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      colorClass: "from-gray-500 to-gray-600" 
    };
    const updatedDecks = [...customDecks, newDeck];
    setCustomDecks(updatedDecks);
    saveToLocalStorage(LOCALSTORAGE_KEYS.CUSTOM_DECKS, updatedDecks);
    setShowCustomDeckModal(false);
  };
  const handleUpdateCustomDeck = (id: CustomThemeId, name: string, description: string) => {
    const updatedDecks = customDecks.map(deck => 
      deck.id === id ? { ...deck, name, description } : deck
    );
    setCustomDecks(updatedDecks);
    saveToLocalStorage(LOCALSTORAGE_KEYS.CUSTOM_DECKS, updatedDecks);
    setShowCustomDeckModal(false);
    setEditingCustomDeck(null);
  };
  const handleEditCustomDeck = (deck: CustomThemeData) => {
    setEditingCustomDeck(deck);
    setShowCustomDeckModal(true);
  };
  const handleOpenCustomDeckModal = () => {
    setEditingCustomDeck(null);
    setShowCustomDeckModal(true);
  };
  const handleCloseCustomDeckModal = () => {
    setShowCustomDeckModal(false);
    setEditingCustomDeck(null);
  };

  const handleOpenDeckInfoModal = (itemId: DeckSet['id'] | CustomThemeData['id']) => {
    let itemToShow: DeckSet | CustomThemeData | null = null;
    if (typeof itemId === 'string' && itemId.startsWith("CUSTOM_")) {
        itemToShow = getCustomDeckById(itemId as CustomThemeId, customDecks);
    } else {
        itemToShow = getDeckSetById(itemId as DeckSet['id']);
    }
    if (itemToShow) {
        setItemForInfoModal(itemToShow);
        setShowDeckInfoModal(true);
    }
  };
  const handleCloseDeckInfoModal = () => setShowDeckInfoModal(false);

  const handleOpenVoiceSettingsModal = () => setShowVoiceSettingsModal(true);
  const handleCloseVoiceSettingsModal = () => setShowVoiceSettingsModal(false);
  const handleVoiceChange = (voice: VoiceName) => { setSelectedVoiceName(voice); saveToLocalStorage(LOCALSTORAGE_KEYS.VOICE_NAME, voice); };
  const handleLanguageChange = (lang: LanguageCode) => { setSelectedLanguageCode(lang); saveToLocalStorage(LOCALSTORAGE_KEYS.LANGUAGE_CODE, lang); };
  const handleMuteChange = (muted: boolean) => { 
    setIsAudioMuted(muted); 
    saveToLocalStorage(LOCALSTORAGE_KEYS.IS_MUTED, muted);
    if (muted) {
        stopSpeechServicePlayback(); 
        if (musicServiceRef.current && musicServiceRef.current.getCurrentInternalState() === 'PLAYING') { 
            musicServiceRef.current.pauseMusic(); 
        }
    } else {
        if (musicServiceRef.current && musicServiceRef.current.getCurrentInternalState() === 'PAUSED' && isMusicEnabled) { 
             musicServiceRef.current.playMusic(); 
        }
    }
  };
  const handleMusicEnableChange = (enabled: boolean) => {
    setIsMusicEnabled(enabled);
  };
  const handleMusicVolumeChange = (volume: number) => {
    setMusicVolume(volume);
  };


  const interactionsDisabled = isLoading;

  return (
    <div className="flex flex-col min-h-screen items-center justify-between bg-slate-900 text-slate-200 w-full">
      
      {apiKeyMissing && (
        <div className="fixed top-0 left-0 right-0 p-4 flex justify-center z-[100]">
          <ApiKeyMessage />
        </div>
      )}

      <header 
        className="fixed top-0 left-0 right-0 z-30 flex items-end justify-center bg-gradient-to-b from-slate-900 via-slate-900/70 via-[45%] to-transparent backdrop-blur-md" 
        style={{ height: 'var(--header-height-actual)' }}
        role="banner"
      >
        <ThemeDeckSelection 
          onDraw={handleDrawNewCard} 
          isDrawingInProgress={isLoading}
          interactionsDisabled={interactionsDisabled}
          customDecks={customDecks}
          onAddCustomDeck={handleOpenCustomDeckModal}
          onEditCustomDeck={handleEditCustomDeck}
          onShowDeckInfo={handleOpenDeckInfoModal}
        />
      </header>

      <main 
        className="flex-grow flex flex-col items-center justify-start w-full"
        style={{ 
            paddingTop: 'var(--main-content-top-padding)', 
            paddingBottom: 'var(--main-content-bottom-padding)' 
        }}
        role="main"
      >
        <DrawnCardsHistoryView 
            history={drawnCardHistory} 
            onLike={handleLikeCard} 
            onDislike={handleDislikeCard}
            onPlayAudioForMainPrompt={handlePlayAudioForNewestCard}
            onFetchAndPlayCardBackAudio={handleFetchAndPlayCardBackAudio}
            isLoadingNewCard={isLoading && drawnCardHistory.length === 0}
            isLoadingNextCard={isLoading && drawnCardHistory.length > 0}
            customDecks={customDecks}
            themeBeingDrawnName={themeBeingDrawnName}
            activeParticipantNameForPlaceholder={activeParticipantNameForPlaceholder}
            onOpenVoiceSettings={handleOpenVoiceSettingsModal}
            currentDrawingThemeColor={currentDrawingThemeColor}
            activeCardAudio={activeCardAudio}
            onStopAudio={handleStopCurrentAudio}
        />
        {error && <p className="text-red-400 mt-4 text-center text-sm px-4">{error}</p>}

      </main>

      <footer 
        className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-md border-t border-slate-700/60"
        style={{ height: 'var(--footer-height-actual)' }}
        role="contentinfo"
      >
        <BottomToolbar 
          participants={participants}
          setParticipants={setParticipants}
          activeParticipantId={activeParticipantId}
          setActiveParticipantId={setActiveParticipantId}
          onRemoveParticipant={handleRemoveParticipant}
          groupSetting={selectedGroupSetting}
          onOpenGroupSettingModal={handleOpenGroupSettingModal}
          disabled={interactionsDisabled}
        />
      </footer>

      {showCustomDeckModal && (
        <CustomDeckModal 
            onClose={handleCloseCustomDeckModal} 
            onSave={editingCustomDeck ? (name, desc) => handleUpdateCustomDeck(editingCustomDeck.id, name, desc) : handleSaveCustomDeck}
            initialData={editingCustomDeck || undefined}
            interactionsDisabled={isLoading}
        />
      )}
       {showDeckInfoModal && itemForInfoModal && (
        <DeckInfoModal item={itemForInfoModal} onClose={handleCloseDeckInfoModal} />
      )}
      {showVoiceSettingsModal && (
        <VoiceSettingsModal 
            currentVoice={selectedVoiceName}
            currentLanguage={selectedLanguageCode}
            isMuted={isAudioMuted}
            isMusicEnabled={isMusicEnabled}
            musicVolume={musicVolume}
            onMusicVolumeChange={handleMusicVolumeChange}
            musicSessionState={musicSessionState}
            onVoiceChange={handleVoiceChange}
            onLanguageChange={handleLanguageChange}
            onMuteChange={handleMuteChange}
            onMusicEnableChange={handleMusicEnableChange}
            onClose={handleCloseVoiceSettingsModal}
            voicesList={GOOGLE_VOICES}
            languagesList={LANGUAGES}
        />
      )}
      {showGroupSettingModal && (
        <GroupSettingModal
          currentSetting={selectedGroupSetting}
          onSettingChange={handleGroupSettingChange}
          onClose={handleCloseGroupSettingModal}
          groupSettingsOptions={GROUP_SETTINGS}
          disabled={isLoading}
        />
      )}
       {showSvenAndLisaOnboardingModal && (
        <SvenAndLisaOnboardingModal
            onClose={() => { setShowSvenAndLisaOnboardingModal(false); setSpecialModeOnboardingDrawFn(null); }}
            onConfirm={handleSpecialModeOnboardingConfirm}
        />
      )}
      {showPaulinaAndJoeOnboardingModal && (
        <PaulinaAndJoeOnboardingModal
            onClose={() => { setShowPaulinaAndJoeOnboardingModal(false); setSpecialModeOnboardingDrawFn(null); }}
            onConfirm={handleSpecialModeOnboardingConfirm}
        />
      )}
    </div>
  );
};

export default App;
