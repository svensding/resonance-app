

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
    MusicService, MusicSessionState, WeightedPrompt as LyriaWeightedPrompt, LiveMusicGenerationConfig as LyriaConfig 
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
  MUSIC_VOLUME: 'resonanceClio_musicVolume_v1', // New key for music volume
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
    () => loadFromLocalStorage<number>(LOCALSTORAGE_KEYS.MUSIC_VOLUME, 0.5) // Default volume 50%
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
        if (key.startsWith('resonanceClio_') && !Object.values(LOCALSTORAGE_KEYS).includes(key) && key !== 'resonanceClio_hiddenDeckIds_v2') {
            localStorage.removeItem(key); console.log(`Removed old localStorage key: ${key}`);
        } else if (key.startsWith('resonanceEcho_')) {
            localStorage.removeItem(key); console.log(`Removed old localStorage key: ${key}`);
        }
    });

    setDrawnCardHistory([]);
    const defaultParticipant = { id: `participant-${Date.now()}-fresh-load`, name: '' };
    setParticipants([defaultParticipant]);
    setActiveParticipantId(defaultParticipant.id);
    
    setSelectedVoiceName(loadFromLocalStorage<VoiceName>(LOCALSTORAGE_KEYS.VOICE_NAME, DEFAULT_VOICE_NAME));
    setSelectedLanguageCode(loadFromLocalStorage<LanguageCode>(LOCALSTORAGE_KEYS.LANGUAGE_CODE, DEFAULT_LANGUAGE_CODE));
    setIsAudioMuted(loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUTED, false));
    setCustomDecks(loadFromLocalStorage<CustomThemeData[]>(LOCALSTORAGE_KEYS.CUSTOM_DECKS, []));
    setSelectedGroupSetting(loadFromLocalStorage<GroupSetting>(LOCALSTORAGE_KEYS.GROUP_SETTING, DEFAULT_GROUP_SETTING));
    
  }, []);

  useEffect(() => { saveToLocalStorage<CustomThemeData[]>(LOCALSTORAGE_KEYS.CUSTOM_DECKS, customDecks); }, [customDecks]);
  useEffect(() => { saveToLocalStorage<VoiceName>(LOCALSTORAGE_KEYS.VOICE_NAME, selectedVoiceName); }, [selectedVoiceName]);
  useEffect(() => { saveToLocalStorage<LanguageCode>(LOCALSTORAGE_KEYS.LANGUAGE_CODE, selectedLanguageCode); }, [selectedLanguageCode]);
  useEffect(() => { saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.IS_MUTED, isAudioMuted); }, [isAudioMuted]);
  useEffect(() => { saveToLocalStorage<GroupSetting>(LOCALSTORAGE_KEYS.GROUP_SETTING, selectedGroupSetting); }, [selectedGroupSetting]);

  const customDeckColorPool: string[] = [ 
    "from-lime-400 to-green-500", "from-cyan-400 to-blue-500", "from-fuchsia-400 to-purple-500",
    "from-orange-400 to-red-500", "from-yellow-300 to-amber-400", "from-indigo-400 to-violet-500",
    "from-pink-400 to-rose-500", "from-teal-300 to-emerald-400",
  ];

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      setError("Gemini API Key is missing. Please configure it in your environment variables.");
    }
  }, []); 

  useEffect(() => {
    if (participants.length > 0) {
        const activeParticipantStillExists = activeParticipantId && participants.some(p => p.id === activeParticipantId);
        if (!activeParticipantStillExists && participants[0]) setActiveParticipantId(participants[0].id);
        else if (participants.length > 0 && !activeParticipantId && participants[0]) setActiveParticipantId(participants[0].id);
    } else if (participants.length === 0 && activeParticipantId !== null) setActiveParticipantId(null); 
  }, [participants, activeParticipantId]);


  useEffect(() => {
    if (audioPlaybackTimerRef.current) clearTimeout(audioPlaybackTimerRef.current);
    if (drawnCardHistory.length > 0 && !isLoading && !hasPlayedAudioForNewestCard) {
      const newestCard = drawnCardHistory[0];
      if (!newestCard.isFaded) {
        audioPlaybackTimerRef.current = setTimeout(() => {
          if (newestCard.audioData && newestCard.audioMimeType) {
            playAudioData(newestCard.audioData, newestCard.audioMimeType, isAudioMuted);
          } else if (newestCard.text) {
            speakText(newestCard.text, selectedLanguageCode, isAudioMuted); 
          }
          setHasPlayedAudioForNewestCard(true);
        }, ECHO_BREATH_PAUSE_MS);
      } else {
        setHasPlayedAudioForNewestCard(true); 
      }
    }
    return () => { if (audioPlaybackTimerRef.current) clearTimeout(audioPlaybackTimerRef.current); }
  }, [drawnCardHistory, isLoading, hasPlayedAudioForNewestCard, isAudioMuted, selectedLanguageCode]);

    // Music Service Effects
    useEffect(() => {
        if (isMusicEnabled && !musicServiceRef.current && process.env.API_KEY) {
            console.log("Music enabled, initializing MusicService.");
            setMusicError(null); 
            musicServiceRef.current = new MusicService(
                process.env.API_KEY,
                (state) => { setMusicSessionState(state); },
                (err) => { setMusicError(err); }
            );
            musicServiceRef.current.connect();
        } else if ((!isMusicEnabled || apiKeyMissing) && musicServiceRef.current) {
            console.log("Music disabled or API key missing, disconnecting MusicService.");
            musicServiceRef.current.disconnect();
            musicServiceRef.current = null;
            setMusicSessionState('DISCONNECTED');
        }
    }, [isMusicEnabled, apiKeyMissing]);

    useEffect(() => { 
        if (musicServiceRef.current && musicSessionState === 'CONNECTED' && isMusicEnabled) {
            console.log("Music connected, MusicService will play its base theme.");
            musicServiceRef.current.setVolume(isAudioMuted ? 0 : musicVolume); // Set volume before playing
            musicServiceRef.current.playMusic(); 
        } else if (musicServiceRef.current && musicSessionState === 'ERROR' && isMusicEnabled) {
            console.warn("Music service in ERROR state. Consider toggling music off/on to reinitialize.");
        }
    }, [musicSessionState, isMusicEnabled, musicVolume, isAudioMuted]);

    useEffect(() => { 
        if (musicServiceRef.current && (musicSessionState === 'PLAYING' || musicSessionState === 'LOADING_BUFFER' || musicSessionState === 'PLAY_REQUESTED') && isMusicEnabled) {
            musicServiceRef.current.setVolume(isAudioMuted ? 0 : musicVolume); // Ensure volume is current

            const layerPrompts: LyriaWeightedPrompt[] = [];
            const layerConfigChanges: Partial<LyriaConfig> = {};

            if (currentDeckSetForMusic) {
                let deckSetThemeText = "";
                switch (currentDeckSetForMusic.id) {
                    case "KINDLING_CONNECTION": 
                        deckSetThemeText = "playful, light, acoustic, warm, marimba, ukulele, gentle rhythm, bright chords"; 
                        layerConfigChanges.bpm = 90; layerConfigChanges.density = 0.45; layerConfigChanges.brightness = 0.65;
                        break;
                    case "UNVEILING_DEPTHS": 
                        deckSetThemeText = "introspective, deep, cello, piano, thoughtful, evolving pads, atmospheric synth"; 
                        layerConfigChanges.bpm = 70; layerConfigChanges.density = 0.3; layerConfigChanges.brightness = 0.4;
                        break;
                    case "RELATIONAL_ALCHEMY": 
                        deckSetThemeText = "dynamic, connecting, flowing, rhythmic, subtle electronic elements, warm synths, arpeggios"; 
                        layerConfigChanges.bpm = 100; layerConfigChanges.density = 0.5; layerConfigChanges.brightness = 0.55;
                        break;
                    case "ADVENTUROUS_RESONANCE": 
                        deckSetThemeText = "mysterious, sensual underscore, sparse textures, atmospheric, downtempo electronic, kalimba, subtle tension"; 
                        layerConfigChanges.bpm = 80; layerConfigChanges.density = 0.3; layerConfigChanges.brightness = 0.45;
                        break;
                }
                if (deckSetThemeText) layerPrompts.push({ text: deckSetThemeText, weight: 0.8 }); 
            }

            if (currentMicroDeckForMusic) {
                let energyStyleText = "";
                switch (currentMicroDeckForMusic.maturity_rating_hint) {
                    case "General": energyStyleText = "gentle melody, clear harmony, positive feeling"; break;
                    case "Mature": energyStyleText = "reflective chords, nuanced progression, deeper tones"; break;
                    case "Intimate/Explicit": energyStyleText = "sensual rhythm, subtle warmth, soft pads, intimate melody"; break;
                }
                if (currentMicroDeckForMusic.id === CULMINATION_MICRO_DECK_PROXY.id) {
                    energyStyleText = "synthesizing harmony, reflective cadence, concluding theme, hopeful resolution, evolving chords";
                    layerPrompts.push({ text: energyStyleText, weight: 1.0 }); 
                } else if (energyStyleText) {
                    layerPrompts.push({ text: energyStyleText, weight: 0.9 });
                }
            }
            
            if (layerPrompts.length > 0 || Object.keys(layerConfigChanges).length > 0) {
                 console.log("App: Steering music with layer prompts:", layerPrompts, "and layer config changes:", layerConfigChanges);
                 musicServiceRef.current.steerMusic(layerPrompts, layerConfigChanges);
            } else if (currentDeckSetForMusic === null && currentMicroDeckForMusic === null) {
                console.log("App: Reverting music to base theme (no layers).");
                musicServiceRef.current.steerMusic([], {}); 
            }
        }
    }, [currentDeckSetForMusic, currentMicroDeckForMusic, musicSessionState, isMusicEnabled, musicVolume, isAudioMuted]);

    const stopAllCurrentPlayback = useCallback(() => {
        stopSpeechServicePlayback();
    }, []);


  const rotateActiveParticipant = useCallback(() => {
    if (participants.length <= 1) return;
    const namedParticipantsToConsider = participants.filter(p => p.name.trim() !== '');
    const targetParticipants = namedParticipantsToConsider.length > 0 ? namedParticipantsToConsider : participants;
    if (targetParticipants.length === 0) return;

    const currentIndex = targetParticipants.findIndex(p => p.id === activeParticipantId);
    let nextIndex = (currentIndex + 1) % targetParticipants.length;
    if (currentIndex === -1 && targetParticipants[0] ) setActiveParticipantId(targetParticipants[0].id);
    else if (targetParticipants[nextIndex]) setActiveParticipantId(targetParticipants[nextIndex].id);
  }, [participants, activeParticipantId]);


  const executeDrawLogic = useCallback(async (
    userSelectedSetNameForGemini: string,
    itemForGemini: MicroDeck | CustomThemeData,
    finalThemeIdentifierForHistory: ThemeIdentifier,
    deckSetIdForHistory: string | null,
    isCulminationRequest: boolean,
    isSvenAndLisaSpecialModeActive: boolean 
  ) => {
    const currentParticipant = participants.find(p => p.id === activeParticipantId);
    setActiveParticipantNameForPlaceholder(currentParticipant?.name.trim() || null);
    
    setIsLoading(true);
    setError(null);
    stopAllCurrentPlayback(); 
    setHasPlayedAudioForNewestCard(false);
    setShowCulminationCardButton(false); 

    const activeParticipant = participants.find(p => p.id === activeParticipantId);
    const participantCount = participants.filter(p => p.name.trim() !== '').length || participants.length;

    const microDeckForMusicContext = 'internal_name' in itemForGemini ? itemForGemini as MicroDeck : null;
    setCurrentMicroDeckForMusic(microDeckForMusicContext);
    if (deckSetIdForHistory) {
        setCurrentDeckSetForMusic(getDeckSetById(deckSetIdForHistory));
    } else if (microDeckForMusicContext?.belongs_to_set) {
        setCurrentDeckSetForMusic(getDeckSetById(microDeckForMusicContext.belongs_to_set));
    } else { 
        setCurrentDeckSetForMusic(null); 
    }


    try {
      const geminiResponse = await generatePromptAndAudioFromGemini(
        userSelectedSetNameForGemini,
        itemForGemini, 
        participantCount,
        participants.filter(p => p.name.trim() !== '').map(p => p.name),
        activeParticipant?.name.trim() ? activeParticipant.name : null,
        selectedGroupSetting,
        drawnCardHistory,
        selectedVoiceName,
        selectedLanguageCode,
        isSvenAndLisaSpecialModeActive 
      );

      const newCard: DrawnCardData = {
        ...geminiResponse, 
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        themeIdentifier: finalThemeIdentifierForHistory, 
        deckSetId: deckSetIdForHistory,
        feedback: null,
        timestamp: Date.now(),
        drawnForParticipantId: activeParticipantId,
        drawnForParticipantName: activeParticipant?.name.trim() || null,
        isFaded: false, 
        isCulminationCard: isCulminationRequest,
        cardBackAudioData: null, 
        cardBackAudioMimeType: null,
      };
      
      setDrawnCardHistory(prevHistory => {
        const updatedHistory = [newCard, ...prevHistory.map(card => ({...card, isFaded: card.isFaded || card.feedback === 'disliked'}))];
        if (updatedHistory.length > MAX_HISTORY_WITH_AUDIO) {
          for (let i = MAX_HISTORY_WITH_AUDIO; i < updatedHistory.length; i++) {
            if (updatedHistory[i]) {
              updatedHistory[i].audioData = null; 
              updatedHistory[i].audioMimeType = null;
            }
          }
        }
        return updatedHistory;
      });
      
      if (!isCulminationRequest) rotateActiveParticipant();
      
      const historyLength = drawnCardHistory.length + 1; 
      if (!isCulminationRequest && historyLength >= 5 && historyLength <= 10 && Math.random() < 0.30) { 
          setShowCulminationCardButton(true);
      } else {
          setShowCulminationCardButton(false);
      }

    } catch (e: any) { 
      console.error("Failed to generate prompt and/or audio:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the prompt.";
      if (errorMessage.includes("API_KEY") || errorMessage.includes("API Key") || errorMessage.includes("authentication")) {
        setApiKeyMissing(true);
      }
      setError(errorMessage);
      setHasPlayedAudioForNewestCard(true); 
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyMissing, participants, activeParticipantId, selectedGroupSetting, drawnCardHistory, selectedVoiceName, selectedLanguageCode, rotateActiveParticipant, stopAllCurrentPlayback]);


  const handleDrawCardInternal = useCallback(async (
    identifier: DeckSet['id'] | CustomThemeId | "RANDOM" | "CULMINATION_CARD", 
  ) => {
    if (apiKeyMissing || isLoading) return;
    
    const svenAndLisaNames = ["sven", "lisa"];
    const participantNamesLower = participants.map(p => p.name.trim().toLowerCase());
    const isSvenAndLisaSpecialModeActive =
        selectedGroupSetting === "SPECIAL" &&
        participants.length === 2 &&
        svenAndLisaNames.every(name => participantNamesLower.includes(name)) &&
        participantNamesLower.every(name => svenAndLisaNames.includes(name));

    const svenLisaPrioritizedMicroDecks = ALL_MICRO_DECKS.filter(md =>
        SVEN_LISA_PRIORITIZED_MICRO_DECK_IDS.includes(md.id)
    );
    
    let itemForGemini: MicroDeck | CustomThemeData;
    let userSelectedSetNameForGemini: string;
    let finalThemeIdentifierForHistory: ThemeIdentifier; 
    let deckSetIdForHistory: string | null = null;
    let displayThemeName: string; 
    let displayThemeColor: string;
    let isCulminationRequest = identifier === "CULMINATION_CARD";

    if (isCulminationRequest) {
        itemForGemini = CULMINATION_MICRO_DECK_PROXY;
        userSelectedSetNameForGemini = "Session Reflection";
        finalThemeIdentifierForHistory = CULMINATION_MICRO_DECK_PROXY.id;
        displayThemeName = CULMINATION_MICRO_DECK_PROXY.internal_name;
        displayThemeColor = getDeckSetById("UNVEILING_DEPTHS")?.colorClass || "from-purple-600 to-indigo-700";
    } else if (identifier === "RANDOM") {
      let deckPoolForRandom = ALL_MICRO_DECKS;
      if (isSvenAndLisaSpecialModeActive) {
        deckPoolForRandom = svenLisaPrioritizedMicroDecks;
        if (deckPoolForRandom.length === 0) {
          setError("No prioritized micro-decks available for random selection in Sven & Lisa mode. Try 'Kindling Connection' or adjust settings.");
          return;
        }
      }
      if (deckPoolForRandom.length === 0) {
        setError("No micro-decks available for random selection."); return;
      }
      const randomMicroDeck = deckPoolForRandom[Math.floor(Math.random() * deckPoolForRandom.length)];
      itemForGemini = randomMicroDeck;
      const parentSet = randomMicroDeck.belongs_to_set ? getDeckSetById(randomMicroDeck.belongs_to_set) : null;
      userSelectedSetNameForGemini = parentSet?.name || "Random Selection";
      finalThemeIdentifierForHistory = randomMicroDeck.id;
      deckSetIdForHistory = randomMicroDeck.belongs_to_set;
      displayThemeName = randomMicroDeck.internal_name;
      displayThemeColor = parentSet?.colorClass || "from-gray-500 to-gray-600";
    } else if (identifier.startsWith("CUSTOM_")) {
      const customDeck = getCustomDeckById(identifier as CustomThemeId, customDecks);
      if (!customDeck) { setError(`Custom deck "${identifier}" not found.`); return; }
      itemForGemini = customDeck;
      userSelectedSetNameForGemini = "Custom Deck";
      finalThemeIdentifierForHistory = customDeck.id;
      displayThemeName = customDeck.name;
      displayThemeColor = customDeck.colorClass;
    } else { 
      const selectedDeckSet = getDeckSetById(identifier as DeckSet['id']);
      if (!selectedDeckSet) { setError(`Deck Set "${identifier}" not found.`); return; }
      
      let microDecksInSet = ALL_MICRO_DECKS.filter(md => md.belongs_to_set === selectedDeckSet.id);
      if (isSvenAndLisaSpecialModeActive) {
        microDecksInSet = microDecksInSet.filter(md => SVEN_LISA_PRIORITIZED_MICRO_DECK_IDS.includes(md.id));
        if (microDecksInSet.length === 0) {
          setError(`Deck Set "${selectedDeckSet.name}" has no prioritized micro-decks for Sven & Lisa mode. Try "Kindling Connection", "Random", or check settings.`);
          return;
        }
      }
      if (microDecksInSet.length === 0) { 
        setError(`Deck Set "${selectedDeckSet.name}" has no micro-decks (or none that fit the current mode filter).`); return; 
      }
      
      itemForGemini = microDecksInSet[Math.floor(Math.random() * microDecksInSet.length)];
      userSelectedSetNameForGemini = selectedDeckSet.name;
      finalThemeIdentifierForHistory = itemForGemini.id;
      deckSetIdForHistory = selectedDeckSet.id;
      displayThemeName = (itemForGemini as MicroDeck).internal_name;
      displayThemeColor = selectedDeckSet.colorClass;
    }
    
    setThemeBeingDrawnName(displayThemeName); 
    setCurrentDrawingThemeColor(displayThemeColor);
    
    const drawFn = () => executeDrawLogic(
        userSelectedSetNameForGemini,
        itemForGemini,
        finalThemeIdentifierForHistory,
        deckSetIdForHistory,
        isCulminationRequest,
        isSvenAndLisaSpecialModeActive 
    );

    if (isSvenAndLisaSpecialModeActive && !hasShownSvenAndLisaOnboarding && identifier !== "CULMINATION_CARD" && !identifier.startsWith("CUSTOM_")) {
        setSvenAndLisaOnboardingDrawFn(() => drawFn);
        setShowSvenAndLisaOnboardingModal(true);
    } else {
        await drawFn();
    }

  }, [
    apiKeyMissing, isLoading, participants, activeParticipantId, customDecks, 
    selectedVoiceName, selectedLanguageCode, selectedGroupSetting, 
    executeDrawLogic, hasShownSvenAndLisaOnboarding, 
    drawnCardHistory 
  ]);


  const handleLikeCard = useCallback((cardId: string) => {
    setDrawnCardHistory(prevHistory =>
      prevHistory.map(card => card.id === cardId ? { ...card, feedback: card.feedback === 'liked' ? null : 'liked' } : card)
    );
  }, []);

  const handleDislikeCard = useCallback((cardId: string) => {
    setDrawnCardHistory(prevHistory =>
      prevHistory.map((card, index) => {
        if (card.id === cardId) {
          const newFeedback = card.feedback === 'disliked' ? null : 'disliked';
          const isNewestCard = index === 0;
          if (isNewestCard && newFeedback === 'disliked' && card.drawnForParticipantId) {
            setActiveParticipantId(card.drawnForParticipantId);
          }
          return { ...card, feedback: newFeedback, isFaded: newFeedback === 'disliked' };
        }
        return card;
      })
    );
  }, []); 
  
  const handlePlayAudioForMainPrompt = useCallback((audioDetails: { text: string | null, audioData: string | null, audioMimeType: string | null }) => {
    stopAllCurrentPlayback(); 
    if (audioDetails.audioData && audioDetails.audioMimeType) {
      playAudioData(audioDetails.audioData, audioDetails.audioMimeType, isAudioMuted);
    } else if (audioDetails.text) {
      speakText(audioDetails.text, selectedLanguageCode, isAudioMuted);
    }
  }, [selectedLanguageCode, isAudioMuted, stopAllCurrentPlayback]);

  const handleFetchAndPlayCardBackAudio = useCallback(async (cardId: string, textToSpeak: string) => {
    if ((isAudioMuted && textToSpeak && textToSpeak.trim() !== "") || (!textToSpeak || textToSpeak.trim() === "")) { 
        stopAllCurrentPlayback(); return;
    }
    stopAllCurrentPlayback();
    const cardIndex = drawnCardHistory.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const cardData = drawnCardHistory[cardIndex];
    let styleDirective = "";
    if (cardData && !cardData.themeIdentifier.startsWith("CUSTOM_")) {
        const microDeck = getMicroDeckById(cardData.themeIdentifier as MicroDeck['id']);
        styleDirective = getStyleDirectiveForMicroDeck(microDeck, true); // true for cardBackNotes
    } else {
        styleDirective = getStyleDirectiveForMicroDeck(null, true); // Default for custom or unknown
    }

    try {
        const { audioData, audioMimeType, error: audioError } = await generateAudioForText(textToSpeak, selectedVoiceName, styleDirective);
        if (audioError) { console.warn(`Failed to generate audio for card back (ID: ${cardId}): ${audioError}`); return; }
        if (audioData && audioMimeType) {
            setDrawnCardHistory(prev => prev.map(c => c.id === cardId ? { ...c, cardBackAudioData: audioData, cardBackAudioMimeType: audioMimeType } : c));
            playAudioData(audioData, audioMimeType, isAudioMuted);
        }
    } catch (e: any) { console.error(`Error fetching or playing card back audio (ID: ${cardId}):`, e); }
  }, [selectedVoiceName, isAudioMuted, drawnCardHistory, stopAllCurrentPlayback]);


  const handleOpenCustomDeckModal = (deckToEdit?: CustomThemeData) => {
    setEditingCustomDeck(deckToEdit || null);
    setShowCustomDeckModal(true);
  };
  
  const handleShowDeckInfo = (itemId: DeckSet['id'] | CustomThemeId) => {
    let itemToShow: DeckSet | CustomThemeData | null = null;
    if (itemId.startsWith("CUSTOM_")) {
      itemToShow = getCustomDeckById(itemId as CustomThemeId, customDecks);
    } else {
      itemToShow = getDeckSetById(itemId as DeckSet['id']);
    }
    
    if (itemToShow) {
      setItemForInfoModal(itemToShow);
      setShowDeckInfoModal(true);
    }
  };

  const handleSaveCustomDeck = (name: string, description: string) => {
    if (editingCustomDeck) {
      setCustomDecks(prev => prev.map(deck => deck.id === editingCustomDeck.id ? { ...deck, name, description } : deck));
    } else {
      const newCustomDeck: CustomThemeData = {
        id: `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` as CustomThemeId,
        name, description, 
        colorClass: customDeckColorPool[customDecks.length % customDeckColorPool.length] || "from-gray-500 to-gray-600",
      };
      setCustomDecks(prev => [...prev, newCustomDeck]);
    }
    setShowCustomDeckModal(false);
    setEditingCustomDeck(null);
  };

  const handleRemoveParticipant = useCallback((participantIdToRemove: string) => {
    setParticipants(prevParticipants => {
      const remainingParticipants = prevParticipants.filter(p => p.id !== participantIdToRemove);
      if (remainingParticipants.length === 0) {
        const newParticipant = { id: `participant-${Date.now()}-default-remove`, name: '' };
        setActiveParticipantId(newParticipant.id); 
        return [newParticipant];
      } else {
        if (activeParticipantId === participantIdToRemove) {
          const removedParticipantIndex = prevParticipants.findIndex(p => p.id === participantIdToRemove);
          let newActiveParticipantIndex = Math.max(0, removedParticipantIndex -1); 
          if (prevParticipants.length > 1 && removedParticipantIndex === 0) newActiveParticipantIndex = 0; 
          newActiveParticipantIndex = Math.min(newActiveParticipantIndex, remainingParticipants.length -1);
          if (remainingParticipants[newActiveParticipantIndex]) setActiveParticipantId(remainingParticipants[newActiveParticipantIndex].id);
          else if (remainingParticipants[0]) setActiveParticipantId(remainingParticipants[0].id);
          else setActiveParticipantId(null); 
        }
        return remainingParticipants;
      }
    });
  }, [activeParticipantId]); 

  const handleOpenVoiceSettingsModal = () => setShowVoiceSettingsModal(true);
  const handleCloseVoiceSettingsModal = () => setShowVoiceSettingsModal(false);
  const handleVoiceChange = (newVoice: VoiceName) => setSelectedVoiceName(newVoice);
  const handleLanguageChange = (newLang: LanguageCode) => setSelectedLanguageCode(newLang);
  
  const handleMuteToggle = async (muted: boolean) => { 
      setIsAudioMuted(muted); 
      if (muted) {
          stopSpeechServicePlayback(); 
          if (musicServiceRef.current && isMusicEnabled) {
              musicServiceRef.current.setVolume(0); 
          }
      } else {
          if (musicServiceRef.current && isMusicEnabled) {
              musicServiceRef.current.setVolume(musicVolume);
              if (musicSessionState === 'PAUSED') {
                 try {
                    await musicServiceRef.current.playMusic(); 
                } catch (e) {
                    console.error("Error resuming music on unmute:", e);
                    setMusicError("Failed to resume music. You might need to toggle music off/on.");
                }
              }
          }
      }
  };

  const handleMusicEnableToggle = (enabled: boolean) => {
      setIsMusicEnabled(enabled);
      if (enabled && musicServiceRef.current) {
          musicServiceRef.current.setVolume(isAudioMuted ? 0 : musicVolume);
      } else if (!enabled && musicServiceRef.current) {
          // MusicService disconnect logic already handles pausing/stopping.
      }
  };

  const handleMusicVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume);
    if (musicServiceRef.current && isMusicEnabled && !isAudioMuted) {
      musicServiceRef.current.setVolume(newVolume);
    }
  };

  const handleOpenGroupSettingModal = () => setShowGroupSettingModal(true);
  const handleCloseGroupSettingModal = () => setShowGroupSettingModal(false);
  const handleGroupSettingChange = (newSetting: GroupSetting) => setSelectedGroupSetting(newSetting);
  
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-20">
        {/* Adjusted height and blur for responsiveness */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/70 via-slate-900/70 via-[67%] to-transparent backdrop-blur-sm sm:backdrop-blur-md shadow-lg 
                        h-[calc(0.95*7rem)] xs:h-[calc(0.9*8rem)] sm:h-[calc(0.93*9rem)] md:h-[calc(0.95*10rem)] lg:h-[calc(0.95*11rem)]"></div>
        <div className="relative"> 
          <ThemeDeckSelection 
              onDraw={(itemId) => handleDrawCardInternal(itemId)} 
              isDrawingInProgress={isLoading}
              interactionsDisabled={apiKeyMissing}
              customDecks={customDecks}
              onAddCustomDeck={() => handleOpenCustomDeckModal()}
              onEditCustomDeck={(deck) => handleOpenCustomDeckModal(deck)}
              onShowDeckInfo={handleShowDeckInfo}
          />
        </div>
      </div>

      <main className="main-content-area flex flex-col items-center w-full hide-scrollbar">
        {/* Adjusted top padding for different screen sizes */}
        <div className="w-full flex flex-col items-center 
                        pt-30 xs:pt-34 sm:pt-40 md:pt-44 lg:pt-48 xl:pt-52
                        pb-28 xs:pb-32 sm:pb-36 md:pb-40 lg:pb-44
                        px-1 xs:px-2 sm:px-4 min-h-0">
          {apiKeyMissing && <div className="my-4 w-full max-w-2xl flex justify-center"><ApiKeyMessage /></div>}
          
          {!isLoading && error && !apiKeyMissing && (
            <div className="w-full max-w-xl bg-red-500 p-3 sm:p-4 rounded-lg shadow-xl text-center my-4">
              <p className="font-semibold">Error:</p> <p>{error}</p>
            </div>
          )}
          {musicError && isMusicEnabled && ( 
            <div className="w-full max-w-xl bg-orange-600 p-2 sm:p-3 rounded-lg shadow-lg text-center my-2 text-xs sm:text-sm">
                <p className="font-semibold">Music System Note:</p> <p>{musicError}</p>
            </div>
           )}
          
          {showCulminationCardButton && !isLoading && !error && !apiKeyMissing && (
             <button
                onClick={() => handleDrawCardInternal("CULMINATION_CARD")}
                disabled={isLoading || apiKeyMissing}
                className="my-3 sm:my-4 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-semibold rounded-lg shadow-xl hover:from-purple-500 hover:to-indigo-600 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                title="A Moment of Synthesis?"
              >
                <span className="font-playfair text-base sm:text-lg">⦾</span> <span className="text-sm sm:text-base">A Moment of Synthesis?</span> <span className="font-playfair text-base sm:text-lg">⦾</span>
              </button>
          )}

          <DrawnCardsHistoryView
            history={drawnCardHistory} 
            onLike={handleLikeCard}
            onDislike={handleDislikeCard}
            onPlayAudioForMainPrompt={handlePlayAudioForMainPrompt} 
            onFetchAndPlayCardBackAudio={handleFetchAndPlayCardBackAudio}
            isLoadingNewCard={isLoading && drawnCardHistory.length === 0} 
            isLoadingNextCard={isLoading && drawnCardHistory.length > 0} 
            customDecks={customDecks}
            themeBeingDrawnName={themeBeingDrawnName}
            activeParticipantNameForPlaceholder={activeParticipantNameForPlaceholder}
            onOpenVoiceSettings={handleOpenVoiceSettingsModal}
            currentDrawingThemeColor={currentDrawingThemeColor} 
          />
        </div>
      </main>
      
      {showCustomDeckModal && (
        <CustomDeckModal 
          onClose={() => { setShowCustomDeckModal(false); setEditingCustomDeck(null); }} 
          onSave={handleSaveCustomDeck} 
          initialData={editingCustomDeck || undefined}
          interactionsDisabled={apiKeyMissing}
        />
      )}

      {showVoiceSettingsModal && (
        <VoiceSettingsModal
          currentVoice={selectedVoiceName} currentLanguage={selectedLanguageCode} 
          isMuted={isAudioMuted} onMuteChange={handleMuteToggle}
          isMusicEnabled={isMusicEnabled} onMusicEnableChange={handleMusicEnableToggle}
          musicVolume={musicVolume} onMusicVolumeChange={handleMusicVolumeChange}
          musicSessionState={musicSessionState}
          onVoiceChange={handleVoiceChange} onLanguageChange={handleLanguageChange} 
          onClose={handleCloseVoiceSettingsModal} voicesList={GOOGLE_VOICES} languagesList={LANGUAGES}
        />
      )}

      {showDeckInfoModal && itemForInfoModal && (
        <DeckInfoModal
          item={itemForInfoModal}
          onClose={() => setShowDeckInfoModal(false)}
        />
      )}

      {showGroupSettingModal && (
        <GroupSettingModal
          currentSetting={selectedGroupSetting} onSettingChange={handleGroupSettingChange}
          onClose={handleCloseGroupSettingModal} groupSettingsOptions={GROUP_SETTINGS}
          disabled={apiKeyMissing}
        />
      )}

      {showSvenAndLisaOnboardingModal && (
        <SvenAndLisaOnboardingModal
            onClose={() => {
                setShowSvenAndLisaOnboardingModal(false);
                setSvenAndLisaOnboardingDrawFn(null); 
            }}
            onConfirm={async () => {
                if (svenAndLisaOnboardingDrawFn) {
                    await svenAndLisaOnboardingDrawFn();
                }
                setHasShownSvenAndLisaOnboarding(true);
                setShowSvenAndLisaOnboardingModal(false);
                setSvenAndLisaOnboardingDrawFn(null);
            }}
        />
      )}
      
      {/* Adjusted footer padding for responsiveness */}
      <footer className="bg-slate-800/70 backdrop-blur-sm shadow-top z-20 fixed bottom-0 left-0 right-0 py-0.5 sm:py-1 flex items-center justify-between px-1 xs:px-2 sm:px-4">
        <BottomToolbar 
            participants={participants} setParticipants={setParticipants}
            activeParticipantId={activeParticipantId} setActiveParticipantId={setActiveParticipantId}
            onRemoveParticipant={handleRemoveParticipant}
            groupSetting={selectedGroupSetting} onOpenGroupSettingModal={handleOpenGroupSettingModal}
            disabled={apiKeyMissing} 
        />
      </footer>
    </>
  );
};

export default App;