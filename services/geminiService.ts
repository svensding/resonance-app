

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { DrawnCardData as CardHistoryItem } from '../App'; 

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
}

const TEXT_GENERATION_MODEL = 'gemini-2.0-flash-lite'; 
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'; 

// --- New Deck Sets and Micro Decks Architecture ---

export interface DeckSet {
  id: string; // e.g., "KINDLING_CONNECTION"
  name: string; // User-facing name, e.g., "Kindling Connection"
  description: string; // User-facing description for the Set
  colorClass: string; // Tailwind color class for the Set button
}

export interface MicroDeck {
  id: string; // Unique ID, e.g., "SBP_01"
  internal_name: string; // Specific name, e.g., "Shared Breath & Presence"
  belongs_to_set: string | null; // ID of the DeckSet it belongs to, or null if special (e.g. culmination)
  description_for_info_button: string; // Detailed description (currently for future use if showing MicroDeck info)
  deck_inspiration_focus: string; // Guidance for LLM (style/methodology)
  llm_keywords: string; // Specific keywords for this micro-deck
  maturity_rating_hint: "General" | "Mature" | "Intimate/Explicit";
}

export type CustomThemeId = `CUSTOM_${string}`;
export type ThemeIdentifier = MicroDeck['id'] | CustomThemeId;

export interface CustomThemeData {
  id: CustomThemeId;
  name: string;
  description: string; 
  colorClass: string;
}

export const DECK_SETS: DeckSet[] = [
  {
    id: "KINDLING_CONNECTION",
    name: "Kindling Connection",
    description: "Gentle and playful ways to spark conversation, share light perspectives, and enjoy easygoing connection.",
    colorClass: "from-sky-400 to-cyan-400",
  },
  {
    id: "UNVEILING_DEPTHS",
    name: "Unveiling Depths",
    description: "Courageous explorations of inner landscapes, personal truths, emotional wounds, and shadow aspects. For deeper self-understanding.",
    colorClass: "from-emerald-400 to-green-500",
  },
  {
    id: "RELATIONAL_ALCHEMY",
    name: "Relational Alchemy",
    description: "Transform your connections. Explore interpersonal dynamics, communication patterns, shared visions, and the energy between you.",
    colorClass: "from-rose-500 to-red-600",
  },
  {
    id: "ADVENTUROUS_RESONANCE",
    name: "Adventurous Resonance",
    description: "For the bold. Explore desire, intimacy, edgy questions, and playful provocations in a space of mutual consent and curiosity. (Mature Themes)",
    colorClass: "from-purple-500 to-indigo-600",
  }
];

export const ALL_MICRO_DECKS: MicroDeck[] = [
  // Set 1: Kindling Connection
  {
    id: "SBP_01", internal_name: "Shared Breath & Presence", belongs_to_set: "KINDLING_CONNECTION",
    description_for_info_button: "Simple prompts to arrive in the present moment, together or individually, focusing on breath and immediate sensory awareness.",
    deck_inspiration_focus: "Mindfulness & Gentle Somatic Check-in",
    llm_keywords: "presence, grounding, arrival, breath awareness, sensory input (gentle), shared quiet, simple observation, calm, centering",
    maturity_rating_hint: "General"
  },
  {
    id: "CCS_01", internal_name: "Curiosity Cafe Spark", belongs_to_set: "KINDLING_CONNECTION",
    description_for_info_button: "Light, intriguing questions about the world, ideas, and 'what ifs' to spark easy conversation and share perspectives.",
    deck_inspiration_focus: "Engaging Podcast-Style Icebreakers & Light 'What If' Scenarios",
    llm_keywords: "ideas, light perspectives, observations, societal quirks, fun hypotheticals, daydreams, simple preferences, creativity lite",
    maturity_rating_hint: "General"
  },
  {
    id: "SS_01", internal_name: "Snapshot Stories", belongs_to_set: "KINDLING_CONNECTION",
    description_for_info_button: "Invitations to share brief, lighthearted, or interesting personal anecdotes and memories.",
    deck_inspiration_focus: "Light Personal Anecdote Sharing (Moth Radio Hour Intro Style)",
    llm_keywords: "quick memories, funny moments, small joys, everyday observations, light anecdotes, simple preferences, favorite things (simple)",
    maturity_rating_hint: "General"
  },
  {
    id: "PB_01", internal_name: "Playful Banter", belongs_to_set: "KINDLING_CONNECTION",
    description_for_info_button: "Prompts to ignite laughter, humor, and spontaneous playful interactions.",
    deck_inspiration_focus: "Lighthearted & Witty Conversational Games",
    llm_keywords: "humor, playfulness, lighthearted teasing (gentle), absurd questions, shared laughter, silly scenarios, spontaneity",
    maturity_rating_hint: "General"
  },
  // Set 2: Unveiling Depths
  {
    id: "HAV_01", internal_name: "Heart's Authentic Voice", belongs_to_set: "UNVEILING_DEPTHS",
    description_for_info_button: "Prompts for sharing core feelings, personal truths, values, and significant experiences with courage.",
    deck_inspiration_focus: "Authentic Relating Self-Expression & WANRS Level 2 Vulnerability",
    llm_keywords: "vulnerability, core feelings, personal truth, values, needs, 'I' statements, significant memories, life lessons, self-expression",
    maturity_rating_hint: "Mature"
  },
  {
    id: "SLI_01", internal_name: "Shadow & Light Integration", belongs_to_set: "UNVEILING_DEPTHS",
    description_for_info_button: "Explore unacknowledged 'shadow' aspects, projections, and difficult emotions to foster wholeness.",
    deck_inspiration_focus: "Depth Psychology Shadow Work & IFS-Inspired Reflection",
    llm_keywords: "shadow self, disowned parts, integration, wholeness, projections, triggers, inner critic, self-acceptance, difficult emotions, hidden strengths",
    maturity_rating_hint: "Mature"
  },
  {
    id: "ICW_01", internal_name: "Inner Child's Wisdom", belongs_to_set: "UNVEILING_DEPTHS",
    description_for_info_button: "Connect with and offer compassion to your inner child, acknowledging past hurts and unmet needs.",
    deck_inspiration_focus: "Trauma-Informed Self-Compassion & Inner Child Healing Prompts",
    llm_keywords: "inner child, past hurts, emotional wounds, self-compassion, healing, unmet needs, resilience, nurturing self, gentle reflection",
    maturity_rating_hint: "Mature"
  },
  {
    id: "MIP_01", internal_name: "Meeting Your Inner Parts", belongs_to_set: "UNVEILING_DEPTHS",
    description_for_info_button: "Give voice to different aspects of your personality – the Critic, Protector, Dreamer – and understand their roles.",
    deck_inspiration_focus: "Internal Family Systems (IFS) & Voice Dialogue Principles",
    llm_keywords: "inner critic, inner child, inner parent, inner mentor, archetypal parts, subpersonalities, internal dialogue, needs of parts, wisdom of parts",
    maturity_rating_hint: "Mature"
  },
  {
    id: "PTO_01", internal_name: "Path Through Obstacles", belongs_to_set: "UNVEILING_DEPTHS",
    description_for_info_button: "Reflect on struggles, fears, and self-limiting beliefs to find clarity, resilience, and new ways forward.",
    deck_inspiration_focus: "Coaching for Resilience & ACT-Informed Acceptance",
    llm_keywords: "struggles, fears, challenges, obstacles, self-limiting beliefs, problem-solving, resilience, perspective shift, acceptance, values-based action",
    maturity_rating_hint: "Mature"
  },
  // Set 3: Relational Alchemy
  {
    id: "SBG_01", internal_name: "The Space Between: Group Dynamics", belongs_to_set: "RELATIONAL_ALCHEMY",
    description_for_info_button: "For groups: Illuminate present-moment group dynamics, relational energy, and unspoken currents.",
    deck_inspiration_focus: "Circling Group Awareness & T-Group Process Observation",
    llm_keywords: "group dynamics, relational energy, unspoken currents, shared atmosphere, impact feedback (group), collective experience, present moment (group)",
    maturity_rating_hint: "Mature"
  },
  {
    id: "ECD_01", internal_name: "Edge of Connection: Dyads", belongs_to_set: "RELATIONAL_ALCHEMY",
    description_for_info_button: "For pairs: Explore impact, perceptions, boundaries, and the unspoken 'charge' in your specific connection.",
    deck_inspiration_focus: "Authentic Relating Dyad Practices & Gottman Method Insights",
    llm_keywords: "interpersonal dynamics (dyad), impact feedback, perception of partner, projections (dyad), boundaries (dyad), unspoken tension, relational patterns, direct communication (dyad)",
    maturity_rating_hint: "Mature"
  },
  {
    id: "SD_01", internal_name: "Somatic Dialogue", belongs_to_set: "RELATIONAL_ALCHEMY",
    description_for_info_button: "Connect through shared embodied experiences, non-verbal cues, and sensory exploration between participants.",
    deck_inspiration_focus: "Paired Somatic Exploration & Contact Improv Principles",
    llm_keywords: "embodied connection, non-verbal dialogue, shared movement (simple), relational energy (felt), sensory mirroring, physical listening, co-regulation",
    maturity_rating_hint: "Mature"
  },
  {
    id: "CCF_01", internal_name: "Co-Creating Futures", belongs_to_set: "RELATIONAL_ALCHEMY",
    description_for_info_button: "For pairs or groups: Align intentions, discuss shared values, and explore common ground for future actions or visions.",
    deck_inspiration_focus: "Collaborative Visioning & Shared Goal Setting (Appreciative Inquiry style)",
    llm_keywords: "shared vision, co-creation, mutual aspirations, collective intention, common ground, partnership goals, team alignment, future possibilities (shared)",
    maturity_rating_hint: "General"
  },
  // Set 4: Adventurous Resonance
  {
    id: "EBE_01", internal_name: "Erotic Blueprint Exploration", belongs_to_set: "ADVENTUROUS_RESONANCE",
    description_for_info_button: "For couples/partners: Discover and share your unique turn-ons, desires, boundaries, and erotic languages. (Explicitly Adult)",
    deck_inspiration_focus: "Jaiya's Erotic Blueprints & Intimate Desire Question Decks",
    llm_keywords: "erotic blueprints, sexual desire, turn-ons, turn-offs, fantasies (consensual), erotic language, sensual preferences, boundaries (sexual), pleasure mapping, sexual communication",
    maturity_rating_hint: "Intimate/Explicit"
  },
  {
    id: "TTET_01", internal_name: "Taboo Topics & Edgy Truths", belongs_to_set: "ADVENTUROUS_RESONANCE",
    description_for_info_button: "Daring questions that challenge social norms, explore provocative thoughts, and invite radical honesty. (Mature & Provocative)",
    deck_inspiration_focus: "Provocative Question Decks & Radical Honesty Principles",
    llm_keywords: "taboo subjects, radical honesty, unconventional thoughts, challenging norms, controversial opinions (respectfully explored), hidden judgments, raw truths, playful provocation",
    maturity_rating_hint: "Mature"
  },
  {
    id: "SA_01", internal_name: "Sensual Awakening", belongs_to_set: "ADVENTUROUS_RESONANCE",
    description_for_info_button: "Invitations to explore heightened sensory experiences, embodied pleasure, and mindful sensuality, alone or with a partner. (Mature/Intimate)",
    deck_inspiration_focus: "Mindful Sexuality & Tantric Principles (Sensory Focus)",
    llm_keywords: "sensual awareness, embodied pleasure (non-explicit), mindful touch (self or partnered), sensory amplification, erotic energy (subtle), presence in sensation, body appreciation",
    maturity_rating_hint: "Intimate/Explicit"
  },
  {
    id: "RR_01", internal_name: "Risk & Revelation", belongs_to_set: "ADVENTUROUS_RESONANCE",
    description_for_info_button: "Push your relational comfort zones with playful dares, bold declarations, or unexpected acts of connection. (Mature & Playful Risk)",
    deck_inspiration_focus: "Playful Dare Decks & Relational Edge Exploration",
    llm_keywords: "relational risks (playful), bold declarations, unexpected actions, challenging comfort zones, spontaneous connection, playful dares, vulnerability through action",
    maturity_rating_hint: "Mature"
  }
];

export const CULMINATION_MICRO_DECK_PROXY: MicroDeck = {
    id: "CULMINATION_PROXY",
    internal_name: "Session Synthesis", 
    belongs_to_set: null, 
    description_for_info_button: "A reflection on the journey so far, synthesizing emergent themes from the session history.",
    deck_inspiration_focus: "Overall Session Reflection & Synthesis",
    llm_keywords: "emergent themes, key insights, session journey, integration, synthesis, patterns, takeaways",
    maturity_rating_hint: "General", 
};

export type VoiceName = 
  | "Aoede" | "Puck" | "Charon" | "Kore" | "Fenrir" | "Leda" | "Orus" | "Zephyr" 
  | "Achird" | "Algenib" | "Algieba" | "Alnilam" | "Autonoe" | "Callirrhoe" | "Despina" 
  | "Enceladus" | "Erinome" | "Gacrux" | "Iapetus" | "Laomedeia" | "Pulcherrima" 
  | "Rasalgethi" | "Sadachbia" | "Sadaltager" | "Schedar" | "Sulafat" | "Umbriel" 
  | "Vindemiatrix" | "Zubenelgenubi" | "Achernar";

export type LanguageCode = "en-US" | "es-US" | "nl-NL";

export interface VoiceOption { name: VoiceName; gender: 'Female' | 'Male' | 'Neutral'; characteristics: string; }
export interface LanguageOption { code: LanguageCode; name: string; }

export const GOOGLE_VOICES: VoiceOption[] = [
    { name: "Zephyr", characteristics: "Bright", gender: "Female" }, { name: "Puck", characteristics: "Upbeat", gender: "Male" },
    { name: "Charon", characteristics: "Informative", gender: "Male" }, { name: "Kore", characteristics: "Firm", gender: "Female" },
    { name: "Fenrir", characteristics: "Excitable", gender: "Male" }, { name: "Leda", characteristics: "Youthful", gender: "Female" },
    { name: "Orus", characteristics: "Firm", gender: "Male" }, { name: "Aoede", characteristics: "Breezy", gender: "Female" },
    { name: "Callirrhoe", characteristics: "Easy-going", gender: "Female" }, { name: "Autonoe", characteristics: "Bright", gender: "Female" },
    { name: "Enceladus", characteristics: "Breathy", gender: "Male" }, { name: "Iapetus", characteristics: "Clear", gender: "Male" },
    { name: "Umbriel", characteristics: "Easy-going", gender: "Male" }, { name: "Algieba", characteristics: "Smooth", gender: "Male" },
    { name: "Despina", characteristics: "Smooth", gender: "Female" }, { name: "Erinome", characteristics: "Clear", gender: "Female" },
    { name: "Algenib", characteristics: "Gravelly", gender: "Male" }, { name: "Rasalgethi", characteristics: "Informative", gender: "Male" },
    { name: "Laomedeia", characteristics: "Upbeat", gender: "Female" }, { name: "Achernar", characteristics: "Soft", gender: "Female" },
    { name: "Alnilam", characteristics: "Firm", gender: "Male" }, { name: "Schedar", characteristics: "Even", gender: "Male" },
    { name: "Gacrux", characteristics: "Mature", gender: "Female" }, { name: "Pulcherrima", characteristics: "Forward", gender: "Female" },
    { name: "Achird", characteristics: "Friendly", gender: "Male" }, { name: "Zubenelgenubi", characteristics: "Casual", gender: "Male" },
    { name: "Vindemiatrix", characteristics: "Gentle", gender: "Female" }, { name: "Sadachbia", characteristics: "Lively", gender: "Male" },
    { name: "Sadaltager", characteristics: "Knowledgeable", gender: "Male" }, { name: "Sulafat", characteristics: "Warm", gender: "Female" }
];
export const LANGUAGES: LanguageOption[] = [
    { code: "en-US", name: "English (US)" }, { code: "es-US", name: "Spanish (US)" }, { code: "nl-NL", name: "Dutch (Netherlands)" }, 
];
export const DEFAULT_VOICE_NAME: VoiceName = "Enceladus";
export const DEFAULT_LANGUAGE_CODE: LanguageCode = "en-US";

export type GroupSetting = "GENERAL" | "STRANGERS" | "FRIENDS" | "ROMANTIC" | "FAMILY" | "COLLEAGUES" | "COMMUNITY" | "SPECIAL";
export interface GroupSettingOption { id: GroupSetting; label: string; description: string; }
export const GROUP_SETTINGS: GroupSettingOption[] = [
  { id: "GENERAL", label: "General", description: "For any group or when unsure." },
  { id: "STRANGERS", label: "Strangers", description: "Getting to know each other, icebreakers." },
  { id: "FRIENDS", label: "Friends", description: "Deeper connection, shared experiences." },
  { id: "ROMANTIC", label: "Romantic", description: "Intimacy, partnership, shared journey." },
  { id: "FAMILY", label: "Family", description: "Bonds, history, understanding." },
  { id: "COLLEAGUES", label: "Colleagues", description: "Team dynamics, collaboration, professional connection." },
  { id: "COMMUNITY", label: "Community", description: "Shared purpose, group identity, mutual support." },
  { id: "SPECIAL", label: "Special", description: "Curated experiences." },
];
export const DEFAULT_GROUP_SETTING: GroupSetting = "GENERAL";

// For Sven & Lisa Special Mode
export const SVEN_LISA_PRIORITIZED_MICRO_DECK_IDS: MicroDeck['id'][] = [
    "SBP_01", // Shared Breath & Presence
    "CCS_01", // Curiosity Cafe Spark
    "SS_01",  // Snapshot Stories
    "HAV_01", // Heart's Authentic Voice (with caveats, for individual sharing)
    "SD_01",  // Somatic Dialogue (simple, non-verbal focus)
];

const SVEN_LISA_SYSTEM_PROMPT_DIRECTIVES = `
**SVEN & LISA SPECIAL MODE - OVERRIDING GUIDANCE:**
The current "Special" group setting is active for participants Sven and Lisa. This triggers specific interaction goals:
- **Lower Pressure:** Minimize focus on perfect, immediate, total understanding.
- **Sharing & Witnessing:** Emphasize each person expressing their own experience/thoughts, and the other simply receiving it as valid.
- **Individually Grounded:** Prioritize prompts encouraging individual exploration of internal landscapes related to a topic, rather than prompts demanding immediate analysis of the "us" dynamic or intricate joint problem-solving.
- **Card Back Notes Emphasis:** For your generated Card Back Notes, strongly guide users to practice active listening with curiosity and to validate the act of sharing itself. Emphasize "witnessing" over "fixing" or "fully decoding."
- **Prioritized Keywords for this mode:** "individual perspectives, personal stories, sensory sharing, active listening, witnessing, curiosity, lighthearted exploration, patient communication, clear expression (simple), non-judgmental space, shared enjoyment"

Adapt your prompt generation AND card back notes to strongly reflect these directives.
`;


export const getMicroDeckById = (microDeckId: MicroDeck['id']): MicroDeck | null => {
  if (microDeckId === CULMINATION_MICRO_DECK_PROXY.id) return CULMINATION_MICRO_DECK_PROXY;
  return ALL_MICRO_DECKS.find(md => md.id === microDeckId) || null;
}
export const getCustomDeckById = (customDeckId: CustomThemeId, customDecks: CustomThemeData[]): CustomThemeData | null => {
  return customDecks.find(cd => cd.id === customDeckId) || null;
}
export const getDeckSetById = (deckSetId: DeckSet['id']): DeckSet | null => {
  return DECK_SETS.find(ds => ds.id === deckSetId) || null;
}
export const getDisplayDataForCard = (
  themeIdentifier: ThemeIdentifier, 
  deckSetIdIfKnown: string | null,
  customDecks: CustomThemeData[]
): { name: string; colorClass: string; } => {
  if (themeIdentifier.startsWith("CUSTOM_")) {
    const customDeck = getCustomDeckById(themeIdentifier as CustomThemeId, customDecks);
    return { name: customDeck?.name || "Custom Card", colorClass: customDeck?.colorClass || "from-gray-500 to-gray-600" };
  }
  const microDeck = getMicroDeckById(themeIdentifier as MicroDeck['id']);
  if (microDeck) {
    let color = "from-slate-600 to-slate-700"; 
    const setSourceId = deckSetIdIfKnown || microDeck.belongs_to_set;
    if (setSourceId) {
        const parentSet = getDeckSetById(setSourceId);
        if (parentSet) color = parentSet.colorClass;
    }
    if (microDeck.id === CULMINATION_MICRO_DECK_PROXY.id) {
        color = DECK_SETS.find(ds => ds.id === "UNVEILING_DEPTHS")?.colorClass || "from-purple-600 to-indigo-700";
    }
    return { name: microDeck.internal_name, colorClass: color };
  }
  return { name: "Card", colorClass: "from-gray-500 to-gray-600" };
};

const THOUGHT_PROCESS_START_TAG = "<thought_process>";
const THOUGHT_PROCESS_END_TAG = "</thought_process>";
const CARD_FRONT_PROMPT_START_TAG = "<card_front_prompt>";
const CARD_FRONT_PROMPT_END_TAG = "</card_front_prompt>";
const CARD_BACK_NOTES_START_TAG = "<card_back_notes>";
const CARD_BACK_NOTES_END_TAG = "</card_back_notes>";

interface GeminiPayload { systemInstruction: string; userContent: string; fullPromptForDisplay: string; }

const constructGeminiPayload = (
  userSelectedSetName: string, 
  selectedMicroDeck: MicroDeck, 
  participantCount: number, 
  participantNames: string[],
  activeParticipantName: string | null,
  groupSetting: GroupSetting,
  history: CardHistoryItem[],
  languageCode: LanguageCode = DEFAULT_LANGUAGE_CODE,
  isSvenAndLisaSpecialModeActive: boolean = false 
): GeminiPayload => {
  
  const selectedLanguageName = LANGUAGES.find(lang => lang.code === languageCode)?.name || "English (US)";
  const selectedGroupSettingLabel = GROUP_SETTINGS.find(gs => gs.id === groupSetting)?.label || "General";

  let participantInfo = "";
  if (isSvenAndLisaSpecialModeActive) {
    participantInfo = `Setting: Special (Sven & Lisa Focus). Participants: Sven, Lisa. Active: ${activeParticipantName || 'N/A'}. `;
  } else {
    const namedParticipantList = participantNames.filter(name => name.trim() !== '');
    if (participantCount > 1) {
      const namesString = namedParticipantList.length > 0 ? namedParticipantList.join(', ') : `${participantCount} participants`;
      participantInfo = `Group: ${namesString}. `;
      if (activeParticipantName) participantInfo += `Active: ${activeParticipantName}. `;
    } else {
       const subject = activeParticipantName || (participantCount === 1 && namedParticipantList.length === 1 ? namedParticipantList[0] : 'Individual');
       participantInfo = `Individual: ${subject}. `;
    }
    participantInfo += `Setting: ${selectedGroupSettingLabel}.`;
  }

  let historySnippet = "No significant prior interactions this theme or session.";
  if (selectedMicroDeck.id === CULMINATION_MICRO_DECK_PROXY.id && history.length > 0) {
    historySnippet = "Entire Session History (newest first, summarize key themes from up to 5-7 cards if possible):\n";
    const relevantHistory = history.slice(0, 7); 
    let themesMentioned: string[] = [];
    relevantHistory.forEach(card => {
      let cardThemeName = "Unknown Deck";
      if (card.themeIdentifier.startsWith("CUSTOM_")) {
        cardThemeName = "Custom Deck"; 
      } else {
        const micro = getMicroDeckById(card.themeIdentifier as MicroDeck['id']);
        cardThemeName = micro?.internal_name || "Micro Deck";
      }
      const textPreview = card.text && card.text.length > 40 ? card.text.substring(0, 37) + "..." : card.text;
      themesMentioned.push(`${cardThemeName} (Prompt: "${textPreview}", Feedback: ${card.feedback || 'none'})`);
    });
    if (themesMentioned.length > 0) { historySnippet += themesMentioned.join('\n- '); } 
    else { historySnippet = "No prior cards in this session to synthesize from."; }
  } else if (history.length > 0) {
    const relevantFeedbackCard = history.find(card => card.themeIdentifier === selectedMicroDeck.id && (card.feedback === 'liked' || card.feedback === 'disliked'));
    if (relevantFeedbackCard) {
      historySnippet = `Prior interaction with "${selectedMicroDeck.internal_name}" micro-deck: Prompt "${relevantFeedbackCard.text?.substring(0,40)}..." was ${relevantFeedbackCard.feedback}.`;
    } else if (history.length > 0) {
        const lastCard = history[0];
        let lastCardThemeName = "Unknown Deck";
         if (lastCard.themeIdentifier.startsWith("CUSTOM_")) { lastCardThemeName = "Custom Deck"; } 
         else { const micro = getMicroDeckById(lastCard.themeIdentifier as MicroDeck['id']); lastCardThemeName = micro?.internal_name || "Micro Deck"; }
        historySnippet = `Last card (from "${lastCardThemeName}"): "${lastCard.text?.substring(0,40)}..." (Feedback: ${lastCard.feedback || 'none'}).`;
    }
  }
  
  let sessionArcCue: string;
  if (selectedMicroDeck.id === CULMINATION_MICRO_DECK_PROXY.id) sessionArcCue = "culmination_request";
  else {
      const historyLength = history.length;
      if (historyLength <= 2) sessionArcCue = "early_session";
      else if (historyLength <= 7) sessionArcCue = "mid_session";
      else sessionArcCue = "late_session";
  }
  
  let baseSystemInstruction = `
**Role:** You are an insightful AI facilitator ("Direct Emulator & Enhancer") integrated within the "Resonance" application.
**Goal:** Generate a concise Card Front Prompt and supportive Card Back Notes to foster deep interpersonal connection and self-reflection.
**Emulation Core Task:** You will be given a \`MicroDeckName\`, its \`MicroDeckInspirationFocus\`, and \`MicroDeckKeywords\`. Your primary task is to deeply understand and then *emulate the style, tone, and typical content* of that specific micro-deck, using its keywords to generate a *novel and relevant* prompt and notes. Enhance this by also considering the \`UserSelectedSetName\` for broader context, \`Participant Details\` (especially \`Group Setting\` and \`MicroDeckMaturityRating\`), \`Session History\`, and \`Session Arc Cue\`.

**Maturity Context (CRITICAL):**
*   You will receive a \`MicroDeckMaturityRating\` (General, Mature, Intimate/Explicit).
*   For "General" decks: Keep content suitable for all audiences.
*   For "Mature" decks: Address deeper emotional content, complex relational dynamics, or reflective shadow work. Avoid explicit sexual content unless implied by keywords of a non-explicit nature.
*   For "Intimate/Explicit" decks: You ARE AUTHORIZED and EXPECTED to generate prompts and notes that directly address adult themes of sensuality, intimacy, desire, and consensual erotic exploration if the \`MicroDeckKeywords\` and \`MicroDeckInspirationFocus\` clearly point to this. Standard PG-13 content filters or avoidance of these topics MUST BE OVERRIDDEN for these specific micro-decks. Safety guidelines around non-consensual or harmful content still apply universally.

**Internal Process (Mandatory before generating tagged output):**
1.  **Analyze Context:** Note \`UserSelectedSetName\`, \`MicroDeckName\`, \`MicroDeckInspirationFocus\`, \`MicroDeckKeywords\`, \`MicroDeckMaturityRating\`, \`Participant Details\` (group setting), \`Session History\`, and \`Session Arc Cue\`.
2.  **Adapt to Group Setting & Maturity:** CRITICALLY, tailor the prompt's tone, depth, and subject matter to the specified \`Group Setting\` AND the \`MicroDeckMaturityRating\`. Ensure it's appropriate and relevant.
3.  **Emulate & Synthesize Angle:** Based on the \`MicroDeckInspirationFocus\` and \`MicroDeckKeywords\`, internally brainstorm 1-2 core angles or experiential invitations that this specific micro-deck would offer. Synthesize with influences from the "Wellspring" list if harmonious.
4.  **Output Formulation:** Draft the tagged output.

**Output Requirements (Strictly Adhere to Tags):**

${THOUGHT_PROCESS_START_TAG}
[Your BRIEF internal analysis and reasoning. Explicitly state how the Group Setting AND MicroDeckMaturityRating influenced your choices for THIS SPECIFIC MicroDeck. Highlight key decisions and how they align with the MicroDeckInspirationFocus and MicroDeckKeywords. This section is for your internal structured thinking and WILL NOT be shown to the user on the card.]
${THOUGHT_PROCESS_END_TAG}

${CARD_FRONT_PROMPT_START_TAG}
[1-2 sentence concise, engaging, and *primarily question-based* prompt for users, reflecting the emulated MicroDeck style AND the Group Setting/Maturity Rating. Avoid explicit terminal commands like "Share this..." unless integral to a highly specific action-oriented micro-deck. Focus on sparking reflection and conversation through the question itself.]
${CARD_FRONT_PROMPT_END_TAG}

${CARD_BACK_NOTES_START_TAG}
[REQUIRED: Generate 1-3 sentences for EACH of the following five sections. Use the exact headings provided below, followed by the content for that section. Ensure the overall tone is supportive, accessible, AND appropriate for the Group Setting and emulated MicroDeck.

**Intent & Invitation:**
[Your text for Intent & Invitation]

**Simple Steps or Guidance:**
[Your text for Simple Steps or Guidance]

**Clarifying Concepts:**
[Your text for Clarifying Concepts]

**Inspirational Nudges:**
[Your text for Inspirational Nudges]

**Deeper Dive Question:**
[Your text for Deeper Dive Question]
]
${CARD_BACK_NOTES_END_TAG}

_INTERNAL USE ONLY - Wellspring Influences (Keywords for your internal inspiration - synthesize and apply principles):_
_Authentic Relating (curiosity, truth, noticing), Circling (presence, group energy), WANRS-style (layered sharing), Coaching (powerful questions), Mindfulness (non-judgment, sensory awareness), Somatics (body wisdom, embodiment), Creative Expression (metaphor, movement), Systemic Awareness (interconnection), Positive Psychology (strengths, visioning), Modern Relational Insights (boundaries, healing), Depth Psychology (shadow, archetypes), IFS (parts work), Tantra (sensual energy - principles), Erotic Blueprints (desire types - principles)._

_INTERNAL USE ONLY - Feedback Interpretation (In your internal process for \`Session History Snippet\` analysis):_
_*   If a liked prompt from the *same micro-deck* is noted: Aim for similar *quality of insight and supportive framing* but for a **semantically novel prompt and fresh notes**._
_*   If a disliked prompt from the *same micro-deck* is noted: Significantly PIVOT your approach (style of prompt and notes) for that micro-deck._
  `.trim();

  const finalSystemInstruction = isSvenAndLisaSpecialModeActive 
    ? `${SVEN_LISA_SYSTEM_PROMPT_DIRECTIVES}\n\n${baseSystemInstruction}` 
    : baseSystemInstruction;

  const userContent = `
**Dynamic Inputs (User Prompt Section):**
*   **UserSelectedSetName:** "${userSelectedSetName}"
*   **MicroDeckName:** "${selectedMicroDeck.internal_name}"
*   **MicroDeckInspirationFocus:** "${selectedMicroDeck.deck_inspiration_focus}"
*   **MicroDeckKeywords:** "${selectedMicroDeck.llm_keywords}"
*   **MicroDeckMaturityRating:** "${selectedMicroDeck.maturity_rating_hint}"
*   **Participant Details:** ${participantInfo} 
*   **Session History Snippet:** ${historySnippet}
*   **Session Arc Cue:** "${sessionArcCue}"
*   **Language for Output:** "${selectedLanguageName}"

**Task:**
Perform your internal "thought process" based on all System Prompt instructions and the dynamic User Prompt data. Then, provide your final output strictly using the ${THOUGHT_PROCESS_START_TAG}...${THOUGHT_PROCESS_END_TAG}, ${CARD_FRONT_PROMPT_START_TAG}...${CARD_FRONT_PROMPT_END_TAG}, and ${CARD_BACK_NOTES_START_TAG}...${CARD_BACK_NOTES_END_TAG} tags. Ensure the final user-facing content is in the requested language and embodies the described facilitative style, critically adapting to the Group Setting and MicroDeck specifics.
  `.trim();

  const fullPromptForDisplay = `
========== SYSTEM INSTRUCTION (Deck Sets - Direct Emulator & Enhancer): ==========
${finalSystemInstruction}

========== USER CONTENT: ==========
${userContent}
  `.trim();
  
  return { systemInstruction: finalSystemInstruction, userContent, fullPromptForDisplay };
};

export interface GeminiPromptResponse {
  text: string;
  audioData: string | null;
  audioMimeType: string |null;
  llmPromptForTextGeneration: string; 
  rawLlmOutput: string;
  cardBackNotesText: string | null; 
  cardBackAudioData?: string | null;
  cardBackAudioMimeType?: string | null;
}

const extractTextBetweenTags = (text: string, startTag: string, endTag: string): string | null => {
  const startIndex = text.indexOf(startTag);
  if (startIndex === -1) return null;
  const endIndex = text.indexOf(endTag, startIndex + startTag.length);
  if (endIndex === -1) {
    if (startTag === CARD_FRONT_PROMPT_START_TAG || startTag === CARD_BACK_NOTES_START_TAG || startTag === THOUGHT_PROCESS_START_TAG) {
        const knownNextTags = [CARD_FRONT_PROMPT_START_TAG, CARD_BACK_NOTES_START_TAG, THOUGHT_PROCESS_START_TAG].filter(tag => tag !== startTag);
        let potentialEnd = text.length;
        for (const nextTag of knownNextTags) {
            const nextTagIndex = text.indexOf(nextTag, startIndex + startTag.length);
            if (nextTagIndex !== -1) potentialEnd = Math.min(potentialEnd, nextTagIndex);
        }
        return text.substring(startIndex + startTag.length, potentialEnd).trim();
    }
    return null; 
  }
  return text.substring(startIndex + startTag.length, endIndex).trim();
};

export const getStyleDirectiveForMicroDeck = (microDeck: MicroDeck | null, isCardBackNotes: boolean = false): string => {
  if (!microDeck) return "Say clearly: ";

  const focus = microDeck.deck_inspiration_focus.toLowerCase();
  const maturity = microDeck.maturity_rating_hint;

  if (isCardBackNotes) { 
      return "Explain with clarity: ";
  }

  if (focus.includes("mindfulness") || focus.includes("gentle somatic") || focus.includes("presence")) {
    return "Say in a calm and gentle tone: ";
  }
  if (focus.includes("playful") || focus.includes("witty") || focus.includes("icebreaker") || focus.includes("conversational games")) {
    return "Say in a playful and light tone: ";
  }
  if (focus.includes("authentic relating") || focus.includes("vulnerability") || focus.includes("personal truth")) {
    return "Say in a thoughtful and sincere tone: ";
  }
  if (focus.includes("depth psychology") || focus.includes("shadow work") || focus.includes("inner child")) {
    return "Say in a reflective and understanding tone: ";
  }
  if (focus.includes("coaching") || focus.includes("resilience") || focus.includes("problem-solving")) {
    return "Say in an encouraging and clear tone: ";
  }
  if (focus.includes("erotic blueprints") || focus.includes("intimate desire") || focus.includes("sensual awakening") || focus.includes("mindful sexuality")) {
    if (maturity === "Intimate/Explicit") return "Say in an intimate and inviting tone: ";
    return "Say in a warm and open tone: ";
  }
  if (focus.includes("provocative") || focus.includes("radical honesty") || focus.includes("edgy")) {
    return "Say in a direct and curious tone: ";
  }
  if (focus.includes("somatic dialogue") || focus.includes("embodied connection") || focus.includes("contact improv")) {
      return "Say in a grounded and connected tone: ";
  }
   if (focus.includes("story") || focus.includes("anecdote")) {
      return "Narrate warmly: ";
  }
  if (microDeck.id === CULMINATION_MICRO_DECK_PROXY.id) {
    return "Say in a reflective and summarizing tone: "
  }

  // Default based on maturity if no specific focus match
  switch (maturity) {
    case "Mature":
    case "Intimate/Explicit":
      return "Say with thoughtful expression: ";
    case "General":
    default:
      return "Say clearly and engagingly: ";
  }
};

export const generateAudioForText = async (
  textToSpeak: string,
  selectedVoiceName: VoiceName = DEFAULT_VOICE_NAME,
  styleDirective: string = ""
): Promise<{ audioData: string | null; audioMimeType: string | null; error?: string }> => {
  if (!API_KEY || !ai) return { audioData: null, audioMimeType: null, error: "AI client not initialized or API key missing." };
  
  const fullTextToSpeak = styleDirective ? `${styleDirective}"${textToSpeak}"` : textToSpeak;

  if (!fullTextToSpeak || fullTextToSpeak.trim() === "" || (styleDirective && !textToSpeak.trim())) {
    return { audioData: null, audioMimeType: null, error: "No text provided to generate audio." };
  }
  try {
    const audioResponse: GenerateContentResponse = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text: fullTextToSpeak }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceName } } }
      },
    });
    const candidate = audioResponse.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/')) {
          return { audioData: part.inlineData.data, audioMimeType: part.inlineData.mimeType };
        }
      }
    }
    const finishReason = audioResponse.candidates?.[0]?.finishReason;
    let reasonDetails = "";
    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") reasonDetails += `Reason: ${finishReason}. `;
    const safetyRatings = audioResponse.candidates?.[0]?.safetyRatings;
    if (safetyRatings?.some(rating => rating.blocked)) reasonDetails += `Blocked by safety ratings: ${JSON.stringify(safetyRatings)}. `;
    console.warn(`No audio data in response for TTS. Text was: "${fullTextToSpeak.substring(0,70)}...". ${reasonDetails} Full audioResponse:`, JSON.stringify(audioResponse, null, 2));
    return { audioData: null, audioMimeType: null, error: `Audio generation failed. ${reasonDetails}`.trim() };
  } catch (error) {
    console.error(`Error generating audio from Gemini TTS for text "${fullTextToSpeak.substring(0,70)}...":`, error);
    return { audioData: null, audioMimeType: null, error: error instanceof Error ? error.message : "Unknown TTS error." };
  }
};

const MAX_TEXT_GEN_RETRIES = 2; 
const RETRY_DELAY_BASE_MS = 4000; 

export const generatePromptAndAudioFromGemini = async (
  userSelectedSetName: string, 
  chosenItem: MicroDeck | CustomThemeData, 
  participantCount: number, 
  participantNames: string[],
  activeParticipantName: string | null,
  groupSetting: GroupSetting,
  history: CardHistoryItem[],
  selectedVoiceName: VoiceName = DEFAULT_VOICE_NAME,
  languageCode: LanguageCode = DEFAULT_LANGUAGE_CODE,
  isSvenAndLisaSpecialModeActive: boolean = false
): Promise<GeminiPromptResponse> => {
  if (!API_KEY) throw new Error("API_KEY for Gemini is not configured.");
  if (!ai) throw new Error("Gemini AI client is not initialized.");

  let rawGeneratedTextOutput = "";
  let effectiveMicroDeck: MicroDeck;
  if ('internal_name' in chosenItem && 'deck_inspiration_focus' in chosenItem) { 
    effectiveMicroDeck = chosenItem as MicroDeck;
  } else { 
    const customDeck = chosenItem as CustomThemeData;
    effectiveMicroDeck = {
      id: customDeck.id, internal_name: customDeck.name, belongs_to_set: "CUSTOM",
      description_for_info_button: customDeck.description,
      deck_inspiration_focus: `Custom user-defined deck: ${customDeck.name}`,
      llm_keywords: customDeck.description, maturity_rating_hint: "General",
    };
  }
  
  const { systemInstruction, userContent, fullPromptForDisplay } = constructGeminiPayload(
    userSelectedSetName, effectiveMicroDeck, participantCount, participantNames, 
    activeParticipantName, groupSetting, history, languageCode, isSvenAndLisaSpecialModeActive
  );

  const sessionArcCue = effectiveMicroDeck.id === CULMINATION_MICRO_DECK_PROXY.id ? "culmination_request" : (history.length <= 2 ? "early" : (history.length <= 7 ? "mid" : "late"));
  const groupSettingLabel = GROUP_SETTINGS.find(gs => gs.id === groupSetting)?.label || "General";
  const logPrefix = `Generating text with model: ${TEXT_GENERATION_MODEL} for Set: "${userSelectedSetName}", MicroDeck: "${effectiveMicroDeck.internal_name}" (Lang: ${LANGUAGES.find(l=>l.code === languageCode)?.name || languageCode}) Arc: ${sessionArcCue} Setting: ${isSvenAndLisaSpecialModeActive ? "Special (Sven & Lisa)" : groupSettingLabel} Maturity: ${effectiveMicroDeck.maturity_rating_hint}`;
  
  let textResponse: GenerateContentResponse | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_TEXT_GEN_RETRIES; attempt++) {
    console.log(`${logPrefix} (Attempt ${attempt + 1}/${MAX_TEXT_GEN_RETRIES + 1})`);
    try {
      const currentTextResponse: GenerateContentResponse = await ai.models.generateContent({
        model: TEXT_GENERATION_MODEL, contents: [{role: "user", parts: [{text: userContent}]}], config: { systemInstruction: systemInstruction },
      });

      if (currentTextResponse && (currentTextResponse.text || (currentTextResponse.candidates && currentTextResponse.candidates.length > 0) || currentTextResponse.promptFeedback)) {
        textResponse = currentTextResponse;
        lastError = null; 
        break; 
      } else {
        lastError = new Error("Effectively empty response from Gemini text generation.");
        console.warn(`Attempt ${attempt + 1}: Received an empty or malformed response. Full response:`, JSON.stringify(currentTextResponse, null, 2));
      }
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed during Gemini text generation:`, lastError);
      if (lastError.message.toLowerCase().includes("api key") || lastError.message.toLowerCase().includes("permission denied") || lastError.message.toLowerCase().includes("authentication")) {
           throw new Error(`Gemini API Error (Text Gen): Authentication or permission issue. Details: ${lastError.message}`); // Fail fast on auth issues
      }
    }

    if (attempt < MAX_TEXT_GEN_RETRIES) {
      const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
      console.log(`Waiting ${delay}ms before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!textResponse || lastError) {
    const finalErrorMessage = `Failed to process text request with Gemini after ${MAX_TEXT_GEN_RETRIES + 1} attempts. Last error: ${lastError ? lastError.message : 'Unknown error during retries'}`;
    console.error(finalErrorMessage, lastError);
    throw new Error(finalErrorMessage);
  }
  
  if (!textResponse.text) {
      let reasonDetails = "";
      const candidate = textResponse.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;

      if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
          reasonDetails += `Reason: ${finishReason}. `;
      }
      if (safetyRatings?.some(r => r.blocked)) {
          const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => `${r.category}: ${r.probability}`).join(', ');
          reasonDetails += `Blocked by safety ratings: [${blockedCategories}]. `;
      }
      
      if (!reasonDetails && textResponse.promptFeedback?.blockReason) {
          const blockReason = textResponse.promptFeedback.blockReason;
          const safetyRatingsInfo = textResponse.promptFeedback.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ');
          reasonDetails = `Blocked due to: ${blockReason}. ${safetyRatingsInfo ? `Details: [${safetyRatingsInfo}]` : ''}`;
      }

      if (reasonDetails) {
          console.warn(`Text generation yielded no direct text after retries, but found reasons: ${reasonDetails}. Full textResponse:`, JSON.stringify(textResponse, null, 2));
          throw new Error(`Text generation failed after retries. ${reasonDetails}`);
      }
      
      if (!textResponse.candidates?.length && !textResponse.promptFeedback?.blockReason) {
           console.error("No text generated and no candidates/promptFeedback in response after retries. Full textResponse:", JSON.stringify(textResponse, null, 2));
           throw new Error("Failed to generate text from Gemini after retries. The response was empty or malformed (no text, candidates, or block reason).");
      }

      console.warn("No text generated (textResponse.text is null/undefined) after retries, and no other clear reason. Full textResponse:", JSON.stringify(textResponse, null, 2));
      throw new Error("Failed to generate text from Gemini after retries. The response did not contain any text, and no clear reason could be determined.");
  }
  
  rawGeneratedTextOutput = textResponse.text.trim();

  const thoughtProcessText = extractTextBetweenTags(rawGeneratedTextOutput, THOUGHT_PROCESS_START_TAG, THOUGHT_PROCESS_END_TAG);
  if (thoughtProcessText) console.log("Extracted thought process:\n", thoughtProcessText.substring(0,200) + "...");
  else console.log("No thought_process found or tag parsing failed for it.");

  let finalCleanedText = extractTextBetweenTags(rawGeneratedTextOutput, CARD_FRONT_PROMPT_START_TAG, CARD_FRONT_PROMPT_END_TAG);
  let cardBackNotesText = extractTextBetweenTags(rawGeneratedTextOutput, CARD_BACK_NOTES_START_TAG, CARD_BACK_NOTES_END_TAG);
  
  if (finalCleanedText === null) {
    console.warn(`Tag parsing failed for main prompt. Full Raw LLM Output:\n`, rawGeneratedTextOutput);
    finalCleanedText = rawGeneratedTextOutput.split(CARD_BACK_NOTES_START_TAG)[0].trim() || rawGeneratedTextOutput.split(THOUGHT_PROCESS_START_TAG)[0].trim() || rawGeneratedTextOutput.split('\n')[0].trim();
    finalCleanedText = finalCleanedText || "The Resonance seems to be quiet. Try another card.";
  }
  if (cardBackNotesText === null && rawGeneratedTextOutput.includes(CARD_BACK_NOTES_START_TAG)) {
     console.warn(`Tag parsing failed for card back notes but start tag was present. Full Raw LLM Output:\n`, rawGeneratedTextOutput);
     const backNotesStartIndex = rawGeneratedTextOutput.indexOf(CARD_BACK_NOTES_START_TAG);
     if (backNotesStartIndex !== -1) {
         cardBackNotesText = rawGeneratedTextOutput.substring(backNotesStartIndex + CARD_BACK_NOTES_START_TAG.length).trim();
         const thoughtProcessIndexAfterNotes = cardBackNotesText.indexOf(THOUGHT_PROCESS_START_TAG);
         const cardFrontIndexAfterNotes = cardBackNotesText.indexOf(CARD_FRONT_PROMPT_START_TAG);
         let endPoint = cardBackNotesText.length;
         if (thoughtProcessIndexAfterNotes !== -1) endPoint = Math.min(endPoint, thoughtProcessIndexAfterNotes);
         if (cardFrontIndexAfterNotes !== -1) endPoint = Math.min(endPoint, cardFrontIndexAfterNotes);
         cardBackNotesText = cardBackNotesText.substring(0, endPoint).trim();
     }
  }
  if (!finalCleanedText || finalCleanedText.trim().length === 0) {
      console.error("Generated text for card front is empty after parsing/cleaning.");
      finalCleanedText = "The Resonance seems to be quiet for a moment. Try drawing another card."; 
  }
  console.log("Final cleaned text for card front & TTS:", `"${finalCleanedText}"`);
  if (cardBackNotesText) console.log("Extracted card back notes text:", `"${cardBackNotesText.substring(0, 100)}..."`);
  else console.log("No card back notes text extracted.");
  
  let mainAudioData: string | null = null; let mainAudioMimeType: string | null = null;
  if (finalCleanedText && !finalCleanedText.startsWith("The Resonance seems to be quiet")) {
    const styleDirective = getStyleDirectiveForMicroDeck(effectiveMicroDeck, false);
    const mainAudioResult = await generateAudioForText(finalCleanedText, selectedVoiceName, styleDirective);
    if (mainAudioResult.audioData && mainAudioResult.audioMimeType) {
        mainAudioData = mainAudioResult.audioData; mainAudioMimeType = mainAudioResult.audioMimeType;
    } else if (mainAudioResult.error) {
        console.warn(`Could not generate audio for main prompt: ${mainAudioResult.error}`);
    }
  } else { console.warn("Main prompt text is empty or fallback, skipping TTS call for main prompt."); }

  return { 
      text: finalCleanedText, audioData: mainAudioData, audioMimeType: mainAudioMimeType, 
      llmPromptForTextGeneration: fullPromptForDisplay, rawLlmOutput: rawGeneratedTextOutput,
      cardBackNotesText: cardBackNotesText,
  };
};

export default {};