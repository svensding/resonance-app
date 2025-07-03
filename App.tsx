
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DrawnCardDisplayData as SingleDrawnCardData } from './components/DrawnCard'; 
import { 
  generateCardFront,
  generateCardBack,
  generateAudioForText,
  sendFeedbackToChat,
  CustomThemeData, 
  CustomThemeId, 
  ThemeIdentifier, 
  DeckSet, 
  MicroDeck,
  VoiceName, 
  LanguageCode, 
  DEFAULT_VOICE_NAME, 
  DEFAULT_LANGUAGE_CODE, 
  CURATED_VOICE_PERSONAS,
  GROUP_SETTINGS,
  GroupSetting, 
  DEFAULT_GROUP_SETTING, 
  DECK_SETS, 
  ALL_MICRO_DECKS,
  AngleOfInquiry,
  ANGLES_OF_INQUIRY,
  getMicroDeckById, 
  getCustomDeckById, 
  getDeckSetById, 
  getDisplayDataForCard,
  getStyleDirectiveForMicroDeck,
  getActiveSpecialModeDetails,
  getChatSessionHistory
} from './services/geminiService';
import { playAudioData, speakText, stopSpeechServicePlayback } from './services/speechService'; 
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
import { DevLogSheet, DevLogEntry } from './components/DevLogSheet';
import { CardShuffleAnimation } from './components/CardShuffleAnimation';


const MAX_HISTORY_WITH_AUDIO = 13; 

export interface DrawnCardData { 
  id: string;
  themeIdentifier: ThemeIdentifier; // MicroDeckId or CustomThemeId
  deckSetId?: string | null; // ID of the DeckSet it was drawn from, if applicable
  feedback: 'liked' | 'disliked' | null;
  timestamp: number;
  drawnForParticipantId?: string | null;
  drawnForParticipantName?: string | null;
  isFaded?: boolean; 
  text: string;
  audioData: string | null;
  audioMimeType: string | null;
  cardBackNotesText: string | null;
}

const LOCALSTORAGE_KEYS = {
  CUSTOM_DECKS: 'resonanceClio_customDecks_v3',
  VOICE_NAME: 'resonanceClio_selectedVoiceName_v1',
  LANGUAGE_CODE: 'resonanceClio_selectedLanguageCode_v1',
  IS_MUTED: 'resonanceClio_isAudioMuted_v1',
  GROUP_SETTING: 'resonanceClio_groupSetting_v1',
  SVEN_LISA_ONBOARDING_SHOWN: 'resonanceClio_svenLisaOnboardingShown_v1',
  PAULINA_JOE_ONBOARDING_SHOWN: 'resonanceClio_paulinaJoeOnboardingShown_v1',
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
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [selectedGroupSetting, setSelectedGroupSetting] = useState<GroupSetting>(DEFAULT_GROUP_SETTING);
  const [showGroupSettingModal, setShowGroupSettingModal] = useState<boolean>(false);
  
  const [activeCardAudio, setActiveCardAudio] = useState<{ cardId: string; type: 'prompt' | 'notes' } | null>(null);

  const [customDecks, setCustomDecks] = useState<CustomThemeData[]>([]);
  const [showCustomDeckModal, setShowCustomDeckModal] = useState<boolean>(false);
  const [editingCustomDeck, setEditingCustomDeck] = useState<CustomThemeData | null>(null);
  
  const [shuffleColorClasses, setShuffleColorClasses] = useState<string[]>([]);

  const [showDeckInfoModal, setShowDeckInfoModal] = useState<boolean>(false);
  const [itemForInfoModal, setItemForInfoModal] = useState<DeckSet | CustomThemeData | null>(null);

  const [selectedVoiceName, setSelectedVoiceName] = useState<VoiceName>(DEFAULT_VOICE_NAME);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<LanguageCode>("en-US");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  
  const [specialModeOnboardingDrawFn, setSpecialModeOnboardingDrawFn] = useState<(() => Promise<void>) | null>(null);
  const [showSvenAndLisaOnboardingModal, setShowSvenAndLisaOnboardingModal] = useState<boolean>(false);
  const [hasShownSvenAndLisaOnboarding, setHasShownSvenAndLisaOnboarding] = useState<boolean>(
      () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.SVEN_LISA_ONBOARDING_SHOWN, false)
  );
  const [showPaulinaAndJoeOnboardingModal, setShowPaulinaAndJoeOnboardingModal] = useState<boolean>(false);
  const [hasShownPaulinaAndJoeOnboarding, setHasShownPaulinaAndJoeOnboarding] = useState<boolean>(
      () => loadFromLocalStorage<boolean>(LOCALSTORAGE_KEYS.PAULINA_JOE_ONBOARDING_SHOWN, false)
  );

  const [showDevLogSheet, setShowDevLogSheet] = useState(false);
  const [devLog, setDevLog] = useState<DevLogEntry[]>([]);
  const [showDevFeatures, setShowDevFeatures] = useState(false);

  const addLogEntry = useCallback((entry: DevLogEntry) => {
      setDevLog(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.SVEN_LISA_ONBOARDING_SHOWN, hasShownSvenAndLisaOnboarding);
  }, [hasShownSvenAndLisaOnboarding]);

  useEffect(() => {
    saveToLocalStorage<boolean>(LOCALSTORAGE_KEYS.PAULINA_JOE_ONBOARDING_SHOWN, hasShownPaulinaAndJoeOnboarding);
  }, [hasShownPaulinaAndJoeOnboarding]);

  useEffect(() => {
    const checkHash = () => {
        if (window.location.hash === '#devlog') {
            setShowDevFeatures(true);
        }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash, false);
    return () => window.removeEventListener('hashchange', checkHash, false);
  }, []);

  useEffect(() => {
    // Enables dev features if the group is special and a participant is named SvenDEV.
    if (selectedGroupSetting === 'SPECIAL' && participants.some(p => p.name.trim().toLowerCase() === 'svendev')) {
      setShowDevFeatures(true);
    }
  }, [participants, selectedGroupSetting]);

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
    const loadedLang = loadFromLocalStorage<LanguageCode>(LOCALSTORAGE_KEYS.LANGUAGE_CODE, "en-US");
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
    };
  }, []);

  const handleStopAudio = useCallback(() => {
    stopSpeechServicePlayback();
    setActiveCardAudio(null);
  }, []);

  const handlePlayAudioForMainPrompt = useCallback(async (
      { cardId, text, audioData, audioMimeType }: { cardId: string, text: string | null, audioData: string | null, audioMimeType: string | null }
  ) => {
      handleStopAudio();
      setActiveCardAudio({ cardId, type: 'prompt' });
      const onPlaybackEnd = () => setActiveCardAudio(null);
      
      if (audioData && audioMimeType) {
          playAudioData(audioData, audioMimeType, isAudioMuted, onPlaybackEnd);
      } else if (text) {
          speakText(text, selectedLanguageCode, isAudioMuted, onPlaybackEnd);
      } else {
          setActiveCardAudio(null);
      }
  }, [isAudioMuted, selectedLanguageCode, handleStopAudio]);

  const handleFetchAndPlayCardBackAudio = useCallback(async (cardId: string, textToSpeak: string) => {
    handleStopAudio();
    setActiveCardAudio({ cardId, type: 'notes' });

    try {
        const cardInHistory = drawnCardHistory.find(c => c.id === cardId);
        if (!cardInHistory) throw new Error("Card not found in history");
        
        const microDeck = !cardInHistory.themeIdentifier.startsWith("CUSTOM_")
            ? getMicroDeckById(cardInHistory.themeIdentifier as MicroDeck['id'])
            : null;
        const styleDirective = getStyleDirectiveForMicroDeck(microDeck, true, selectedVoiceName);

        const audioResult = await generateAudioForText(textToSpeak, selectedVoiceName, styleDirective);
        
        addLogEntry({
            type: 'tts',
            requestTimestamp: audioResult.requestTimestamp,
            responseTimestamp: audioResult.responseTimestamp,
            data: { ...audioResult.logData, error: audioResult.error }
        });

        if (audioResult.error || !audioResult.audioData || !audioResult.audioMimeType) {
            throw new Error(audioResult.error || "Failed to generate audio.");
        }
        
        const onPlaybackEnd = () => setActiveCardAudio(null);
        playAudioData(audioResult.audioData, audioResult.audioMimeType, isAudioMuted, onPlaybackEnd);

    } catch (err: any) {
        console.error("Error fetching or playing card back audio:", err);
        setError("Could not generate guidance audio.");
        setActiveCardAudio(null);
    }
  }, [selectedVoiceName, isAudioMuted, drawnCardHistory, handleStopAudio, addLogEntry]);
  
  const handleDrawNewCard = useCallback(async (itemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM", options?: { isRedraw?: boolean }) => {
      if (isLoading || isShuffling) return;
      handleStopAudio();
  
      const participantNames = participants.map(p => p.name).filter(Boolean);
      const groupSettingToUse = (selectedGroupSetting === 'SPECIAL' && participantNames.length < 2) ? 'GENERAL' : selectedGroupSetting;
  
      const { isPaulinaJoe, isSvenLisa } = getActiveSpecialModeDetails(groupSettingToUse, participantNames);
      if ((isPaulinaJoe && !hasShownPaulinaAndJoeOnboarding) || (isSvenLisa && !hasShownSvenAndLisaOnboarding)) {
          setSpecialModeOnboardingDrawFn(() => () => handleDrawNewCard(itemId, options));
          if (isPaulinaJoe) setShowPaulinaAndJoeOnboardingModal(true);
          if (isSvenLisa) setShowSvenAndLisaOnboardingModal(true);
          return;
      }
      
      setIsLoading(true);
      setIsShuffling(true);
      setError(null);
      
      try {
          let chosenItem: MicroDeck | CustomThemeData;
          let userSelectedSetName: string = "A Random Mix";
          let colorsForShuffle: string[] = [];
          let deckSetIdForHistory: string | null = null;
          let drawSource: 'RANDOM' | 'DECK_SET' | 'CUSTOM';
  
          if (itemId === "RANDOM") {
              drawSource = 'RANDOM';
              let availableDecks: MicroDeck[] = [];
              if (groupSettingToUse === 'SPECIAL') {
                  availableDecks = ALL_MICRO_DECKS;
              } else {
                  availableDecks = ALL_MICRO_DECKS.filter(md => {
                    const suitability = md.group_setting_suitability[groupSettingToUse];
                    return suitability === 'PREFERRED' || suitability === 'OPTIONAL';
                  });
              }
              if (availableDecks.length === 0) throw new Error(`No suitable cards available for the "${groupSettingToUse}" setting.`);
              
              const chosenMicroDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
              chosenItem = chosenMicroDeck;
              const parentSet = chosenMicroDeck.belongs_to_set ? getDeckSetById(chosenMicroDeck.belongs_to_set) : null;
              userSelectedSetName = parentSet?.name || "A Random Mix";
              deckSetIdForHistory = parentSet?.id || null;
              colorsForShuffle = DECK_SETS.map(ds => ds.colorClass);
          } else if (itemId.startsWith("CUSTOM_")) {
              drawSource = 'CUSTOM';
              const customDeck = getCustomDeckById(itemId as CustomThemeId, customDecks);
              if (!customDeck) throw new Error("Custom deck not found");
              chosenItem = customDeck;
              userSelectedSetName = customDeck.name;
              deckSetIdForHistory = null;
              colorsForShuffle = [customDeck.colorClass];
          } else {
              drawSource = 'DECK_SET';
              const deckSet = getDeckSetById(itemId as DeckSet['id']);
              if (!deckSet) throw new Error("Deck set not found");
  
              const microDecksInSet = ALL_MICRO_DECKS.filter(md => md.belongs_to_set === itemId);
              let availableDecks: MicroDeck[] = [];
              if (groupSettingToUse === 'SPECIAL') {
                  availableDecks = microDecksInSet;
              } else {
                  const preferredDecks = microDecksInSet.filter(md => md.group_setting_suitability[groupSettingToUse] === 'PREFERRED');
                  const optionalDecks = microDecksInSet.filter(md => md.group_setting_suitability[groupSettingToUse] === 'OPTIONAL');
                  if (preferredDecks.length > 0) availableDecks = preferredDecks;
                  else if (optionalDecks.length > 0) availableDecks = optionalDecks;
              }
          
              if (availableDecks.length === 0) throw new Error(`No suitable cards in "${deckSet.name}" for the "${groupSettingToUse}" setting.`);
  
              const chosenMicroDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
              chosenItem = chosenMicroDeck;
              userSelectedSetName = deckSet.name;
              deckSetIdForHistory = deckSet.id;
              colorsForShuffle = [deckSet.colorClass];
          }
          setShuffleColorClasses(colorsForShuffle);
  
          let chosenAngle: AngleOfInquiry;
          if ('default_angle' in chosenItem) { // It's a MicroDeck
              const microDeck = chosenItem as MicroDeck;
              const possibleAngleIds = [microDeck.default_angle, ...microDeck.alternative_angles];
              const chosenAngleId = possibleAngleIds[Math.floor(Math.random() * possibleAngleIds.length)];
              const foundAngle = ANGLES_OF_INQUIRY.find(a => a.id === chosenAngleId) || ANGLES_OF_INQUIRY[0];
              chosenAngle = foundAngle;
          } else { // It's a CustomThemeData
              chosenAngle = ANGLES_OF_INQUIRY[Math.floor(Math.random() * ANGLES_OF_INQUIRY.length)];
          }
          
          const activePName = participants.find(p => p.id === activeParticipantId)?.name || null;
          const historyLength = drawnCardHistory.length;
          
          const frontResult = await generateCardFront(
              userSelectedSetName, chosenItem, participants.length, participantNames, activePName,
              groupSettingToUse, customDecks, selectedLanguageCode, chosenAngle,
              historyLength, () => {}, addLogEntry, drawSource, { disliked: options?.isRedraw ?? false }
          );
  
          addLogEntry({
              type: 'chat-front',
              requestTimestamp: frontResult.requestTimestamp,
              responseTimestamp: frontResult.responseTimestamp,
              data: { input: frontResult.inputPrompt, output: frontResult.rawLlmOutput, error: frontResult.error }
          });
          
          if (frontResult.error || !frontResult.text) {
              throw new Error(frontResult.error || "The AI failed to generate a response. Please try again.");
          }
          
          const effectiveMicroDeck = !chosenItem.id.startsWith("CUSTOM_")
              ? getMicroDeckById(chosenItem.id as MicroDeck['id'])
              : null;
          const styleDirective = getStyleDirectiveForMicroDeck(effectiveMicroDeck, false, selectedVoiceName);
  
          const audioPromise = isAudioMuted 
              ? Promise.resolve(null)
              : generateAudioForText(frontResult.text, selectedVoiceName, styleDirective);
  
          const cardBackPromise = generateCardBack(frontResult.text, chosenItem);
  
          const [audioGenResult, backResult] = await Promise.all([audioPromise, cardBackPromise]);
  
          if (audioGenResult) {
              addLogEntry({
                  type: 'tts',
                  requestTimestamp: audioGenResult.requestTimestamp,
                  responseTimestamp: audioGenResult.responseTimestamp,
                  data: { ...audioGenResult.logData, error: audioGenResult.error }
              });
              if (audioGenResult.error) setError(`Audio narration failed: ${audioGenResult.error}`);
          }
  
          addLogEntry({
              type: 'chat-back',
              requestTimestamp: backResult.requestTimestamp,
              responseTimestamp: backResult.responseTimestamp,
              data: { input: backResult.inputPrompt, output: backResult.rawLlmOutput, error: backResult.error }
          });
  
          const newCardId = `card-${Date.now()}`;
          const activeParticipant = participants.find(p => p.id === activeParticipantId);
          const newCard: DrawnCardData = {
            id: newCardId,
            themeIdentifier: chosenItem.id,
            deckSetId: deckSetIdForHistory,
            feedback: null,
            timestamp: Date.now(),
            drawnForParticipantId: activeParticipantId,
            drawnForParticipantName: activeParticipant?.name || null,
            isFaded: false,
            text: frontResult.text,
            audioData: audioGenResult?.audioData || null,
            audioMimeType: audioGenResult?.audioMimeType || null,
            cardBackNotesText: backResult?.cardBackNotesText || null
          };
          
          setDrawnCardHistory(prev => [newCard, ...prev.slice(0, MAX_HISTORY_WITH_AUDIO - 1)]);
          
          if (participants.length > 1 && !options?.isRedraw) {
              const currentIndex = participants.findIndex(p => p.id === activeParticipantId);
              const nextIndex = (currentIndex + 1) % participants.length;
              setActiveParticipantId(participants[nextIndex].id);
          }
  
      } catch (err: any) {
        console.error("Error drawing card:", err.message ? JSON.stringify(err.message) : JSON.stringify(err));
        setError(err.message || "An unknown error occurred while drawing the card.");
      } finally {
        setIsShuffling(false);
        setIsLoading(false);
        setShuffleColorClasses([]);
      }
  }, [isLoading, isShuffling, participants, activeParticipantId, customDecks, selectedVoiceName, selectedLanguageCode, handleStopAudio, isAudioMuted, selectedGroupSetting, hasShownPaulinaAndJoeOnboarding, hasShownSvenAndLisaOnboarding, drawnCardHistory.length, addLogEntry]);

  const handleLike = useCallback(async (cardId: string) => {
    const cardToUpdate = drawnCardHistory.find(c => c.id === cardId);
    if (!cardToUpdate) return;

    // Optimistic UI update
    setDrawnCardHistory(prev => prev.map(card => card.id === cardId ? { ...card, feedback: 'liked' } : card));

    // Send feedback to AI
    if (cardToUpdate.text) {
        await sendFeedbackToChat(cardToUpdate.text, 'liked', addLogEntry);
    }
  }, [drawnCardHistory, addLogEntry]);

  const handleDislike = useCallback(async (cardId: string) => {
    if (isLoading || isShuffling) return;

    const cardToUpdate = drawnCardHistory.find(c => c.id === cardId);
    if (!cardToUpdate) return;
    
    const isNewestCard = cardId === drawnCardHistory[0]?.id && !drawnCardHistory[0].isFaded;

    // Optimistic UI update for feedback state on the card
    setDrawnCardHistory(prev => prev.map(card => 
        card.id === cardId ? { ...card, feedback: 'disliked' } : card
    ));

    // Send 'disliked' feedback to the AI for ANY disliked card.
    if (cardToUpdate.text) {
        await sendFeedbackToChat(cardToUpdate.text, 'disliked', addLogEntry);
    }

    if (isNewestCard) {
        // This is the newest card, so we fade it and trigger a redraw.
        setDrawnCardHistory(prev => prev.map(card => 
            card.id === cardId ? { ...card, isFaded: true } : card
        ));

        let originalItemId: DeckSet['id'] | CustomThemeData['id'] | "RANDOM";
        const { deckSetId, themeIdentifier } = cardToUpdate;

        if (deckSetId) {
            originalItemId = deckSetId as DeckSet['id'];
        } else if (themeIdentifier.startsWith("CUSTOM_")) {
            originalItemId = themeIdentifier as CustomThemeData['id'];
        } else {
            originalItemId = "RANDOM";
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        await handleDrawNewCard(originalItemId, { isRedraw: true });

    }
  }, [drawnCardHistory, isLoading, isShuffling, handleDrawNewCard, addLogEntry]);

  const handleAddCustomDeck = () => {
    if (isLoading) return;
    setEditingCustomDeck(null);
    setShowCustomDeckModal(true);
  };
  
  const handleEditCustomDeck = (deck: CustomThemeData) => {
    if (isLoading) return;
    setEditingCustomDeck(deck);
    setShowCustomDeckModal(true);
  };

  const handleSaveCustomDeck = (name: string, description: string) => {
    const colorClasses = ["from-blue-500 to-indigo-600", "from-cyan-500 to-sky-600", "from-teal-500 to-emerald-600", "from-fuchsia-500 to-purple-600"];
    
    if (editingCustomDeck) {
      const updatedDecks = customDecks.map(deck =>
        deck.id === editingCustomDeck.id ? { ...deck, name, description } : deck
      );
      setCustomDecks(updatedDecks);
      saveToLocalStorage(LOCALSTORAGE_KEYS.CUSTOM_DECKS, updatedDecks);
    } else {
      const newDeck: CustomThemeData = {
        id: `CUSTOM_${Date.now()}`, name, description,
        colorClass: colorClasses[customDecks.length % colorClasses.length],
      };
      const updatedDecks = [...customDecks, newDeck];
      setCustomDecks(updatedDecks);
      saveToLocalStorage(LOCALSTORAGE_KEYS.CUSTOM_DECKS, updatedDecks);
    }
    setShowCustomDeckModal(false);
    setEditingCustomDeck(null);
  };
  
  const handleShowDeckInfo = (itemId: ThemeIdentifier) => {
    if (itemId.startsWith("CUSTOM_")) {
        const item = getCustomDeckById(itemId as CustomThemeId, customDecks);
        if (item) setItemForInfoModal(item);
    } else {
        const item = getDeckSetById(itemId as DeckSet['id']);
        if (item) setItemForInfoModal(item);
    }
    setShowDeckInfoModal(true);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(prev => {
        const newParticipants = prev.filter(p => p.id !== participantId);
        if (activeParticipantId === participantId) {
            setActiveParticipantId(newParticipants.length > 0 ? newParticipants[0].id : null);
        }
        if (newParticipants.length === 0) {
            const defaultParticipant = { id: `participant-${Date.now()}`, name: '' };
            setActiveParticipantId(defaultParticipant.id);
            return [defaultParticipant];
        }
        return newParticipants;
    });
  };
  
  const handleVoiceChange = (voice: VoiceName) => {
    setSelectedVoiceName(voice);
    saveToLocalStorage(LOCALSTORAGE_KEYS.VOICE_NAME, voice);
  };
  const handleLanguageChange = (language: LanguageCode) => {
    setSelectedLanguageCode(language);
    saveToLocalStorage(LOCALSTORAGE_KEYS.LANGUAGE_CODE, language);
  };
  const handleMuteChange = (muted: boolean) => {
    setIsAudioMuted(muted);
    saveToLocalStorage(LOCALSTORAGE_KEYS.IS_MUTED, muted);
    if (muted) {
      handleStopAudio();
    }
  };
  const handleGroupSettingChange = (setting: GroupSetting) => {
    setSelectedGroupSetting(setting);
    saveToLocalStorage(LOCALSTORAGE_KEYS.GROUP_SETTING, setting);
  };

  const handleConfirmSvenLisaOnboarding = async () => {
    setShowSvenAndLisaOnboardingModal(false);
    setHasShownSvenAndLisaOnboarding(true);
    if (specialModeOnboardingDrawFn) {
        await specialModeOnboardingDrawFn();
        setSpecialModeOnboardingDrawFn(null);
    }
  };
  const handleConfirmPaulinaJoeOnboarding = async () => {
      setShowPaulinaAndJoeOnboardingModal(false);
      setHasShownPaulinaAndJoeOnboarding(true);
      if (specialModeOnboardingDrawFn) {
          await specialModeOnboardingDrawFn();
          setSpecialModeOnboardingDrawFn(null);
      }
  };

  const handleOpenDevLog = () => {
    setShowDevLogSheet(prev => !prev);
  };


  return (
    <div 
      className="h-screen w-screen flex bg-slate-900 text-slate-200 overflow-hidden" 
      style={{ fontFamily: "'Atkinson Hyperlegible', sans-serif" }}
    >
      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
          <header 
            className="absolute top-0 left-0 right-0 z-20 w-full bg-slate-900/80 backdrop-blur-sm shadow-lg"
            style={{ height: 'var(--header-height-actual)' }}
          >
            <ThemeDeckSelection 
              onDraw={handleDrawNewCard} isDrawingInProgress={isLoading || isShuffling} interactionsDisabled={isLoading || isShuffling}
              customDecks={customDecks} onAddCustomDeck={handleAddCustomDeck}
              onEditCustomDeck={handleEditCustomDeck} onShowDeckInfo={handleShowDeckInfo}
              groupSetting={selectedGroupSetting}
            />
          </header>
          
          <main 
            className="flex-grow w-full overflow-y-auto overflow-x-hidden scrollbar-thin flex justify-center"
            style={{ 
                paddingTop: 'var(--main-content-top-padding)', 
                paddingBottom: 'var(--main-content-bottom-padding)' 
            }}
          >
            {apiKeyMissing ? (
                <div className="flex justify-center items-center h-full"><ApiKeyMessage /></div>
            ) : error ? (
                <div className="flex justify-center items-center p-4">
                    <div className="bg-red-800/80 border border-red-600 text-red-100 px-4 py-3 rounded-lg shadow-md max-w-lg w-full text-center" role="alert">
                      <strong className="font-bold block sm:inline">An error occurred:</strong>
                      <span className="block sm:inline ml-2">{error}</span>
                      <button onClick={() => setError(null)} className="ml-4 px-2 py-1 bg-red-700 rounded-md hover:bg-red-600">Dismiss</button>
                    </div>
                </div>
            ) : (
              <DrawnCardsHistoryView
                history={drawnCardHistory} 
                onLike={handleLike} onDislike={handleDislike}
                onPlayAudioForMainPrompt={handlePlayAudioForMainPrompt}
                onFetchAndPlayCardBackAudio={handleFetchAndPlayCardBackAudio}
                customDecks={customDecks}
                activeCardAudio={activeCardAudio} onStopAudio={handleStopAudio}
                isDrawingInProgress={isLoading || isShuffling}
              />
            )}
          </main>

          <footer 
            className="absolute bottom-0 left-0 right-0 z-20 w-full bg-slate-900/80 backdrop-blur-sm"
            style={{ minHeight: 'var(--footer-height-actual)' }}
          >
              <BottomToolbar 
                participants={participants} setParticipants={setParticipants}
                activeParticipantId={activeParticipantId} setActiveParticipantId={setActiveParticipantId}
                onRemoveParticipant={handleRemoveParticipant} groupSetting={selectedGroupSetting}
                onOpenGroupSettingModal={() => setShowGroupSettingModal(true)} 
                onOpenVoiceSettingsModal={() => setShowVoiceSettingsModal(true)}
                onOpenDevLog={handleOpenDevLog}
                showDevLogButton={showDevFeatures}
                disabled={isLoading || isShuffling}
              />
          </footer>
      </div>
      
      {/* Dev Log Panel */}
      {showDevLogSheet && (
          <aside className="w-full max-w-lg md:max-w-xl lg:max-w-2xl h-full flex-shrink-0 border-l border-slate-700/80">
              <DevLogSheet 
                  history={devLog} 
                  onClose={() => setShowDevLogSheet(false)} 
              />
          </aside>
      )}

      {/* Global Modals and Overlays */}
      {isShuffling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
             <CardShuffleAnimation colorClasses={shuffleColorClasses} />
          </div>
      )}
      {showCustomDeckModal && (
        <CustomDeckModal 
          onClose={() => setShowCustomDeckModal(false)}
          onSave={handleSaveCustomDeck}
          initialData={editingCustomDeck || undefined}
          interactionsDisabled={isLoading || isShuffling}
        />
      )}
      {showVoiceSettingsModal && (
        <VoiceSettingsModal 
          currentVoice={selectedVoiceName} currentLanguage={selectedLanguageCode} isMuted={isAudioMuted}
          onVoiceChange={handleVoiceChange} onLanguageChange={handleLanguageChange} onMuteChange={handleMuteChange}
          onClose={() => setShowVoiceSettingsModal(false)} voicePersonas={CURATED_VOICE_PERSONAS} 
        />
      )}
      {showDeckInfoModal && itemForInfoModal && (
        <DeckInfoModal item={itemForInfoModal} onClose={() => setShowDeckInfoModal(false)} />
      )}
      {showGroupSettingModal && (
        <GroupSettingModal 
          currentSetting={selectedGroupSetting} onSettingChange={handleGroupSettingChange}
          onClose={() => setShowGroupSettingModal(false)} groupSettingsOptions={GROUP_SETTINGS} disabled={isLoading || isShuffling}
        />
      )}
      {showSvenAndLisaOnboardingModal && (
          <SvenAndLisaOnboardingModal 
              onClose={() => setShowSvenAndLisaOnboardingModal(false)} onConfirm={handleConfirmSvenLisaOnboarding}
          />
      )}
      {showPaulinaAndJoeOnboardingModal && (
          <PaulinaAndJoeOnboardingModal 
              onClose={() => setShowPaulinaAndJoeOnboardingModal(false)} onConfirm={handleConfirmPaulinaJoeOnboarding}
          />
      )}
    </div>
  );
}

export default App;
