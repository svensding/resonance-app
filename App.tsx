

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DrawnCardDisplayData as SingleDrawnCardData } from './components/DrawnCard'; 
import { 
  generatePromptAndAudioFromGemini, GeminiPromptResponse as GeminiServiceResponse, 
  CustomThemeData, CustomThemeId, ThemeIdentifier, DeckSet, MicroDeck,
  VoiceName, LanguageCode, DEFAULT_VOICE_NAME, DEFAULT_LANGUAGE_CODE, GOOGLE_VOICES, LANGUAGES,
  GroupSetting, DEFAULT_GROUP_SETTING, GROUP_SETTINGS, SVEN_LISA_PRIORITIZED_MICRO_DECK_IDS,
  DECK_SETS, ALL_MICRO_DECKS, CULMINATION_MICRO_DECK_PROXY,
  getMicroDeckById, getCustomDeckById, getDeckSetById, getDisplayDataForCard,
  generateAudioForText, getStyleDirectiveForMicroDeck
} from './services/geminiService';
import { playAudioData, speakText, stopSpeechServicePlayback } from './services/speechService'; 
import { 
    MusicService, MusicSessionState, WeightedPrompt as LyriaWeightedPrompt, LiveMusicGenerationConfig as LyriaConfig, Scale 
} from './services/musicService';
import { ApiKeyMessage } from './components/ApiKeyMessage';
import { ThemeDeckSelection } from './components/ThemeDeckSelection';
import { DrawnCardsHistoryView } from './components/DrawnCardsHistoryView';
import { BottomToolbar, Participant } from './components/BottomToolbar';
import { CustomDeckModal } from './components/CustomDeckModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { DeckInfoModal } from './components/DeckInfoModal'; 
import { GroupSettingModal } from './components/GroupSettingModal';
import { SvenAndLisaOnboardingModal } from './components/SvenAndLisaOnboardingModal';


const ECHO_BREATH_PAUSE_MS = 500; 
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
  isCulminationCard?: boolean;
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
  const [customDecks, setCustomDecks] = useState<CustomThemeData[]>([]);
  const [showCustomDeckModal, setShowCustomDeckModal] = useState<boolean>(false);
  const [editingCustomDeck, setEditingCustomDeck] = useState<CustomThemeData | null>(null);
  
  const [themeBeingDrawnName, setThemeBeingDrawnName] = useState<string | null>(null);
  const [activeParticipantNameForPlaceholder, setActiveParticipantNameForPlaceholder] = useState<string | null>(null);
  const [currentDrawingThemeColor, setCurrentDrawingThemeColor] = useState<string | null>(null);

  const [showCulminationCardButton, setShowCulminationCardButton] = useState<boolean>(false);

  const [showDeckInfoModal, setShowDeckInfoModal] = useState<boolean>(false);
  const [itemForInfoModal, setItemForInfoModal] = useState<DeckSet | CustomThemeData | null>(null);

  const [selectedVoiceName, setSelectedVoiceName] = useState<VoiceName>(DEFAULT_VOICE_NAME);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  
  const audioPlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sven & Lisa Special Mode State
  const [svenAndLisaOnboardingDrawFn, setSvenAndLisaOnboardingDrawFn] = useState<(() => Promise<void>) | null>(null);
  const [showSvenAndLisaOnboardingModal, setShowSvenAndLisaOnboardingModal] = useState<boolean>(false);
  const [hasShownSvenAndLisaOnboarding, setHasShownSvenAndLisaOnboarding] = useState<boolean>(
      () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.SVEN_LISA_ONBOARDING_SHOWN, false)
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
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUSIC_ENABLED, isMusicEnabled);
  }, [isMusicEnabled]);

  useEffect(() => {
    saveToLocalStorage<number>(LOCALSTORAGE_KEYS.MUSIC_VOLUME, musicVolume);
  }, [musicVolume]);


  useEffect(() => {
    console.log("App mounted. Resonance (Deck Sets Architecture).");
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("resonanceEchoDeck_") || key.startsWith("resonanceClio_") || key.startsWith("clio")) {
        // console.log(`LS Key: ${key}`);
      }
    });

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
    
    // Initial participant setup based on group setting (if desired for future)
    updateParticipantsForGroupSetting(loadedGroupSetting, true);


    if (process.env.API_KEY && isMusicEnabled) {
        musicServiceRef.current = new MusicService(
            process.env.API_KEY,
            (state) => setMusicSessionState(state),
            (err) => {
                setMusicError(err);
                console.error("MusicService Error Callback:", err);
            }
        );
        musicServiceRef.current.setVolume(musicVolume); // Ensure initial volume is set
    }


    return () => {
        if (audioPlaybackTimerRef.current) clearTimeout(audioPlaybackTimerRef.current);
        stopSpeechServicePlayback();
        if (musicServiceRef.current) {
            musicServiceRef.current.disconnect();
        }
    };
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (isMusicEnabled && process.env.API_KEY && !musicServiceRef.current) {
        console.log("MusicService: Enabling music, initializing service.");
        musicServiceRef.current = new MusicService(
            process.env.API_KEY,
            (state) => setMusicSessionState(state),
            (err) => {
                setMusicError(err);
                console.error("MusicService Error Callback:", err);
            }
        );
        musicServiceRef.current.setVolume(musicVolume);
    } else if (!isMusicEnabled && musicServiceRef.current) {
        console.log("MusicService: Disabling music, disconnecting service.");
        musicServiceRef.current.disconnect();
        musicServiceRef.current = null;
        setMusicSessionState('DISCONNECTED');
    }
  }, [isMusicEnabled, musicVolume]); // React to changes in isMusicEnabled

  useEffect(() => {
    if (musicServiceRef.current) {
        musicServiceRef.current.setVolume(musicVolume);
    }
  }, [musicVolume]);


  const handleMusicSteering = useCallback(async (newestCard: DrawnCardData | null) => {
    if (!isMusicEnabled || !musicServiceRef.current || musicSessionState === 'ERROR' || musicSessionState === 'DISCONNECTED') {
        return;
    }
    if (musicSessionState === 'CONNECTING') {
        console.log("MusicService: Still connecting, will steer once connected.");
        return;
    }

    if (musicSessionState !== 'PLAYING' && musicSessionState !== 'PAUSED' && musicSessionState !== 'LOADING_BUFFER' && musicSessionState !== 'CONNECTED' && musicSessionState !== 'PLAY_REQUESTED') {
        try {
            await musicServiceRef.current.connect();
             // Wait briefly for connection before playing/steering
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (musicServiceRef.current && musicSessionState === 'CONNECTED') { 
                 await musicServiceRef.current.playMusic();
                 await new Promise(resolve => setTimeout(resolve, 500)); // Wait for play to initiate
            } else {
                console.warn("MusicService: Connection attempt for steering did not reach CONNECTED state quickly. Current state:", musicSessionState);
                return;
            }
        } catch (e) {
            console.error("MusicService: Error connecting/playing music before steering:", e);
            return; 
        }
    }
    
    let promptsForMusic: LyriaWeightedPrompt[] = [];
    let configForMusic: Partial<LyriaConfig> = {};
    let microDeckForMusic: MicroDeck | null = null;
    let deckSetForMusic: DeckSet | null = null;

    if (newestCard) {
        if (newestCard.themeIdentifier.startsWith("CUSTOM_")) {
            const customDeck = getCustomDeckById(newestCard.themeIdentifier as CustomThemeId, customDecks);
            if (customDeck) {
                promptsForMusic.push({ text: `custom theme, user-defined, ${customDeck.name}, ${customDeck.description.substring(0,100)}`, weight: 0.8 });
                // Basic config for custom, can be expanded
                configForMusic = { bpm: 80, density: 0.4, brightness: 0.55 };
            }
        } else {
            microDeckForMusic = getMicroDeckById(newestCard.themeIdentifier as MicroDeck['id']);
            if (microDeckForMusic) {
                setCurrentMicroDeckForMusic(microDeckForMusic);
                if (microDeckForMusic.belongs_to_set) {
                    deckSetForMusic = getDeckSetById(microDeckForMusic.belongs_to_set);
                    if (deckSetForMusic) setCurrentDeckSetForMusic(deckSetForMusic);
                } else {
                     setCurrentDeckSetForMusic(null); // For culmination or special non-set cards
                }

                // Construct prompts & config from MicroDeck and DeckSet
                let promptText = microDeckForMusic.llm_keywords;
                if (deckSetForMusic) promptText += `, ${deckSetForMusic.name.toLowerCase().replace(/\s+/g, '_')}`;
                
                promptsForMusic.push({ text: promptText, weight: 0.9 });
                
                // Example: Derive config from micro-deck focus or set
                const focus = microDeckForMusic.deck_inspiration_focus.toLowerCase();
                const maturity = microDeckForMusic.maturity_rating_hint;

                if (focus.includes("mindfulness") || focus.includes("somatic") || focus.includes("presence")) {
                    configForMusic = { bpm: 60, density: 0.2, brightness: 0.35, scale: Scale.MINOR_PENTATONIC };
                } else if (focus.includes("playful") || focus.includes("icebreaker") || focus.includes("witty")) {
                    configForMusic = { bpm: 110, density: 0.6, brightness: 0.65, scale: Scale.MAJOR_BLUES };
                } else if (focus.includes("authentic relating") || focus.includes("vulnerability") || focus.includes("shadow work") || focus.includes("inner child")) {
                    configForMusic = { bpm: 70, density: 0.3, brightness: 0.4, scale: Scale.AEOLIAN };
                } else if (focus.includes("erotic") || focus.includes("sensual") || focus.includes("intimate")) {
                    configForMusic = { bpm: 85, density: 0.5, brightness: 0.5, scale: Scale.LYDIAN, muteDrums: maturity !== "Intimate/Explicit" };
                } else if (focus.includes("provocative") || focus.includes("edgy") || focus.includes("risk")) {
                     configForMusic = { bpm: 95, density: 0.55, brightness: 0.6, scale: Scale.PHRYGIAN };
                } else { // Default fallback
                    configForMusic = { bpm: 90, density: 0.45, brightness: 0.5 };
                }
                 if (newestCard.isCulminationCard) {
                    configForMusic = { bpm: 75, density: 0.35, brightness: 0.45, scale: Scale.MIXOLYDIAN };
                    promptsForMusic.push({ text: "reflective, synthesizing, concluding, summary", weight: 0.9 });
                }
            }
        }
    }
    // If no specific card (e.g. initial play or after clearing history), it uses base prompts/config.
    // If there are specific prompts/config, steer to them.
    if (promptsForMusic.length > 0) {
       console.log("MusicService: Steering music with new card context. Prompts:", promptsForMusic, "Config changes:", configForMusic);
       await musicServiceRef.current.steerMusic(promptsForMusic, configForMusic);
    } else if (!newestCard && musicSessionState === 'PLAYING') { 
        // No card, but music is playing - gently steer back to base if active layers exist
        const activeLayers = musicServiceRef.current.getActiveLayerPrompts();
        if (activeLayers && activeLayers.length > 0) {
            console.log("MusicService: No card, steering back to base music.");
            await musicServiceRef.current.steerMusic([], {}); // Empty array steers to base
            setCurrentMicroDeckForMusic(null);
            setCurrentDeckSetForMusic(null);
        }
    }


  }, [isMusicEnabled, musicSessionState, customDecks, musicServiceRef]); 


  const updateParticipantsForGroupSetting = (setting: GroupSetting, isInitialSetup: boolean = false) => {
    setSelectedGroupSetting(setting);
    saveToLocalStorage(LOCALSTORAGE_KEYS.GROUP_SETTING, setting);
    
    if (setting === "SPECIAL") { // Sven & Lisa mode
      const sven = { id: 'sven-special', name: 'Sven' };
      const lisa = { id: 'lisa-special', name: 'Lisa' };
      setParticipants([sven, lisa]);
      setActiveParticipantId(sven.id); // Default to Sven
      
      if (!isInitialSetup && !hasShownSvenAndLisaOnboarding) {
        setShowSvenAndLisaOnboardingModal(true);
      }
    } else {
      // If was special mode, clear participants or reset to a default single participant
      if (participants.some(p => p.id === 'sven-special' || p.id === 'lisa-special')) {
        const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
        setParticipants([defaultParticipant]);
        setActiveParticipantId(defaultParticipant.id);
      } else if (participants.length === 0 && isInitialSetup) {
        // If not special mode and no participants, add one default
        const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
        setParticipants([defaultParticipant]);
        setActiveParticipantId(defaultParticipant.id);
      }
      // If already has participants and not switching from special, keep them.
    }
  };

  const handleOpenGroupSettingModal = () => setShowGroupSettingModal(true);
  const handleCloseGroupSettingModal = () => setShowGroupSettingModal(false);
  const handleGroupSettingChange = (newSetting: GroupSetting) => {
    updateParticipantsForGroupSetting(newSetting);
    // Potentially trigger a redraw or clear history if setting change implies new context
    // setDrawnCardHistory([]); // Example: Clear history on major context change
  };

  const handleSvenAndLisaOnboardingConfirm = () => {
    setShowSvenAndLisaOnboardingModal(false);
    setHasShownSvenAndLisaOnboarding(true);
    if (svenAndLisaOnboardingDrawFn) {
        svenAndLisaOnboardingDrawFn();
        setSvenAndLisaOnboardingDrawFn(null); 
    }
  };
  
  const handleRemoveParticipant = (participantIdToRemove: string) => {
    const newParticipants = participants.filter(p => p.id !== participantIdToRemove);
    setParticipants(newParticipants);
    if (activeParticipantId === participantIdToRemove) {
      setActiveParticipantId(newParticipants.length > 0 ? newParticipants[0].id : null);
    }
    if (newParticipants.length === 0) { // If all removed, add one back
        const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
        setParticipants([defaultParticipant]);
        setActiveParticipantId(defaultParticipant.id);
    }
  };


  const handleDrawNewCard = async (selectedThemeIdentifier: ThemeIdentifier) => {
    if (isLoading) return;
    if (!process.env.API_KEY) { setError("API_KEY for Gemini is not configured."); return; }
    
    // Sven & Lisa Special Mode Onboarding Check
    if (selectedGroupSetting === "SPECIAL" && !hasShownSvenAndLisaOnboarding && 
        (selectedThemeIdentifier.startsWith("SBP_") || selectedThemeIdentifier.startsWith("CCS_") || selectedThemeIdentifier.startsWith("SS_"))) {
        
        const microDeckForOnboarding = getMicroDeckById(selectedThemeIdentifier as MicroDeck['id']);
        if (microDeckForOnboarding && SVEN_LISA_PRIORITIZED_MICRO_DECK_IDS.includes(microDeckForOnboarding.id)) {
            setSvenAndLisaOnboardingDrawFn(() => () => handleDrawNewCard(selectedThemeIdentifier)); 
            setShowSvenAndLisaOnboardingModal(true);
            return; 
        }
    }


    setIsLoading(true); setError(null); setHasPlayedAudioForNewestCard(false);
    stopSpeechServicePlayback();
    if (audioPlaybackTimerRef.current) clearTimeout(audioPlaybackTimerRef.current);
    
    let itemName = "Selected Theme";
    let deckSetIdForCard: string | null = null;
    let chosenItemForGemini: MicroDeck | CustomThemeData | null = null;
    let setNameForGemini: string = "User Selection";


    if (selectedThemeIdentifier === "RANDOM") {
        const allPossibleItems: (MicroDeck | CustomThemeData)[] = [...ALL_MICRO_DECKS, ...customDecks];
        const randomIndex = Math.floor(Math.random() * allPossibleItems.length);
        chosenItemForGemini = allPossibleItems[randomIndex];
        
        if ('internal_name' in chosenItemForGemini) { // It's a MicroDeck
            itemName = chosenItemForGemini.internal_name;
            const parentSet = chosenItemForGemini.belongs_to_set ? getDeckSetById(chosenItemForGemini.belongs_to_set) : null;
            setNameForGemini = parentSet ? parentSet.name : "Assorted";
            deckSetIdForCard = parentSet?.id || null;
            setCurrentDrawingThemeColor(parentSet?.colorClass || "from-slate-600 to-slate-700");
        } else { // It's a CustomThemeData
            itemName = chosenItemForGemini.name;
            setNameForGemini = "Custom Decks";
            deckSetIdForCard = null; // Custom decks don't belong to a DeckSet
            setCurrentDrawingThemeColor(chosenItemForGemini.colorClass);
        }
    } else if (selectedThemeIdentifier.startsWith("CUSTOM_")) {
        chosenItemForGemini = getCustomDeckById(selectedThemeIdentifier as CustomThemeId, customDecks);
        if (chosenItemForGemini) {
            itemName = chosenItemForGemini.name;
            setNameForGemini = "Custom Decks";
            setCurrentDrawingThemeColor(chosenItemForGemini.colorClass);
        }
    } else { // It's a MicroDeck from a specific DeckSet (or a direct MicroDeck ID if we support that later)
        const deckSet = DECK_SETS.find(ds => ds.id === selectedThemeIdentifier); // User might click a DeckSet
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
        } else { // Could be a direct MicroDeck ID if UI allows drawing from individual micro-decks
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
      const isSpecialMode = selectedGroupSetting === "SPECIAL" && 
                            participants.some(p => p.id === 'sven-special') &&
                            participants.some(p => p.id === 'lisa-special');

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
        selectedVoiceName,
        selectedLanguageCode,
        isSpecialMode
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
        isCulminationCard: chosenItemForGemini.id === CULMINATION_MICRO_DECK_PROXY.id,
      };

      setDrawnCardHistory(prevHistory => {
        const updatedHistory = prevHistory.map(card => ({ ...card, isFaded: true }));
        return [newCard, ...updatedHistory].slice(0, MAX_HISTORY_WITH_AUDIO + 5); 
      });

      if (!isAudioMuted && newCard.audioData && newCard.audioMimeType) {
        audioPlaybackTimerRef.current = setTimeout(() => {
          if (!hasPlayedAudioForNewestCard) {
            playAudioData(newCard.audioData!, newCard.audioMimeType!, isAudioMuted);
            setHasPlayedAudioForNewestCard(true);
          }
        }, ECHO_BREATH_PAUSE_MS);
      }
      handleMusicSteering(newCard);


    } catch (err: any) {
      console.error("Error drawing card:", err);
      setError(err.message || "Failed to draw card.");
      handleMusicSteering(null); // Clear music steering on error
    } finally {
      setIsLoading(false);
      setThemeBeingDrawnName(null);
      setActiveParticipantNameForPlaceholder(null);
      setCurrentDrawingThemeColor(null);
      
      // Rotate active participant if more than one
      if (participants.length > 1 && activeParticipantId) {
        const currentIndex = participants.findIndex(p => p.id === activeParticipantId);
        const nextIndex = (currentIndex + 1) % participants.length;
        setActiveParticipantId(participants[nextIndex].id);
      } else if (participants.length === 1 && !activeParticipantId) {
        setActiveParticipantId(participants[0].id); // Ensure one is active if only one exists
      }
    }
  };


  const handleDrawCulminationCard = () => {
    handleDrawNewCard(CULMINATION_MICRO_DECK_PROXY.id);
  };
  useEffect(() => {
    const culmMicroDeck = getMicroDeckById(CULMINATION_MICRO_DECK_PROXY.id);
    if (!culmMicroDeck) { setShowCulminationCardButton(false); return; }

    const nonCulmCards = drawnCardHistory.filter(c => c.themeIdentifier !== CULMINATION_MICRO_DECK_PROXY.id);
    const hasDrawnCulmRecently = drawnCardHistory.length > 0 && drawnCardHistory[0].themeIdentifier === CULMINATION_MICRO_DECK_PROXY.id;
    
    setShowCulminationCardButton(nonCulmCards.length >= 3 && !hasDrawnCulmRecently);
  }, [drawnCardHistory]);


  const handleLikeCard = (id: string) => {
    setDrawnCardHistory(prev => prev.map(card => card.id === id ? { ...card, feedback: 'liked' } : card));
  };
  const handleDislikeCard = (id: string) => {
    setDrawnCardHistory(prev => prev.map(card => card.id === id ? { ...card, feedback: 'disliked' } : card));
  };
  
  const handlePlayAudioForNewestCard = (audioDetails: { text: string | null; audioData: string | null; audioMimeType: string | null }) => {
    stopSpeechServicePlayback();
    if (audioPlaybackTimerRef.current) clearTimeout(audioPlaybackTimerRef.current);

    if (isAudioMuted) return;

    if (audioDetails.audioData && audioDetails.audioMimeType) {
        playAudioData(audioDetails.audioData, audioDetails.audioMimeType, isAudioMuted);
    } else if (audioDetails.text) {
        speakText(audioDetails.text, selectedLanguageCode, isAudioMuted);
    }
    setHasPlayedAudioForNewestCard(true);
  };

  const handleFetchAndPlayCardBackAudio = async (cardId: string, textToSpeak: string) => {
    if (isAudioMuted || !textToSpeak.trim()) return;

    // Find the card in history
    const cardIndex = drawnCardHistory.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.warn("Card not found in history for card back audio.");
        return;
    }
    
    // Check if audio already exists
    const card = drawnCardHistory[cardIndex];
    if (card.cardBackAudioData && card.cardBackAudioMimeType) {
        console.log("Using cached card back audio for card:", cardId);
        playAudioData(card.cardBackAudioData, card.cardBackAudioMimeType, isAudioMuted);
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
            playAudioData(audioResult.audioData, audioResult.audioMimeType, isAudioMuted);
        } else {
            console.warn(`Failed to generate card back audio: ${audioResult.error}. Speaking text instead.`);
            speakText(textToSpeak, selectedLanguageCode, isAudioMuted);
        }
    } catch (e: any) {
        console.error("Error fetching/playing card back audio:", e);
        speakText(textToSpeak, selectedLanguageCode, isAudioMuted); // Fallback to basic TTS
    }
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
        stopSpeechServicePlayback(); // Stop any current speech
        if (musicServiceRef.current && musicSessionState === 'PLAYING') {
            musicServiceRef.current.pauseMusic(); // Pause music if it's playing
        }
    } else {
        if (musicServiceRef.current && musicSessionState === 'PAUSED' && isMusicEnabled) {
             musicServiceRef.current.playMusic(); // Resume music if it was paused due to mute
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
    <div className="flex flex-col min-h-screen items-center justify-between bg-slate-900 text-slate-200 w-full overflow-hidden">
      
      {apiKeyMissing && (
        <div className="fixed top-0 left-0 right-0 p-4 flex justify-center z-[100]">
          <ApiKeyMessage />
        </div>
      )}

      {/* Header Area */}
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

      {/* Main Content Area */}
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
        />
        {error && <p className="text-red-400 mt-4 text-center text-sm px-4">{error}</p>}

        {showCulminationCardButton && !isLoading && (
            <button
                onClick={handleDrawCulminationCard}
                className="mt-6 mb-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                title="Reflect on the session and draw a synthesis card"
            >
                Synthesize Session
            </button>
        )}
      </main>

      {/* Footer Area */}
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

      {/* Modals */}
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
            onClose={() => { setShowSvenAndLisaOnboardingModal(false); setSvenAndLisaOnboardingDrawFn(null); }}
            onConfirm={handleSvenAndLisaOnboardingConfirm}
        />
      )}
    </div>
  );
};

export default App;
