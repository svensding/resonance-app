
import { GoogleGenAI, GenerateContentResponse, Chat, Content } from "@google/genai";
import { DevLogEntry } from "../components/DevLogSheet";

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
}

const TEXT_GENERATION_MODEL = 'gemini-2.5-flash-preview-04-17';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'; 
const GENERATION_TIMEOUT_MS = 20000; // 20 seconds

// --- NEW RECIPE BUILDING BLOCKS ---

export type SocialContext = "SOLO" | "GENERAL" | "STRANGERS" | "FRIENDS" | "ROMANTIC" | "FAMILY" | "TEAM";
export type AgeGroup = 'Adults' | 'Teens' | 'Kids';

export interface AgeFilters {
    adults: boolean;
    teens: boolean;
    kids: boolean;
}

export type CoreTheme = 
  | 'Body & Sensation' | 'Mind & Thoughts' | 'Heart & Emotions' | 'Shadow & Depth'
  | 'Light & Essence' | 'Desire & Intimacy' | 'Parts & Voices' | 'Outer World'
  | 'Past & Memory' | 'Vision & Future' | 'Play & Creativity' | 'Spirit & Awe'
  | 'Transcendence & Mystery';

export type IntensityLevel = 1 | 2 | 3 | 4 | 5;

export type CardType = 
  | 'Question' | 'Directive' | 'Reflection' | 'Practice' | 'Wildcard' | 'Connector';

export interface DeckCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ThemedDeck {
  id: string;
  name:string;
  category: DeckCategory['id'];
  description: string;
  intensity: IntensityLevel[];
  themes: CoreTheme[];
  cardTypes: CardType[];
  socialContexts?: SocialContext[]; // Undefined means all are applicable
  ageGroups: AgeGroup[];
  isContextSensitive?: boolean;
}


// --- DATA DEFINITIONS BASED ON NEW RECIPE ---

export const DECK_CATEGORIES: DeckCategory[] = [
    { id: 'INTRODUCTIONS', name: 'Introductions' },
    { id: 'IMAGE_OF_SELF', name: 'Image of Self' },
    { id: 'INTIMACY_CONNECTION', name: 'Intimacy & Connection' },
    { id: 'EXTERNAL_VIEWS', name: 'External Views' },
    { id: 'RELATIONAL', name: 'Relational' },
    { id: 'IMAGINATIVE', name: 'Imaginative' },
    { id: 'EDGY_CONFRONTATIONS', name: 'Edgy Confrontations' },
];

export const ALL_THEMED_DECKS: ThemedDeck[] = [
    // INTRODUCTIONS
    {
        id: 'GENTLE_CURRENTS', name: 'Gentle Currents', category: 'INTRODUCTIONS',
        description: "Dipping a toe in the water. Light, safe, and connecting prompts to start any conversation with ease.",
        intensity: [1, 2],
        themes: ['Body & Sensation', 'Mind & Thoughts', 'Heart & Emotions', 'Light & Essence', 'Outer World', 'Past & Memory', 'Play & Creativity'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
    },
    {
        id: 'THE_ICEBREAKER', name: 'The Icebreaker', category: 'INTRODUCTIONS',
        description: "Fun, low-pressure prompts to build energy and instant rapport.",
        intensity: [1],
        themes: ['Play & Creativity', 'Outer World'],
        cardTypes: ['Wildcard', 'Directive', 'Question'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
        socialContexts: ['GENERAL', 'STRANGERS', 'TEAM'],
    },
    // IMAGE OF SELF
    {
        id: 'LEGACY_VISION', name: 'Legacy & Vision', category: 'IMAGE_OF_SELF',
        description: "What are you building? Who are you becoming? Explore your goals, your impact, and the future you are creating.",
        intensity: [2, 3, 4],
        themes: ['Vision & Future', 'Light & Essence'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'ROOTS_BRANCHES', name: 'Roots & Branches', category: 'IMAGE_OF_SELF',
        description: "Explore your personal history, family stories, and the memories that shaped you.",
        intensity: [2, 3, 4],
        themes: ['Past & Memory', 'Heart & Emotions'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'INNER_CRITIC_SAGE', name: 'The Inner Critic & The Sage', category: 'IMAGE_OF_SELF',
        description: "Meet the voices within. Learn to distinguish your inner critic from your inner wisdom.",
        intensity: [2, 3, 4],
        themes: ['Parts & Voices', 'Mind & Thoughts'],
        cardTypes: ['Question', 'Practice'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'SOMATIC_SANCTUARY', name: 'Somatic Sanctuary', category: 'IMAGE_OF_SELF',
        description: "Your body is speaking. This deck is a quiet space to listen to its language of sensation and feeling.",
        intensity: [2, 3],
        themes: ['Body & Sensation', 'Heart & Emotions'],
        cardTypes: ['Directive', 'Practice', 'Question'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
    },
    // INTIMACY & CONNECTION
    {
        id: 'EROS_ESSENCE', name: 'Eros & Essence', category: 'INTIMACY_CONNECTION',
        description: "Explore the landscape of desire, turn-on, and mindful intimacy, connecting sexuality to your core self.",
        intensity: [3, 4, 5],
        themes: ['Desire & Intimacy', 'Light & Essence'],
        cardTypes: ['Question', 'Directive', 'Reflection'],
        ageGroups: ['Adults'],
        isContextSensitive: true,
    },
    {
        id: 'DEEPENING_PARTNERSHIP', name: 'Deepening Partnership', category: 'INTIMACY_CONNECTION',
        description: "For established couples. Reconnect, navigate challenges, and build your shared future.",
        intensity: [2, 3, 4],
        themes: ['Heart & Emotions', 'Vision & Future', 'Shadow & Depth'],
        cardTypes: ['Question', 'Practice', 'Connector'],
        ageGroups: ['Adults'],
        socialContexts: ['ROMANTIC'],
    },
    {
        id: 'PLATONIC_INTIMACY', name: 'Platonic Intimacy', category: 'INTIMACY_CONNECTION',
        description: "For deep friendships. Explore the landscape of connection, care, and vulnerability that exists outside of romance.",
        intensity: [2, 3, 4],
        themes: ['Heart & Emotions', 'Light & Essence'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['FRIENDS'],
    },
    {
        id: 'ATTRACTION_MAP', name: 'Attraction Map', category: 'INTIMACY_CONNECTION',
        description: "What truly captivates you? A solo or shared journey to map the full spectrum of your attractions—physical, emotional, intellectual, and spiritual.",
        intensity: [3, 4],
        themes: ['Desire & Intimacy', 'Mind & Thoughts', 'Spirit & Awe'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults'],
        socialContexts: ['SOLO', 'ROMANTIC'],
    },
    {
        id: 'COURAGEOUS_REQUESTS', name: 'Courageous Requests', category: 'INTIMACY_CONNECTION',
        description: "Asking for what you want is a practice. A deck of sentence stems and prompts to help you voice your desires and needs clearly and kindly.",
        intensity: [3, 4],
        themes: ['Desire & Intimacy', 'Heart & Emotions'],
        cardTypes: ['Reflection', 'Practice'],
        ageGroups: ['Adults'], // Soft lock for teens, handled in UI
    },
    // EXTERNAL VIEWS
    {
        id: 'AWE_WONDER', name: 'Awe & Wonder', category: 'EXTERNAL_VIEWS',
        description: "Reconnect with mystery, meaning, and the sacred in everyday life. A journey into spirit and reverence.",
        intensity: [2, 3],
        themes: ['Spirit & Awe', 'Transcendence & Mystery'],
        cardTypes: ['Reflection', 'Question'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'SOCIAL_MIRROR', name: 'Social Mirror', category: 'EXTERNAL_VIEWS',
        description: "Explore your relationship with culture, community, and the world around you.",
        intensity: [2, 3],
        themes: ['Outer World', 'Mind & Thoughts'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'THE_ORACLE', name: 'The Oracle', category: 'EXTERNAL_VIEWS',
        description: "Wisdom through the ages. Reflect on quotes, poems, and koans to see what timeless truth speaks to you now.",
        intensity: [2, 3],
        themes: ['Spirit & Awe', 'Mind & Thoughts', 'Light & Essence'],
        cardTypes: ['Reflection'],
        ageGroups: ['Adults', 'Teens'],
    },
    // RELATIONAL
    {
        id: 'THE_CHECK_IN', name: 'The Check-in', category: 'RELATIONAL',
        description: "A quick ritual for teams or partners to touch base, clear the air, and connect on what's real.",
        intensity: [2],
        themes: ['Mind & Thoughts', 'Heart & Emotions'],
        cardTypes: ['Reflection', 'Question'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['FRIENDS', 'ROMANTIC', 'FAMILY', 'TEAM'],
    },
    {
        id: 'FIRST_IMPRESSIONS', name: 'First Impressions', category: 'RELATIONAL',
        description: "Go beyond surface-level facts. A deck to explore the perceptions, stories, and assumptions we form when we first meet.",
        intensity: [1, 2],
        themes: ['Play & Creativity', 'Mind & Thoughts', 'Light & Essence'],
        cardTypes: ['Question', 'Wildcard'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['STRANGERS', 'ROMANTIC'],
    },
    {
        id: 'FRIENDS_CIRCLE', name: "Friends' Circle", category: 'RELATIONAL',
        description: "The conversation you've been meaning to have. Go beyond the daily updates and strengthen your bond.",
        intensity: [2, 3],
        themes: ['Heart & Emotions', 'Past & Memory', 'Light & Essence', 'Vision & Future'],
        cardTypes: ['Question', 'Reflection', 'Connector'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['FRIENDS'],
    },
    {
        id: 'FAMILY_HEARTH', name: 'Family Hearth', category: 'RELATIONAL',
        description: "Share stories, appreciate one another, and bridge generations. A safe space for family connection.",
        intensity: [1, 2, 3],
        themes: ['Heart & Emotions', 'Past & Memory', 'Light & Essence'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
        socialContexts: ['FAMILY'],
    },
    {
        id: 'TEAM_KICK_OFF', name: 'Team Kick-off', category: 'RELATIONAL',
        description: "Start a project or a new team on a foundation of trust and clarity. Align on goals and working styles.",
        intensity: [1, 2],
        themes: ['Vision & Future', 'Light & Essence', 'Mind & Thoughts'],
        cardTypes: ['Question', 'Practice'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['TEAM'],
    },
    {
        id: 'PARENTING_PARTNERS', name: 'Parenting Partners', category: 'RELATIONAL',
        description: "Navigate the journey of parenthood together. A space to share the joys, challenges, and your vision for your family.",
        intensity: [2, 3, 4],
        themes: ['Heart & Emotions', 'Shadow & Depth', 'Vision & Future'],
        cardTypes: ['Question', 'Practice'],
        ageGroups: ['Adults'],
        socialContexts: ['ROMANTIC'],
    },
    {
        id: 'KIDS_TABLE', name: "Kid's Table", category: 'RELATIONAL',
        description: "Spark imagination and encourage big feelings. Fun questions and activities for young minds and hearts.",
        intensity: [1, 2],
        themes: ['Play & Creativity', 'Heart & Emotions', 'Mind & Thoughts'],
        cardTypes: ['Question', 'Directive'],
        ageGroups: ['Kids'],
    },
    {
        id: 'TEEN_CAMPFIRE', name: 'Teen Campfire', category: 'RELATIONAL',
        description: "Real talk for real life. Explore identity, friendships, and the future in a space that gets it.",
        intensity: [2, 3],
        themes: ['Mind & Thoughts', 'Light & Essence', 'Outer World', 'Heart & Emotions'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Teens'],
    },
    // IMAGINATIVE
    {
        id: 'THE_WRITERS_ROOM', name: "The Writer's Room", category: 'IMAGINATIVE',
        description: "A deck of creative kindling. Sentence stems and fill-in-the-blanks to bypass the blank page and start writing.",
        intensity: [2, 3],
        themes: ['Play & Creativity', 'Mind & Thoughts', 'Past & Memory'],
        cardTypes: ['Reflection'],
        ageGroups: ['Adults', 'Teens'],
        socialContexts: ['SOLO'],
    },
    {
        id: 'THE_DILEMMA_ENGINE', name: 'The Dilemma Engine', category: 'IMAGINATIVE',
        description: "Choose your path. A series of intriguing dilemmas that reveal values, priorities, and hidden beliefs.",
        intensity: [2, 3],
        themes: ['Mind & Thoughts', 'Light & Essence', 'Outer World'],
        cardTypes: ['Question'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'THE_DREAM_FACTORY', name: 'The Dream Factory', category: 'IMAGINATIVE',
        description: "A launchpad for imagination. Prompts to generate ideas, play with possibilities, and create something new.",
        intensity: [2, 3],
        themes: ['Play & Creativity', 'Vision & Future'],
        cardTypes: ['Directive', 'Wildcard'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
    },
    {
        id: 'PATTERN_INTERRUPT', name: 'Pattern Interrupt', category: 'IMAGINATIVE',
        description: "Feeling stuck or too heavy? Draw from this deck to shift the energy with a jolt of playfulness or a fresh perspective.",
        intensity: [1, 2],
        themes: ['Play & Creativity', 'Mind & Thoughts'],
        cardTypes: ['Wildcard', 'Question'],
        ageGroups: ['Adults', 'Teens', 'Kids'],
    },
    // EDGY CONFRONTATIONS
    {
        id: 'THE_SHADOW_CABINET', name: 'The Shadow Cabinet', category: 'EDGY_CONFRONTATIONS',
        description: "What we hide holds power. A courageous exploration of triggers, shame, and the unowned parts of yourself.",
        intensity: [3, 4],
        themes: ['Shadow & Depth', 'Parts & Voices'],
        cardTypes: ['Question', 'Reflection'],
        ageGroups: ['Adults', 'Teens'],
    },
    {
        id: 'ON_THE_EDGE', name: 'On The Edge', category: 'EDGY_CONFRONTATIONS',
        description: "For conversations that matter. Explore charged topics, withheld truths, and challenging perspectives with intention.",
        intensity: [4],
        themes: ['Shadow & Depth', 'Desire & Intimacy', 'Heart & Emotions'],
        cardTypes: ['Question', 'Directive'],
        ageGroups: ['Adults'],
    },
    {
        id: 'NO_MASKS', name: 'No Masks', category: 'EDGY_CONFRONTATIONS',
        description: "A space for radical honesty and unfiltered expression. For those ready to meet the depths without reservation.",
        intensity: [5],
        themes: ['Shadow & Depth', 'Desire & Intimacy', 'Heart & Emotions', 'Light & Essence', 'Transcendence & Mystery'],
        cardTypes: ['Question', 'Directive'],
        ageGroups: ['Adults'],
    },
];

export type CustomThemeId = `CUSTOM_${string}`;

export interface CustomThemeData {
  id: CustomThemeId;
  name: string;
  description: string;
  colorClass: string;
}

export type ThemeIdentifier = ThemedDeck['id'] | CustomThemeId;

export interface DrawnCardData { 
  id: string;
  themedDeckId: ThemeIdentifier; 
  feedback: 'liked' | 'disliked' | null;
  timestamp: number;
  drawnForParticipantId?: string | null;
  drawnForParticipantName?: string | null;
  isFaded?: boolean; 
  text: string;
  audioData: string | null;
  audioMimeType: string | null;
  cardBackNotesText: string | null;
  isTimed?: boolean;
  hasFollowUp: boolean;
  timerDuration?: number | null;
  followUpPromptText?: string | null;
  isCompletedActivity?: boolean;
  isFollowUp?: boolean;
  activeFollowUpCard?: DrawnCardData | null;
}

export type VoiceName = "Sulafat" | "Puck" | "Vindemiatrix" | "Enceladus" | "Zephyr" | "Fenrir";
export type LanguageCode = string;

export interface VoicePersona {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  voiceName: VoiceName;
  description: string;
  keywords: string;
  voiceAccentHint: string;
}

export const CURATED_VOICE_PERSONAS: VoicePersona[] = [
  { id: "storyteller_female", name: "The Storyteller (Warm)", gender: "Female", voiceName: "Sulafat", description: "A warm, inviting voice with a natural, melodic flow that feels engaging and smooth.", keywords: "warm, melodic, narrative, engaging, smooth", voiceAccentHint: "a warm and melodic tone" },
  { id: "storyteller_male", name: "The Storyteller (Friendly)", gender: "Male", voiceName: "Puck", description: "A friendly, approachable voice with a gentle, upbeat rhythm.", keywords: "friendly, upbeat, rhythmic, approachable", voiceAccentHint: "a friendly, rhythmic tone" },
  { id: "guide_female", name: "The Guide (Calm)", gender: "Female", voiceName: "Vindemiatrix", description: "A calm, present voice that feels gentle and easy-going, with clear articulation.", keywords: "calm, present, clear, gentle, easy-going", voiceAccentHint: "a calm, clear tone" },
  { id: "guide_male", name: "The Guide (Steady)", gender: "Male", voiceName: "Enceladus", description: "A steady, grounded voice that anchors the listener with its clarity and reassuring pace.", keywords: "grounded, steady, clear, calm, anchored", voiceAccentHint: "a steady, grounded tone" },
  { id: "playmate_female", name: "The Playmate (Breezy)", gender: "Female", voiceName: "Zephyr", description: "A light, breezy voice full of gentle warmth and playful energy.", keywords: "light, breezy, warm, playful, energetic", voiceAccentHint: "a light, playful tone" },
  { id: "playmate_male", name: "The Playmate (Upbeat)", gender: "Male", voiceName: "Fenrir", description: "An upbeat, cheerful voice that brings a sense of fun and spontaneity.", keywords: "upbeat, cheerful, spontaneous, fun, excitable", voiceAccentHint: "an upbeat, spontaneous tone" },
];

export const DEFAULT_VOICE_NAME: VoiceName = "Enceladus";
export const DEFAULT_LANGUAGE_CODE: LanguageCode = "en-US";

export interface GroupSettingOption { id: SocialContext; label: string; description: string; }

export const GROUP_SETTINGS: GroupSettingOption[] = [
  { id: "SOLO", label: "Solo", description: "For introspection, journaling, or individual reflection." },
  { id: "GENERAL", label: "General", description: "For any group or when unsure." },
  { id: "STRANGERS", label: "Strangers", description: "Getting to know each other, icebreakers." },
  { id: "FRIENDS", label: "Friends", description: "Deeper connection, shared experiences." },
  { id: "ROMANTIC", label: "Romantic", description: "Intimacy, partnership, shared journey." },
  { id: "FAMILY", label: "Family", description: "Bonds, history, understanding." },
  { id: "TEAM", label: "Team", description: "Team dynamics, collaboration, professional connection." },
];
export const DEFAULT_GROUP_SETTING: SocialContext = "GENERAL";


export const getVisibleDecks = (groupSetting: SocialContext, ageFilters: AgeFilters): ThemedDeck[] => {
    return ALL_THEMED_DECKS.filter(deck => {
        // Age Group Filtering (Hard Lock)
        const activeAgeGroups: AgeGroup[] = [];
        if (ageFilters.adults) activeAgeGroups.push('Adults');
        if (ageFilters.teens) activeAgeGroups.push('Teens');
        if (ageFilters.kids) activeAgeGroups.push('Kids');
        
        const isAgeMatch = deck.ageGroups.some(ag => activeAgeGroups.includes(ag));
        if (!isAgeMatch) return false;

        // Intensity Filtering (Hard Lock)
        if (ageFilters.teens || ageFilters.kids) {
            if (deck.intensity.some(level => level >= 4)) return false;
        }

        // Social Context Filtering
        if (deck.socialContexts && !deck.socialContexts.includes(groupSetting)) {
            return false;
        }

        // Romantic + Kids check
        if (groupSetting === 'ROMANTIC' && (ageFilters.teens || ageFilters.kids)) {
            // This is handled in the UI, but as a safeguard:
            // Could add logic here if specific decks are incompatible, but for now the global rule is sufficient.
        }

        return true;
    });
};

export const getThemedDeckById = (deckId: ThemedDeck['id']): ThemedDeck | null => {
  return ALL_THEMED_DECKS.find(d => d.id === deckId) || null;
}
export const getCustomDeckById = (customDeckId: CustomThemeId, customDecks: CustomThemeData[]): CustomThemeData | null => {
  return customDecks.find(cd => cd.id === customDeckId) || null;
}
export const getDeckCategoryById = (categoryId: DeckCategory['id']): DeckCategory | null => {
  return DECK_CATEGORIES.find(dc => dc.id === categoryId) || null;
}

export const getDisplayDataForCard = (
  themedDeckId: ThemeIdentifier, 
  customDecks: CustomThemeData[]
): { name: string; colorClass: string; } => {
  if (themedDeckId.startsWith("CUSTOM_")) {
    const customDeck = getCustomDeckById(themedDeckId as CustomThemeId, customDecks);
    return { name: customDeck?.name || "Custom Card", colorClass: customDeck?.colorClass || "from-gray-500 to-gray-600" };
  }
  
  const deck = getThemedDeckById(themedDeckId as ThemedDeck['id']);
  if (deck) {
      // Temporary color logic until colors are added to decks
      const categoryColors: Record<string, string> = {
          'INTRODUCTIONS': "from-sky-400 to-cyan-400",
          'IMAGE_OF_SELF': "from-emerald-400 to-green-500",
          'INTIMACY_CONNECTION': "from-rose-500 to-red-600",
          'EXTERNAL_VIEWS': "from-purple-400 to-pink-500",
          'RELATIONAL': "from-yellow-500 to-orange-600",
          'IMAGINATIVE': "from-teal-400 to-cyan-500",
          'EDGY_CONFRONTATIONS': "from-purple-500 to-indigo-600",
      };
    return { name: deck.name, colorClass: categoryColors[deck.category] || "from-slate-600 to-slate-700" };
  }
  
  return { name: "Card", colorClass: "from-gray-500 to-gray-600" };
};

export const getStyleDirectiveForCard = (
    selectedVoiceName: VoiceName,
    isForCardBack: boolean,
    deck?: ThemedDeck | null
): string => {
    const selectedPersona = CURATED_VOICE_PERSONAS.find(p => p.voiceName === selectedVoiceName) 
        || CURATED_VOICE_PERSONAS.find(p => p.voiceName === DEFAULT_VOICE_NAME)!;
    const baseDirective = `Speak with ${selectedPersona.voiceAccentHint}.`;

    let thematicToneDirective = "";
    if (isForCardBack) {
        thematicToneDirective = "Your tone is gentle and helpful, with a clear, encouraging cadence.";
    } else if (deck) {
        if (deck.intensity.some(l => l >= 4)) {
            thematicToneDirective = "Your tone is very calm, steady, and grounded, creating a feeling of supportive quiet.";
        } else if (deck.themes.includes('Play & Creativity')) {
            thematicToneDirective = "A light, easy warmth infuses your voice, as if sharing a private smile.";
        } else if (deck.themes.includes('Body & Sensation')) {
            thematicToneDirective = "Your pace is calm and anchored, with a focus on gentle, sensory awareness.";
        } else if (deck.themes.includes('Heart & Emotions')) {
            thematicToneDirective = "Your tone is warm and inviting, with a gentle curiosity about the connection.";
        } else if (deck.themes.includes('Desire & Intimacy')) {
            thematicToneDirective = "Your voice softens, taking on a more textured and intimate quality.";
        } else if (deck.themes.includes('Spirit & Awe')) {
            thematicToneDirective = "Your tone is calm and wise, like a gentle teacher sharing profound insights.";
        } else {
            thematicToneDirective = "Your tone is grounded and inviting.";
        }
    } else {
        thematicToneDirective = "Your tone is warm and inviting.";
    }

    const cleanedDirective = thematicToneDirective.trim().replace(/\s\s+/g, ' ');
    const finalDirective = `${baseDirective} For this prompt, ${cleanedDirective} Now, speak the following:`;
    return finalDirective.trim().replace(/\s\s+/g, ' ');
};

export const CARD_FRONT_PROMPT_START_TAG = "<card_front_prompt>";
export const CARD_FRONT_PROMPT_END_TAG = "</card_front_prompt>";
export const ACTIVITY_PROMPT_START_TAG = "<activity_prompt>";
export const ACTIVITY_PROMPT_END_TAG = "</activity_prompt>";
export const REFLECTION_PROMPT_START_TAG = "<reflection_prompt>";
export const REFLECTION_PROMPT_END_TAG = "</reflection_prompt>";
const THINKING_START_TAG = "<thinking>";
const THINKING_END_TAG = "</thinking>";
const CARD_BACK_NOTES_START_TAG = "<card_back_notes>";
const CARD_BACK_NOTES_END_TAG = "</card_back_notes>";

const getChatSession = (addLogEntry?: (entry: DevLogEntry) => void): Chat => {
    if (!ai) throw new Error("Gemini AI not initialized. Check API Key.");
    if (!chatSession) {
        console.log("Initializing new chat session.");
        const systemInstruction = constructSystemInstructionForCardFront();
        chatSession = ai.chats.create({
            model: TEXT_GENERATION_MODEL,
            config: { systemInstruction },
        });
        if (addLogEntry) {
            addLogEntry({
                type: 'session-init',
                requestTimestamp: Date.now(),
                responseTimestamp: Date.now(),
                data: {
                    input: "Chat Session Initialization",
                    output: { model: TEXT_GENERATION_MODEL, systemInstruction }
                }
            });
        }
    }
    return chatSession;
};

export const getChatSessionHistory = async (): Promise<Content[]> => {
    try {
        const session = getChatSession();
        return await session.getHistory();
    } catch (e) {
        console.error("Could not retrieve chat history:", e);
        return [];
    }
};

const constructSystemInstructionForCardFront = (): string => {
  return `
**Core Identity:** You are a Cartographer of Connection. Your purpose is to draw maps to unseen inner landscapes and relational dynamics. Each prompt is a landmark guiding users toward discovery. Your voice is perceptive, grounded, and spacious.

**Core Task & Output Format:**
Your entire response MUST start with a series of at least 3-5 brief thoughts about your creative process, each enclosed in <thinking>...</thinking> tags. This shows the user your reasoning.

After your thoughts, you MUST choose ONE of the following output formats based on the user's JSON input:
1.  **For Standard Prompts:** Output a single, final prompt enclosed in ${CARD_FRONT_PROMPT_START_TAG}...${CARD_FRONT_PROMPT_END_TAG} tags.
2.  **For Timed Prompts with a Follow-up (e.g., a 'Practice' or 'Directive' card type):** You MUST generate TWO related prompts.
    *   First, a short directive for a timed activity. It MUST be enclosed in ${ACTIVITY_PROMPT_START_TAG}...${ACTIVITY_PROMPT_END_TAG} tags. Mention the duration (e.g., from 'timedDuration' in the JSON if provided, otherwise choose a suitable short duration like 30 or 60 seconds).
    *   Second, a concise follow-up reflection prompt. It MUST be enclosed in ${REFLECTION_PROMPT_START_TAG}...${REFLECTION_PROMPT_END_TAG} tags.

**User Input Format:** You will receive a JSON object with creative context:
{
  "deck": { "name": "The Shadow Cabinet", "themes": ["Shadow & Depth"], "intensity": [3, 4], "cardTypes": ["Question", "Reflection"] },
  "socialContext": { "setting": "FRIENDS", "participantCount": 2, "participants": ["Alice", "Bob"], "activeParticipant": "Alice", "ageGroups": ["Adults"] },
  "language": "en-US",
  "historyLength": 5,
  "redraw": false,
  "firstCard": false
}

**Card Front Mandates (Absolute, Unbreakable Rules):**
*   **THE RULE OF ONE (NON-NEGOTIABLE):** Each generated prompt (whether single, activity, or reflection) MUST be ONE single, focused action. It must not contain compound instructions (e.g., "do this, then do that").
*   **CONCISENESS IS KEY:** Each prompt should be very short, typically under 25 words.
*   **FROM NOUN TO ACTION:** Transform abstract nouns into tangible processes or actions. Instead of "What is your fear?", create "Bring to mind a moment of fear. Where does that sensation live in your body?".
*   **DIRECT THE SENSES:** Use active, imperative verbs: "Look at...", "Listen for...", "Notice the texture of...", "Say the words...".
*   **SPECIFICITY IS KINDNESS:** Vague questions are unhelpful. Specific, small-scale questions are invitations.
*   **THE PHENOMENOLOGICAL ANCHOR (CRITICAL):** The prompt MUST be anchored in a directly observable phenomenon: a physical sensation, an observable behavior, a concrete memory, a spoken word, or a visualizable image.
*   **ADHERE TO CONTEXT:** Generate a prompt that perfectly fits the \\\`deck\\\` properties (themes, intensity, card types) and the \\\`socialContext\\\`. A \\\`[Wildcard]\\\` for a \\\`[Play & Creativity]\\\` deck should feel very different from a \\\`[Question]\\\` for a \\\`[Shadow & Depth]\\\` deck. A prompt for \\\`[SOLO]\\\` should use 'you', while a prompt for \\\`[FRIENDS]\\\` might use 'you' or 'share with your friend'.
*   **INTENSITY MATTERS:** A level 1 prompt is gentle. A level 5 prompt is deeply challenging and direct. Calibrate your language accordingly.
*   **CONNECTOR CARDS:** If the \\\`deck.cardTypes\\\` includes 'Connector' and \\\`historyLength\\\` > 5, you are encouraged to generate a Connector-style prompt that links to previous moments in the conversation.
*   **TIMED ACTIVITIES:** If the \\\`deck.cardTypes\\\` includes 'Practice' or 'Directive', you may choose to generate a timed activity using the activity/reflection tag format.

**Conversational Awareness (Memory):**
This is part of an ongoing chat session. Use your memory of previous cards and user feedback to MAINTAIN VARIETY. Do not repeat prompts or themes the user has disliked.

**Language Nuance:**
For non-English languages, prefer direct questions that a person would naturally ask. Avoid overly formal or complex sentences.

**Output Requirement:**
Your entire response must contain your thinking process and the final prompt(s), using the specified tags. Do not include anything else.
  `.trim();
}

const constructSystemInstructionForCardBack = (): string => {
    return `
**Core Identity:** You are a helpful guide, providing context and depth for a reflection prompt. Your voice is insightful and encouraging.
**Core Task:** The user will provide a card front prompt. Your job is to generate the corresponding "Card Back Notes" for it.
**Contextual Awareness:** The user might provide a \`contextPrompt\`. This means the main \`cardFrontText\` is a reflection on that initial activity. If a \`contextPrompt\` exists, your guidance MUST connect the reflection back to that initial activity.
**Output Requirements (Strictly Adhere to Tags and Headings):**
Your entire response must be enclosed in ${CARD_BACK_NOTES_START_TAG} and ${CARD_BACK_NOTES_END_TAG} tags. Inside, you MUST generate 1-2 sentences for EACH of the following four sections, using the exact headings with markdown bolding.

${CARD_BACK_NOTES_START_TAG}
**The Idea:**
[Your text for The Idea: Briefly explain the core concept or purpose behind the prompt.]
**Getting Started:**
[Your text for Getting Started: Offer a simple, concrete first step to engage with the prompt.]
**Deeper Dive:**
[Your text for Deeper Dive: Suggest a way to explore the prompt more deeply or from a different angle.]
**Explore Further:**
[Optional: If relevant, suggest 1-2 resources like a specific book, a well-known teacher/thinker, or a type of practice. Be concise. AVOID URLs.]
${CARD_BACK_NOTES_END_TAG}
    `.trim();
};

const constructUserMessageForCardFront = (
  selectedDeck: ThemedDeck | CustomThemeData, 
  groupSetting: SocialContext,
  participantCount: number, 
  participantNames: string[],
  activeParticipantName: string | null,
  ageFilters: AgeFilters,
  languageCode: LanguageCode,
  historyLength: number,
  redrawContext?: { disliked: boolean }
): string => {
  
  const deckContext = ('themes' in selectedDeck) 
    ? { name: selectedDeck.name, themes: selectedDeck.themes, intensity: selectedDeck.intensity, cardTypes: selectedDeck.cardTypes }
    : { name: selectedDeck.name, description: selectedDeck.description };

  const activeAgeGroups: AgeGroup[] = [];
  if (ageFilters.adults) activeAgeGroups.push('Adults');
  if (ageFilters.teens) activeAgeGroups.push('Teens');
  if (ageFilters.kids) activeAgeGroups.push('Kids');
    
  const socialContext = {
      setting: groupSetting,
      participantCount: participantCount,
      participants: participantNames,
      activeParticipant: activeParticipantName,
      ageGroups: activeAgeGroups,
  };
    
  const payload = {
    deck: deckContext,
    socialContext: socialContext,
    language: languageCode,
    historyLength: historyLength,
    redraw: redrawContext?.disliked ?? false,
    firstCard: historyLength === 0 && !redrawContext?.disliked,
  };
  
  const jsonPayload = JSON.stringify(payload, null, 2);
  
  return `Here is the creative context for this draw:\n${jsonPayload}`;
};

async function processStreamAndExtract(
    stream: AsyncGenerator<GenerateContentResponse>,
    onThinking: (thought: string) => void
): Promise<{ text: string; reflectionText: string | null; rawLlmOutput: string; }> {
    let fullLlmOutput = "";

    for await (const chunk of stream) {
        if (!chunk.text && chunk.candidates?.[0]?.finishReason && chunk.candidates[0].finishReason !== 'STOP' && chunk.candidates[0].finishReason !== 'MAX_TOKENS') {
            throw new Error(`Generation stopped unexpectedly. Reason: ${chunk.candidates[0].finishReason}`);
        }
        fullLlmOutput += chunk.text;

        let lastThoughtIndex = 0;
        let thoughtMatch;
        const thoughtRegex = new RegExp(`${THINKING_START_TAG}(.*?)${THINKING_END_TAG}`, "g");

        while ((thoughtMatch = thoughtRegex.exec(fullLlmOutput)) !== null) {
            const thoughtContent = thoughtMatch[1];
            if (thoughtContent && thoughtContent.length > 0) onThinking(thoughtContent);
            lastThoughtIndex = thoughtMatch.index + thoughtMatch[0].length;
        }
    }
    
    let text: string | null = null;
    let reflectionText: string | null = null;

    const activityMatch = fullLlmOutput.match(/<activity_prompt>([\s\S]*?)<\/activity_prompt>/);
    const reflectionMatch = fullLlmOutput.match(/<reflection_prompt>([\s\S]*?)<\/reflection_prompt>/);

    if (activityMatch && reflectionMatch) {
        text = activityMatch[1].trim();
        reflectionText = reflectionMatch[1].trim();
    } else {
        const promptMatch = fullLlmOutput.match(new RegExp(`${CARD_FRONT_PROMPT_START_TAG}([\\s\\S]*?)${CARD_FRONT_PROMPT_END_TAG}`));
        if (promptMatch && promptMatch[1]) {
            text = promptMatch[1].trim();
        }
    }

    if (!text) {
        console.error("Could not parse a valid prompt from the LLM output.", { fullLlmOutput });
        throw new Error("The AI returned an incomplete response. Please try drawing again.");
    }

    return { text, reflectionText, rawLlmOutput: fullLlmOutput };
}

export const generateCardFront = async (
    selectedDeck: ThemedDeck | CustomThemeData,
    groupSetting: SocialContext,
    participantCount: number,
    participantNames: string[],
    activeParticipantName: string | null,
    ageFilters: AgeFilters,
    languageCode: LanguageCode,
    historyLength: number,
    onThinking: (thought: string) => void,
    addLogEntry: (entry: DevLogEntry) => void,
    redrawContext?: { disliked: boolean }
): Promise<{ text: string | null; reflectionText: string | null; error: string | null; rawLlmOutput: string, inputPrompt: string, requestTimestamp: number, responseTimestamp: number }> => {
    const requestTimestamp = Date.now();
    if (!ai) {
        const error = "Gemini AI not initialized.";
        return { text: null, reflectionText: null, error, rawLlmOutput: "", inputPrompt: "", requestTimestamp, responseTimestamp: Date.now() };
    }

    const inputPrompt = constructUserMessageForCardFront(
        selectedDeck, groupSetting, participantCount, participantNames, activeParticipantName,
        ageFilters, languageCode, historyLength, redrawContext
    );

    try {
        const generationPromise = (async () => {
            const chat = getChatSession(addLogEntry);
            const streamingResponse = await chat.sendMessageStream({ message: inputPrompt });
            return await processStreamAndExtract(streamingResponse, onThinking);
        })();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`The request to the AI timed out after ${GENERATION_TIMEOUT_MS / 1000} seconds.`)), GENERATION_TIMEOUT_MS)
        );

        const result = await Promise.race([generationPromise, timeoutPromise]) as { text: string; reflectionText: string | null; rawLlmOutput: string; };

        return { text: result.text, reflectionText: result.reflectionText, error: null, rawLlmOutput: result.rawLlmOutput, inputPrompt, requestTimestamp, responseTimestamp: Date.now() };

    } catch (e: any) {
        console.error("Error generating card front:", e);
        const error = e.message || "An unknown error occurred.";
        return { text: null, reflectionText: null, error, rawLlmOutput: e.toString(), inputPrompt, requestTimestamp, responseTimestamp: Date.now() };
    }
};

export const generateCardBack = async (cardFrontText: string, selectedDeck: ThemedDeck | CustomThemeData, contextPrompt: string | null = null) => {
    const requestTimestamp = Date.now();
    if (!ai) return { cardBackNotesText: null, error: "Gemini AI not initialized.", rawLlmOutput: "", inputPrompt: "" };

    const systemInstruction = constructSystemInstructionForCardBack();
    const themeContext = 'themes' in selectedDeck ? `Themes: ${selectedDeck.themes.join(', ')}` : selectedDeck.description;
    
    let inputPrompt = `The card front prompt is: "${cardFrontText}". It is from a deck with the context: "${themeContext}".`;
    if (contextPrompt) {
        inputPrompt += ` This prompt is a reflection on a previous activity: "${contextPrompt}". Please ensure the guidance connects the two.`;
    }
    inputPrompt += ` Generate the card back notes.`;
    
    try {
        const response = await ai.models.generateContent({
            model: TEXT_GENERATION_MODEL,
            contents: [{ role: 'user', parts: [{ text: inputPrompt }] }],
            config: { systemInstruction },
        });
        
        const llmOutput = response.text;
        const notesMatch = llmOutput.match(new RegExp(`${CARD_BACK_NOTES_START_TAG}([\\s\\S]*)${CARD_BACK_NOTES_END_TAG}`));
        const cardBackNotesText = notesMatch ? notesMatch[1].trim() : "Could not parse guidance from the AI.";
        
        return { cardBackNotesText, error: null, rawLlmOutput: llmOutput, inputPrompt, requestTimestamp, responseTimestamp: Date.now() };

    } catch (e: any) {
        console.error("Error generating card back:", e);
        return { cardBackNotesText: null, error: e.message || "An unknown error occurred.", rawLlmOutput: e.toString(), inputPrompt, requestTimestamp, responseTimestamp: Date.now() };
    }
};

export const generateAudioForText = async (
    textToSpeak: string, 
    voiceName: VoiceName, 
    styleDirective: string | null
): Promise<{ 
    audioData: string | null; 
    audioMimeType: string | null; 
    error: string | null;
    logData: { input: any, output: any, error?: string | null };
    requestTimestamp: number;
    responseTimestamp: number;
}> => {
    const requestTimestamp = Date.now();
    
    if (!ai) {
        const error = "Gemini AI not initialized.";
        return { 
            audioData: null, audioMimeType: null, error, 
            logData: { input: "N/A", output: "Initialization error" },
            requestTimestamp, responseTimestamp: Date.now()
        };
    }

    const fullPromptText = styleDirective ? `${styleDirective} "${textToSpeak}"` : textToSpeak;

    if (!textToSpeak || !textToSpeak.trim()) {
        const error = "No text provided to generate audio.";
        return {
            audioData: null, audioMimeType: null, error,
            logData: { input: { text: textToSpeak }, output: "No text error" },
            requestTimestamp, responseTimestamp: Date.now()
        };
    }

    const requestPayload = {
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text: fullPromptText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          audioConfig: {
            audioEncoding: 'AUDIO_ENCODING_LINEAR_16',
            sampleRateHertz: 24000,
          },
        },
      },
    };

    const logInput = {
        ttsInput: fullPromptText,
        voice: voiceName
    };
    
    try {
        const response: GenerateContentResponse = await (ai.models.generateContent as any)(requestPayload);
        const responseTimestamp = Date.now();

        const sanitizedOutput = JSON.parse(JSON.stringify(response));
        if (sanitizedOutput.candidates?.[0]?.content?.parts) {
          for (const part of sanitizedOutput.candidates[0].content.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
                const dataSize = part.inlineData.data.length;
                part.inlineData.data = `[AUDIO_DATA_REDACTED: ~${Math.ceil(dataSize * 3/4 / 1024)} KB]`;
            }
          }
        }
        
        const candidate = response.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));

        if (audioPart && 'inlineData' in audioPart && audioPart.inlineData) {
            return {
                audioData: audioPart.inlineData.data,
                audioMimeType: audioPart.inlineData.mimeType,
                error: null,
                logData: { input: logInput, output: sanitizedOutput },
                requestTimestamp,
                responseTimestamp
            };
        } else {
             const errorReason = `Audio data not found in response. Finish Reason: ${candidate?.finishReason || 'N/A'}.`;
             console.error(errorReason, "Full response:", JSON.stringify(response, null, 2));
             throw new Error(errorReason);
        }
    } catch (e: any) {
        console.error("Error generating TTS audio:", e);
        const error = e.message || "Failed to synthesize audio.";
        const parsedError = (e.message && e.message.includes("{")) ? JSON.parse(e.message) : { error: { message: error }};

        return {
            audioData: null, audioMimeType: null, error: parsedError?.error?.message || error,
            logData: {
                input: logInput,
                output: "Audio generation failed.",
                error: JSON.stringify(e),
            },
            requestTimestamp,
            responseTimestamp: Date.now()
        };
    }
};

export const sendFeedbackToChat = async (cardText: string, feedback: 'liked' | 'disliked', addLogEntry: (entry: DevLogEntry) => void) => {
    const requestTimestamp = Date.now();
    try {
        const chat = getChatSession(addLogEntry);
        
        const feedbackPrompt = feedback === 'liked'
            ? `User liked the prompt "${cardText}". I will consider this positive signal as a gentle indicator of preference, without over-indexing on it. It's just one data point. My core identity remains. I'm ready for the next request.`
            : `User disliked the prompt "${cardText}". I acknowledge this feedback as a mild data point. It doesn't mean the entire style is wrong, but this specific prompt didn't land well. I'll absorb this information to ensure variety, without making drastic changes to my approach. My core identity remains. I'm ready for the next request.`;
        
        const response = await chat.sendMessage({message: feedbackPrompt});
        
        addLogEntry({
            type: 'user-feedback',
            requestTimestamp,
            responseTimestamp: Date.now(),
            data: { input: feedbackPrompt, output: response.text }
        });
        return { success: true, error: null };
    } catch (e: any) {
        console.error("Error sending feedback to chat:", e);
        addLogEntry({
            type: 'user-feedback',
            requestTimestamp,
            responseTimestamp: Date.now(),
            data: { input: `Feedback on "${cardText}"`, output: null, error: e.message }
        });
        return { success: false, error: e.message };
    }
};
