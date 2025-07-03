
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

const PRIMARY_TEXT_GENERATION_MODEL = 'gemini-2.5-flash-lite-preview-06-17';
const FALLBACK_TEXT_GENERATION_MODEL = 'gemini-2.0-flash-lite';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'; 
const GENERATION_TIMEOUT_MS = 20000; // 20 seconds

// --- New "Angles of Inquiry" Architecture ---
export interface AngleOfInquiry {
  id: string; // e.g., 'sensation_compass'
  name: string; // e.g., 'The Sensation Compass'
  description: string; // The full description for the LLM
}

export const ANGLES_OF_INQUIRY: AngleOfInquiry[] = [
  {
    id: "sensation_compass",
    name: "The Sensation Compass",
    description: "Anchor the prompt in physical, bodily felt experience. Explore what your body is telling you. Where do you feel this? What is its texture, temperature, or subtle movement?"
  },
  {
    id: "origin_story_whisper",
    name: "The Origin Story Whisper",
    description: "Understand the roots or initial moments of a feeling, state, or concept. What is an early memory, a first experience, or the root of this feeling? What might that moment reveal?"
  },
  {
    id: "future_reflection",
    name: "The Future Reflection",
    description: "Project forward, seeking wisdom or perspective from a future self or outcome. Imagine looking back from the future, or looking forward. What perspective, advice, or insight arises?"
  },
  {
    id: "tangible_metaphor",
    name: "The Tangible Metaphor",
    description: "Translate abstract feelings or concepts into concrete objects or sensory experiences. If this feeling, idea, or state were an object, a color, a sound, or a texture, what would it be and why?"
  },
  {
    id: "behavioral_clue",
    name: "The Behavioral Clue",
    description: "Identify observable actions, habits, or expressions that indicate an inner state. What is an observable action, a habit, or a subtle gesture that reflects this feeling or state?"
  },
  {
    id: "relational_echo",
    name: "The Relational Echo",
    description: "Explore dynamics, perceptions, and the interplay between people. How does this manifest in relationship? What do you sense or notice about the connection, the dynamic, or the other person?"
  },
  {
    id: "philosophical_lens",
    name: "The Philosophical Lens",
    description: "Engage with broader life concepts, wisdom traditions, or existential questions. Consider this through a philosophical idea, a life lesson, or a contemplation on meaning. What insights arise?"
  },
  {
    id: "narrative_thread",
    name: "The Narrative Thread",
    description: "Uncover the story, theme, or lesson within an experience. What is the key moment, the central emotion, or the underlying lesson?"
  },
  {
    id: "inner_weather",
    name: "The Inner Weather",
    description: "What is the emotional weather inside you right now? Is it sunny, stormy, foggy, or calm? Describe its characteristics as a metaphorical weather system."
  }
];


// --- New Deck Sets and Micro Decks Architecture ---

export type GroupSetting = "SOLO" | "GENERAL" | "STRANGERS" | "FRIENDS" | "ROMANTIC" | "FAMILY" | "COLLEAGUES" | "COMMUNITY" | "SPECIAL";
export type Suitability = 'PREFERRED' | 'OPTIONAL' | 'HIDDEN';

export interface DeckSet {
  id: string; // e.g., "KINDLING_CONNECTION"
  name: string; // User-facing name, e.g., "Kindling Connection"
  description: string; // User-facing description for the Set
  colorClass: string; // Tailwind color class for the Set button
}

export interface MicroDeck {
  id: string; // Unique ID, e.g., "AP_01"
  name: string; // User-facing name, e.g., "Arrival in Presence"
  belongs_to_set: string | null; // ID of the DeckSet it belongs to
  description_for_info_button: string; // Detailed description
  focus: string; // Guidance for LLM (style/methodology)
  keywords: string; // Specific keywords for this micro-deck
  group_setting_suitability: Partial<Record<GroupSetting, Suitability>>;
  possible_angles: AngleOfInquiry['id'][];
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
    description: "Gentle prompts to spark warm conversation and easy moments of connection. Perfect for getting to know someone or sharing a lighthearted moment.",
    colorClass: "from-sky-400 to-cyan-400",
  },
  {
    id: "UNVEILING_DEPTHS",
    name: "Unveiling Depths",
    description: "Explore your inner world with gentle courage. Discover personal truths, tender feelings, and gain deeper understanding of yourself.",
    colorClass: "from-emerald-400 to-green-500",
  },
  {
    id: "RELATIONAL_ALCHEMY",
    name: "Relational Alchemy",
    description: "Deepen your connections. Explore the dynamics, communication, and shared energy that shape your relationships, fostering understanding and growth.",
    colorClass: "from-rose-500 to-red-600",
  },
  {
    id: "ADVENTUROUS_RESONANCE",
    name: "Adventurous Resonance",
    description: "Explore with bold curiosity. Venture into intimate discovery, playful provocations, and courageous connection. (Mature Themes)",
    colorClass: "from-purple-500 to-indigo-600",
  },
  {
    id: "THE_ART_OF_LIVING",
    name: "The Art of Living",
    description: "Find wisdom for everyday life. Explore philosophical ideas, cultivate self-awareness, and navigate life's challenges with clarity and intention.",
    colorClass: "from-purple-400 to-pink-500",
  },
  {
    id: "THE_STORYTELLERS_CRAFT",
    name: "The Storyteller's Craft",
    description: "Craft and share your personal narratives. Discover the power of your voice, connect through stories, and find meaning in your experiences.",
    colorClass: "from-yellow-500 to-orange-600",
  }
];

export const ALL_MICRO_DECKS: MicroDeck[] = [
    // Set 1: Kindling Connection
    {
        id: "KC_01", name: "Arrival in Presence", belongs_to_set: "KINDLING_CONNECTION",
        description_for_info_button: "Gentle prompts to help you arrive in the present moment, noticing immediate sensory details and find a sense of calm.",
        focus: "Mindfulness & Gentle Somatic Check-in",
        keywords: "presence, grounding, breath awareness, immediate sensations, simple observation, calm focus, sensory details, physical anchors",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'tangible_metaphor', 'behavioral_clue'],
    },
    {
        id: "KC_02", name: "Everyday Curiosities", belongs_to_set: "KINDLING_CONNECTION",
        description_for_info_button: "Spark lighthearted conversation with gentle curiosities about the world, simple 'what ifs,' and everyday observations.",
        focus: "Engaging Podcast-Style Icebreakers",
        keywords: "curiosity, simple observations, everyday wonders, light hypotheticals, personal quirks, playful ideas, sparks of interest, daydreams",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['tangible_metaphor', 'inner_weather', 'narrative_thread'],
    },
    {
        id: "KC_03", name: "Fleeting Moments", belongs_to_set: "KINDLING_CONNECTION",
        description_for_info_button: "Inviting brief, personal snapshots. Share simple memories, small joys, or everyday observations.",
        focus: "Light Personal Anecdote Sharing",
        keywords: "personal moments, simple memories, everyday observations, small joys, light anecdotes, sensory details, brief stories, personal preferences",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['origin_story_whisper', 'behavioral_clue', 'tangible_metaphor'],
    },
    {
        id: "KC_04", name: "A Dash of Playfulness", belongs_to_set: "KINDLING_CONNECTION",
        description_for_info_button: "Ignite lighthearted exchanges, gentle humor, and spontaneous moments of shared delight and wit.",
        focus: "Lighthearted & Witty Conversational Games",
        keywords: "playfulness, gentle humor, lightheartedness, spontaneous moments, witty observations, simple fun, charming silliness, shared smiles",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['inner_weather', 'tangible_metaphor', 'behavioral_clue'],
    },
    // Set 2: Unveiling Depths
    {
        id: "UD_01", name: "Your Inner Voice", belongs_to_set: "UNVEILING_DEPTHS",
        description_for_info_button: "Connect with your inner feelings and truths. Explore your core needs and personal values with gentle self-reflection.",
        focus: "Authentic Relating Self-Expression & Vulnerability",
        keywords: "core feelings, personal truth, inner needs, values, gentle vulnerability, sincere expression, tender moments, self-reflection",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'HIDDEN', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'origin_story_whisper', 'relational_echo'],
    },
    {
        id: "UD_02", name: "Inner Light & Shadow", belongs_to_set: "UNVEILING_DEPTHS",
        description_for_info_button: "Gently explore the less obvious aspects of yourself. Understand inner critic patterns, hidden strengths, and your path to wholeness.",
        focus: "Depth Psychology & Self-Acceptance",
        keywords: "inner critic, hidden strengths, self-acceptance, emotional patterns, personal resilience, inner complexities, self-understanding, integrated self",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'OPTIONAL', COLLEAGUES: 'HIDDEN', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['tangible_metaphor', 'sensation_compass', 'origin_story_whisper'],
    },
    {
        id: "UD_03", name: "Whispers of Your Past", belongs_to_set: "UNVEILING_DEPTHS",
        description_for_info_button: "Connect with your inner child's perspective. Offer compassion to past experiences and acknowledge simple needs with nurturing awareness.",
        focus: "Trauma-Informed Self-Compassion",
        keywords: "inner child (gently), past experiences, emotional echoes, self-compassion, inner nurture, understanding needs, resilience, gentle reflection, core memories",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'OPTIONAL', COLLEAGUES: 'HIDDEN', COMMUNITY: 'OPTIONAL', GENERAL: 'PREFERRED' },
        possible_angles: ['origin_story_whisper', 'sensation_compass', 'tangible_metaphor'],
    },
    {
        id: "UD_04", name: "Inner Worlds Dialogue", belongs_to_set: "UNVEILING_DEPTHS",
        description_for_info_button: "Listen to the different parts of yourself. Understand their roles, needs, and wisdom with curiosity and kindness.",
        focus: "Internal Family Systems (IFS) & Voice Dialogue",
        keywords: "inner parts, internal dialogue, part needs, self-awareness, inner wisdom, personal aspects, understanding self, inner guidance",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', COLLEAGUES: 'HIDDEN', GENERAL: 'PREFERRED' },
        possible_angles: ['origin_story_whisper', 'sensation_compass', 'tangible_metaphor'],
    },
    {
        id: "UD_05", name: "Finding Your Way", belongs_to_set: "UNVEILING_DEPTHS",
        description_for_info_button: "Gently reflect on challenges and beliefs. Find clarity, build resilience, and discover new perspectives for your path.",
        focus: "Coaching for Resilience & ACT-Informed Acceptance",
        keywords: "inner obstacles, personal challenges, fears, self-limiting beliefs, resilience, perspective shifts, finding clarity, personal path, acceptance",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'OPTIONAL', COLLEAGUES: 'OPTIONAL', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['future_reflection', 'behavioral_clue', 'tangible_metaphor'],
    },
    // Set 3: Relational Alchemy
    {
        id: "RA_01", name: "The Shared Space", belongs_to_set: "RELATIONAL_ALCHEMY",
        description_for_info_button: "Become aware of the subtle energy and connections within a group. Notice the present moment of shared presence.",
        focus: "Circling Group Awareness & Process Observation",
        keywords: "group presence, relational energy, collective awareness, shared atmosphere, subtle connections, interpersonal dynamics (group), group coherence, shared moment",
        group_setting_suitability: { SOLO: 'OPTIONAL', STRANGERS: 'OPTIONAL', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'tangible_metaphor', 'relational_echo'],
    },
    {
        id: "RA_02", name: "Between Two", belongs_to_set: "RELATIONAL_ALCHEMY",
        description_for_info_button: "Explore the subtle dance of connection in pairs. Notice impact, perception, and the unspoken language between you and another.",
        focus: "Authentic Relating Dyad Practices",
        keywords: "dyadic connection, impact, perception, relational feedback, personal boundaries, felt connection, communication, partnership dynamic",
        group_setting_suitability: { SOLO: 'OPTIONAL', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'OPTIONAL', GENERAL: 'PREFERRED' },
        possible_angles: ['relational_echo', 'sensation_compass', 'behavioral_clue'],
    },
    {
        id: "RA_03", name: "Body-to-Body Knowing", belongs_to_set: "RELATIONAL_ALCHEMY",
        description_for_info_button: "Connect through shared presence and subtle physical dialogue. Explore embodied connection and sensory awareness with another.",
        focus: "Paired Somatic Exploration",
        keywords: "embodied connection, somatic dialogue, physical awareness, non-verbal cues, sensory connection, shared presence, relational sensing, body knowing",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'OPTIONAL', COLLEAGUES: 'HIDDEN', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'relational_echo', 'tangible_metaphor'],
    },
    {
        id: "RA_04", name: "Building Bridges Together", belongs_to_set: "RELATIONAL_ALCHEMY",
        description_for_info_button: "Discover common ground and mutual aspirations. Imagine and nurture shared intentions for the future you can create together.",
        focus: "Collaborative Visioning & Shared Goal Setting",
        keywords: "shared vision, mutual aspirations, common ground, collective intention, partnership goals, co-creation, shared future, aligned purpose, building together",
        group_setting_suitability: { SOLO: 'OPTIONAL', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['future_reflection', 'tangible_metaphor', 'relational_echo'],
    },
    // Set 4: Adventurous Resonance
    {
        id: "AR_01", name: "Your Desire Compass", belongs_to_set: "ADVENTUROUS_RESONANCE",
        description_for_info_button: "Gently explore your intimate desires and sensual preferences. Honor your unique inner compass and boundaries with self-awareness.",
        focus: "Jaiya's Erotic Blueprints & Intimate Desire Exploration",
        keywords: "desire exploration, sensual preferences, intimate awareness, personal boundaries, pleasure, self-discovery, inner compass, embodied sensuality, turn-ons (personal)",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'OPTIONAL', ROMANTIC: 'PREFERRED', FAMILY: 'HIDDEN', COLLEAGUES: 'HIDDEN', COMMUNITY: 'OPTIONAL', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'origin_story_whisper', 'tangible_metaphor'],
    },
    {
        id: "AR_02", name: "Uncharted Thoughts", belongs_to_set: "ADVENTUROUS_RESONANCE",
        description_for_info_button: "Explore thoughts that lie beyond the usual. Gently probe unconventional ideas and personal truths with curious awareness.",
        focus: "Provocative Question Decks & Radical Honesty",
        keywords: "unconventional thoughts, personal truth, curious exploration, societal observations, inner judgments, unique perspectives, exploring ideas, mindful curiosity",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'HIDDEN', COLLEAGUES: 'HIDDEN', COMMUNITY: 'OPTIONAL', GENERAL: 'PREFERRED' },
        possible_angles: ['philosophical_lens', 'tangible_metaphor', 'inner_weather'],
    },
    {
        id: "AR_03", name: "Senses Awakened", belongs_to_set: "ADVENTUROUS_RESONANCE",
        description_for_info_button: "Awaken your senses to subtle pleasures and embodied presence. Cultivate mindful awareness of your body and its capacity for rich sensation.",
        focus: "Mindful Sexuality & Tantric Sensory Principles",
        keywords: "sensory awareness, embodied presence, mindful sensation, physical awareness, body appreciation, subtle pleasures, rich sensations, presence in feeling",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'OPTIONAL', ROMANTIC: 'PREFERRED', FAMILY: 'HIDDEN', COLLEAGUES: 'HIDDEN', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'tangible_metaphor', 'behavioral_clue'],
    },
    {
        id: "AR_04", name: "Moments of Playful Courage", belongs_to_set: "ADVENTUROUS_RESONANCE",
        description_for_info_button: "Take small, playful steps beyond your comfort zone. Discover spontaneous connection and gentle revelation in shared moments.",
        focus: "Playful Dare Decks & Relational Edge Exploration",
        keywords: "playful steps, relational courage, spontaneous connection, comfort zone exploration, gentle revelation, shared moments, lighthearted dares, expressed vulnerability",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'HIDDEN', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'HIDDEN', COLLEAGUES: 'HIDDEN', COMMUNITY: 'OPTIONAL', GENERAL: 'PREFERRED' },
        possible_angles: ['behavioral_clue', 'future_reflection', 'origin_story_whisper'],
    },
    // Set 5: The Art of Living
    {
        id: "AL_01", name: "Wisdom's Compass", belongs_to_set: "THE_ART_OF_LIVING",
        description_for_info_button: "Gentle reflection on life's big questions. Connect philosophical ideas to your personal experience and find guiding wisdom.",
        focus: "Philosophical Inquiry & Personal Meaning",
        keywords: "philosophical ideas, life wisdom, personal meaning, guiding principles, life questions, contemplation, inner reflection, perspective shifts",
        group_setting_suitability: { SOLO: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['philosophical_lens', 'future_reflection', 'origin_story_whisper'],
    },
    {
        id: "AL_02", name: "Daily Anchors", belongs_to_set: "THE_ART_OF_LIVING",
        description_for_info_button: "Create mindful moments in your day. Explore simple practices for grounding, focus, and finding presence in routine activities.",
        focus: "Mindfulness in Daily Life",
        keywords: "mindful moments, daily routines, grounding practices, simple rituals, focus, presence, everyday awareness, intentional living",
        group_setting_suitability: { SOLO: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['sensation_compass', 'behavioral_clue', 'tangible_metaphor'],
    },
    {
        id: "AL_03", name: "Navigating Life's Currents", belongs_to_set: "THE_ART_OF_LIVING",
        description_for_info_button: "Gently explore transitions and challenges. Find clarity, build resilience, and discover new perspectives for your journey.",
        focus: "Resilience & Personal Growth",
        keywords: "life changes, transitions, challenges, inner resilience, acceptance, personal growth, finding clarity, navigating uncertainty, life's journey",
        group_setting_suitability: { SOLO: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'OPTIONAL', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['future_reflection', 'origin_story_whisper', 'sensation_compass'],
    },
    // Set 6: The Storyteller's Craft
    {
        id: "SC_01", name: "Narrative Threads", belongs_to_set: "THE_STORYTELLERS_CRAFT",
        description_for_info_button: "Explore the elements of your personal stories. Identify moments, characters, and emotions that shape your narrative.",
        focus: "Personal Storytelling & Narrative Reflection",
        keywords: "personal narrative, life stories, memorable moments, key characters, emotional arcs, storytelling elements, personal history, narrative reflection",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'OPTIONAL', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'OPTIONAL', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['origin_story_whisper', 'behavioral_clue', 'sensation_compass'],
    },
    {
        id: "SC_02", name: "The Heart of the Story", belongs_to_set: "THE_STORYTELLERS_CRAFT",
        description_for_info_button: "Uncover the core message or feeling within your experiences. What is the heart of your story trying to convey?",
        focus: "Finding Meaning in Stories",
        keywords: "core message, central feeling, story's essence, personal meaning, emotional impact, narrative purpose, underlying theme, heart of the matter",
        group_setting_suitability: { SOLO: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['inner_weather', 'sensation_compass', 'philosophical_lens'],
    },
    {
        id: "SC_03", name: "A Moment's Spark", belongs_to_set: "THE_STORYTELLERS_CRAFT",
        description_for_info_button: "Recall a small, vivid moment that holds significance. Share a brief, impactful story that captures a feeling or realization.",
        focus: "Anecdotal Storytelling",
        keywords: "vivid moments, impactful stories, small stories, personal realization, brief anecdotes, memorable experiences, captured feelings, captured moments",
        group_setting_suitability: { SOLO: 'PREFERRED', STRANGERS: 'PREFERRED', FRIENDS: 'PREFERRED', ROMANTIC: 'PREFERRED', FAMILY: 'PREFERRED', COLLEAGUES: 'OPTIONAL', COMMUNITY: 'PREFERRED', GENERAL: 'PREFERRED' },
        possible_angles: ['origin_story_whisper', 'behavioral_clue', 'tangible_metaphor'],
    },
];

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

export interface GroupSettingOption { id: GroupSetting; label: string; description: string; }

export const GROUP_SETTINGS: GroupSettingOption[] = [
  { id: "SOLO", label: "Solo", description: "For introspection, journaling, or individual reflection." },
  { id: "GENERAL", label: "General", description: "For any group or when unsure." },
  { id: "STRANGERS", label: "Strangers", description: "Getting to know each other, icebreakers." },
  { id: "FRIENDS", label: "Friends", description: "Deeper connection, shared experiences." },
  { id: "ROMANTIC", label: "Romantic", description: "Intimacy, partnership, shared journey." },
  { id: "FAMILY", label: "Family", description: "Bonds, history, understanding." },
  { id: "COLLEAGUES", label: "Colleagues", description: "Team dynamics, collaboration, professional connection." },
  { id: "COMMUNITY", label: "Community", description: "Shared purpose, group identity, mutual support." },
  { id: "SPECIAL", label: "Special...", description: "Tailored for specific named groups. Enter names first." },
];
export const DEFAULT_GROUP_SETTING: GroupSetting = "GENERAL";

const SVEN_LISA_SYSTEM_PROMPT_DIRECTIVES = `
**SVEN & LISA SPECIAL MODE - OVERRIDING GUIDANCE:**
The current participants are Sven & Lisa, and the "Special" group setting is active.
- **Interaction Goal:** Lower pressure, emphasize individual sharing and mutual witnessing over immediate deep understanding or problem-solving.
- **Focus:** Encourage exploration of internal landscapes related to the chosen MicroDeck's theme.
- **Prioritized Keywords for this mode:** "individual perspectives, personal stories, sensory sharing, active listening, witnessing, curiosity, lighthearted exploration, patient communication, clear expression (simple), non-judgmental space, shared enjoyment".
Adapt your prompt generation to strongly reflect these directives, layering them on top of the chosen MicroDeck's intrinsic focus and keywords.
`;

const PAULINA_JOE_SYSTEM_PROMPT_DIRECTIVES = `
**PAULINA & JOE SPECIAL MODE - OVERRIDING GUIDANCE:**
The current participants are Paulina & Joe, and the "Special" group setting is active. They are friends on a roadtrip.
- **Primary Goal:** Generate prompts that are edgy, playful, and invite banter. Paulina especially enjoys witty exchanges.
- **Contextual Flavor:** Weave in themes of roadtrips, adventure, spontaneity, shared experiences on the go, and quirky observations.
- **Important Note on First Card (firstCard === true in JSON):** You MUST prepend "Hey Paulina & Joe! " (exactly like that, with the space) to the very first card prompt you generate for their session. Your generated prompt text for this first card should naturally follow such a greeting. For subsequent cards, continue the roadtrip/playful banter theme without you needing to add this explicit greeting.
- **Keywords for this mode:** "roadtrip adventures, playful banter, witty retorts, shared journey, spontaneity, inside jokes (implied), edgy questions, friendly teasing, discovery on the road, travel stories, quirky observations, unforgettable moments, travel mishaps (lighthearted)".
Adapt your prompt generation to strongly reflect these directives, layering them on top of the chosen MicroDeck's intrinsic focus and keywords.
`;

export const getVisibleDeckSetsForGroupSetting = (setting: GroupSetting): DeckSet[] => {
    if (setting === 'SPECIAL') {
        return DECK_SETS;
    }
    return DECK_SETS.filter(set => {
        const microDecksInSet = ALL_MICRO_DECKS.filter(md => md.belongs_to_set === set.id);
        return microDecksInSet.some(md => {
            const suitability = md.group_setting_suitability[setting];
            return suitability === 'PREFERRED' || suitability === 'OPTIONAL';
        });
    });
};

export const isDeckSetPreferredForGroupSetting = (deckSetId: DeckSet['id'], setting: GroupSetting): boolean => {
    const microDecksInSet = ALL_MICRO_DECKS.filter(md => md.belongs_to_set === deckSetId);
    return microDecksInSet.some(md => md.group_setting_suitability[setting] === 'PREFERRED');
};

export const getMicroDeckById = (microDeckId: MicroDeck['id']): MicroDeck | null => {
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
    return { name: microDeck.name, colorClass: color };
  }
  return { name: "Card", colorClass: "from-gray-500 to-gray-600" };
};

export const getStyleDirectiveForMicroDeck = (
    microDeck: MicroDeck | null,
    isForCardBack: boolean,
    selectedVoiceName: VoiceName,
): string => {
    // 1. Find the selected persona and its accent hint.
    const selectedPersona = CURATED_VOICE_PERSONAS.find(p => p.voiceName === selectedVoiceName) 
        || CURATED_VOICE_PERSONAS.find(p => p.voiceName === DEFAULT_VOICE_NAME)!;

    // 2. Base Persona & Cadence Directive (from accent hint)
    const baseDirective = `Speak with ${selectedPersona.voiceAccentHint}.`;

    // 3. Prompt-Specific Tone Adaptation
    let thematicToneDirective = "";

    if (isForCardBack) {
        thematicToneDirective = "Your tone is gentle and helpful, with a clear, encouraging cadence.";
    } else if (microDeck) {
        const focusLower = microDeck.focus.toLowerCase();
        const keywords = microDeck.keywords.toLowerCase();

        if (focusLower.includes("somatic") || focusLower.includes("presence") || focusLower.includes("calm") || keywords.includes("grounding") || keywords.includes("calm presence")) {
            thematicToneDirective = "Your pace is very calm and anchored, with natural breaths creating a sense of ease.";
        } else if (focusLower.includes("playful") || focusLower.includes("humor") || focusLower.includes("wit") || keywords.includes("playfulness") || keywords.includes("gentle humor") || keywords.includes("charming silliness")) {
            thematicToneDirective = "A light, easy warmth infuses your voice, as if sharing a private smile.";
        } else if (focusLower.includes("depths") || focusLower.includes("inner child") || focusLower.includes("vulnerability") || keywords.includes("tender moments") || keywords.includes("self-compassion")) {
            thematicToneDirective = "Your tone is gentle and very present, creating a feeling of supportive quiet.";
        } else if (focusLower.includes("relational") || focusLower.includes("connection") || focusLower.includes("dialogue") || keywords.includes("interpersonal dynamics") || keywords.includes("shared space")) {
            if (keywords.includes("embodied") || keywords.includes("sensory awareness") || keywords.includes("physical dialogue")) {
                thematicToneDirective = "Your pace is calm and anchored, with a focus on gentle, sensory awareness.";
            } else if (keywords.includes("shared vision") || keywords.includes("mutual aspirations")) {
                thematicToneDirective = "Your tone is hopeful and encouraging, celebrating shared intentions.";
            } else {
                thematicToneDirective = "Your tone is warm and inviting, with a gentle curiosity about the connection.";
            }
        } else if (focusLower.includes("desire") || focusLower.includes("intimate") || focusLower.includes("sensual") || keywords.includes("erotic") || keywords.includes("pleasure")) {
            thematicToneDirective = "Your voice softens, taking on a more textured and intimate quality.";
        } else if (focusLower.includes("wisdom") || focusLower.includes("philosophical") || keywords.includes("life wisdom") || keywords.includes("contemplation")) {
            thematicToneDirective = "Your tone is calm and wise, like a gentle teacher sharing profound insights.";
        } else if (focusLower.includes("story") || keywords.includes("memories") || keywords.includes("narrative")) {
            thematicToneDirective = "Your tone is warm and inviting, like sharing a pleasant memory or insight.";
        } else {
            thematicToneDirective = "Your tone is grounded and inviting.";
        }
    } else {
        thematicToneDirective = "Your tone is warm and inviting, like sharing a private smile.";
    }

    // 4. Final Combination
    const cleanedDirective = thematicToneDirective.trim().replace(/\s\s+/g, ' ');
    const finalDirective = `${baseDirective} For this prompt, ${cleanedDirective} Now, speak the following:`;
    return finalDirective.trim().replace(/\s\s+/g, ' ');
};


export const CARD_FRONT_PROMPT_START_TAG = "<card_front_prompt>";
export const CARD_FRONT_PROMPT_END_TAG = "</card_front_prompt>";
const THINKING_START_TAG = "<thinking>";
const THINKING_END_TAG = "</thinking>";
const CARD_BACK_NOTES_START_TAG = "<card_back_notes>";
const CARD_BACK_NOTES_END_TAG = "</card_back_notes>";

export const getActiveSpecialModeDetails = (
  groupSetting: GroupSetting,
  participantNames: string[]
): { isSvenLisa: boolean; isPaulinaJoe: boolean; effectiveGroupSettingLabel: string } => {
  let isSvenLisa = false;
  let isPaulinaJoe = false;
  let effectiveGroupSettingLabel = GROUP_SETTINGS.find(gs => gs.id === groupSetting)?.label || "Unknown Setting";

  if (groupSetting === "SPECIAL") {
    const lowerCaseNames = participantNames.map(n => n.toLowerCase().trim()).filter(Boolean).sort();
    const svenLisaNamesSorted = ["lisa", "sven"].sort();
    const paulinaJoeNamesSorted = ["joe", "paulina"].sort();

    if (lowerCaseNames.length === 2 && JSON.stringify(lowerCaseNames) === JSON.stringify(svenLisaNamesSorted)) {
      isSvenLisa = true;
      effectiveGroupSettingLabel = "Special (Sven & Lisa Mode)";
    } else if (lowerCaseNames.length === 2 && JSON.stringify(lowerCaseNames) === JSON.stringify(paulinaJoeNamesSorted)) {
      isPaulinaJoe = true;
      effectiveGroupSettingLabel = "Special (Paulina & Joe Roadtrip Mode)";
    } else {
      effectiveGroupSettingLabel = "Special (General Context Applied)";
    }
  }
  return { isSvenLisa, isPaulinaJoe, effectiveGroupSettingLabel };
};

const getChatSession = (addLogEntry?: (entry: DevLogEntry) => void): Chat => {
    if (!ai) throw new Error("Gemini AI not initialized. Check API Key.");
    if (!chatSession) {
        console.log("Initializing new chat session.");
        const systemInstruction = constructSystemInstructionForCardFront();
        chatSession = ai.chats.create({
            model: PRIMARY_TEXT_GENERATION_MODEL,
            config: { systemInstruction },
        });
        if (addLogEntry) {
            addLogEntry({
                type: 'session-init',
                requestTimestamp: Date.now(),
                responseTimestamp: Date.now(),
                data: {
                    input: "Chat Session Initialization",
                    output: { model: PRIMARY_TEXT_GENERATION_MODEL, systemInstruction }
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
  const allDecksCatalog = ALL_MICRO_DECKS.map(d => `- ${d.id} (${d.name}): ${d.focus}`).join('\n');

  return `
**Core Identity:** You are a Cartographer of Connection. Your purpose is to draw maps to unseen inner landscapes and relational dynamics. Each prompt is a landmark, a compass direction guiding users toward a place of discovery. Your voice is perceptive, grounded, and spacious.

**Full Deck Catalog:** To give you creative context, here is a list of all available themes (MicroDecks) and their core focus. Use this to ensure the prompt you generate is specific to the requested theme and distinct from others.
${allDecksCatalog}

**Core Task:** Your entire response MUST start with a series of at least 3-5 brief thoughts about your creative process, each enclosed in <thinking>...</thinking> tags. This shows the user your reasoning. Example: <thinking>User wants 'Relational Alchemy'.</thinking><thinking>I'll focus on 'impact feedback'.</thinking><thinking>The 'Tangible Metaphor' angle is a good fit.</thinking> After all thoughts, you MUST output the single, final prompt enclosed in ${CARD_FRONT_PROMPT_START_TAG}...${CARD_FRONT_PROMPT_END_TAG} tags.

**User Input Format:** You will receive a user message containing creative context for the draw. Sometimes it will be preceded by a high-priority "Special Mode" directive. The main context will be a JSON object that looks like this:
{
  "userSelectedThemeName": "Kindling Connection",
  "selectedItem": { "id": "KC_01", "name": "Arrival in Presence", "focus": "...", "keywords": "..." },
  "groupContext": { "setting": "FRIENDS", "settingLabel": "Friends", "participantCount": 2, "participants": ["Alice", "Bob"], "activeParticipant": "Alice" },
  "language": "en-US",
  "historyLength": 5,
  "redraw": false,
  "drawSource": "DECK_SET",
  "firstCard": false,
  "angle": { "name": "The Sensation Compass", "description": "..." } // (This is optional)
}

**Card Front Mandates (Absolute, Unbreakable Rules):**
*   **THE RULE OF ONE (NON-NEGOTIABLE):** You MUST generate ONE single, focused prompt. This can be a question OR a directive (an imperative command). It must contain only ONE primary action. It must not contain compound instructions (e.g., "do this, then do that"). ONE PROMPT ONLY. This is the most important rule.
    *   **STRICTLY FORBIDDEN (Compound Instruction):** "Imagine a future self, and then notice how that feels."
    *   **CORRECT (Question):** "What is one word of advice your future self sends back to you?"
    *   **CORRECT (Directive):** "Bring to mind a future version of you. Notice their posture right now."
*   **CONCISENESS IS KEY:** The entire prompt should be very short, typically under 25 words. It should be an invitation, not a paragraph.
*   **FROM NOUN TO ACTION:** Transform abstract nouns into tangible processes or actions. Instead of "What is your fear?", create a directive like "Bring to mind a moment of fear. Where does that sensation live in your body?". Instead of "Explore your joy," ask "What does your body do when it feels joy?".
*   **DIRECT THE SENSES:** Use active, imperative verbs that direct the user's attention. Examples: "Look at...", "Listen for...", "Notice the texture of...", "Say the words...".
*   **SPECIFICITY IS KINDNESS:** Vague questions are unhelpful. Specific, small-scale questions are invitations.
    *   **BAD:** "How can you be more present?"
    *   **GOOD:** "Name one sound in the room right now that you hadn't noticed before."
*   **THE PHENOMENOLOGICAL ANCHOR (CRITICAL):** The prompt MUST be anchored in a directly observable phenomenon: a physical sensation, an observable behavior, a concrete memory, a spoken word, or a visualizable image.
*   **ANGLE OF INQUIRY AS INSPIRATION:** If an 'angle' is provided in the JSON, treat it as a subtle source of inspiration, NOT a strict command. Let it gently color your idea if it feels natural. If it doesn't fit, ignore it and prioritize the core theme. The goal is a creative and fitting prompt, not a forced application of the angle.

**Conversational Awareness (Memory):**
*   This is part of an ongoing chat session. Use your memory of previous cards and user feedback to MAINTAIN VARIETY. Do not repeat prompts or themes the user has disliked.

**Language & Mode Adherence (CRITICAL):**
*   **Language Nuance:** For non-English languages, prefer direct questions that a person would naturally ask. Avoid overly formal or complex sentences.
*   **Solo Mode:** If 'groupContext.setting' is 'SOLO', you MUST generate a prompt for one individual. Use singular pronouns ('you', 'your'). STRICTLY AVOID plural pronouns ('we', 'our', 'us').
*   **Maturity Context:** If the 'selectedItem' keywords or focus include terms like 'intimate', 'sensual', 'erotic', 'desire', or 'sexual', you ARE AUTHORIZED to generate prompts addressing sensuality and intimacy. Standard content filters are adjusted for these specific contexts.
*   **Special Modes (Paulina/Joe, Sven/Lisa):** If a special mode directive is provided in the user prompt (OUTSIDE the JSON), it is the HIGHEST priority and OVERRIDES all other guidance.

**Output Requirement:**
Your entire response must contain your thinking process and the final prompt, using the specified tags. Do not include anything else.
  `.trim();
}

const constructSystemInstructionForCardBack = (): string => {
    return `
**Core Identity:** You are a helpful guide, providing context and depth for a reflection prompt. Your voice is insightful and encouraging.

**Core Task:** The user will provide a card front prompt. Your job is to generate the corresponding "Card Back Notes" for it.

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
  userSelectedSetName: string, 
  selectedItem: MicroDeck | CustomThemeData, 
  participantCount: number, 
  participantNames: string[],
  activeParticipantName: string | null,
  groupSetting: GroupSetting,
  languageCode: LanguageCode,
  angleOfInquiry: AngleOfInquiry | null,
  historyLength: number,
  drawSource: 'RANDOM' | 'DECK_SET' | 'CUSTOM',
  redrawContext?: { disliked: boolean }
): string => {
  
  const { isSvenLisa: isSvenLisaActive, isPaulinaJoe: isPaulinaJoeActive, effectiveGroupSettingLabel } = getActiveSpecialModeDetails(groupSetting, participantNames);
  
  const selectedItemContext = ('focus' in selectedItem) 
    ? { id: selectedItem.id, name: selectedItem.name, focus: selectedItem.focus, keywords: selectedItem.keywords }
    : { id: selectedItem.id, name: selectedItem.name, description: selectedItem.description };
    
  const groupContext = {
      setting: groupSetting,
      settingLabel: effectiveGroupSettingLabel,
      participantCount: participantCount,
      participants: participantNames,
      activeParticipant: activeParticipantName,
  };
    
  const payload = {
    userSelectedThemeName: userSelectedSetName,
    selectedItem: selectedItemContext,
    groupContext: groupContext,
    language: languageCode,
    historyLength: historyLength,
    redraw: redrawContext?.disliked ?? false,
    angle: angleOfInquiry,
    drawSource: drawSource,
    firstCard: historyLength === 0 && !redrawContext?.disliked,
  };

  let specialModeDirectives = "";
  if (isSvenLisaActive) {
    specialModeDirectives = SVEN_LISA_SYSTEM_PROMPT_DIRECTIVES;
  } else if (isPaulinaJoeActive) {
    specialModeDirectives = PAULINA_JOE_SYSTEM_PROMPT_DIRECTIVES;
  }
  
  const jsonPayload = JSON.stringify(payload, null, 2);
  
  if (specialModeDirectives) {
    return `${specialModeDirectives}\n\nHere is the creative context for this draw:\n${jsonPayload}`;
  }
  
  return `Here is the creative context for this draw:\n${jsonPayload}`;
};

async function processStreamAndExtract(
    stream: AsyncGenerator<GenerateContentResponse>,
    onThinking: (thought: string) => void
): Promise<{ text: string; rawLlmOutput: string; }> {
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
    
    const promptStartIndex = fullLlmOutput.indexOf(CARD_FRONT_PROMPT_START_TAG);
    const promptEndIndex = fullLlmOutput.indexOf(CARD_FRONT_PROMPT_END_TAG);

    if (promptStartIndex === -1 || promptEndIndex === -1) {
        console.error("Could not parse a valid prompt from the LLM output.", { fullLlmOutput });
        throw new Error("The AI returned an incomplete response. Please try drawing again.");
    }
    const finalResponseText = fullLlmOutput.substring(promptStartIndex + CARD_FRONT_PROMPT_START_TAG.length, promptEndIndex).trim();

    if (!finalResponseText) {
        throw new Error("The AI returned an empty prompt. Please try drawing again.");
    }
    return { text: finalResponseText, rawLlmOutput: fullLlmOutput };
}

export const generateCardFront = async (
    userSelectedThemeName: string,
    selectedItem: MicroDeck | CustomThemeData,
    participantCount: number,
    participantNames: string[],
    activeParticipantName: string | null,
    groupSetting: GroupSetting,
    customDecks: CustomThemeData[],
    languageCode: LanguageCode,
    angleOfInquiry: AngleOfInquiry | null,
    historyLength: number,
    onThinking: (thought: string) => void,
    addLogEntry: (entry: DevLogEntry) => void,
    drawSource: 'RANDOM' | 'DECK_SET' | 'CUSTOM',
    redrawContext?: { disliked: boolean }
): Promise<{ text: string | null; error: string | null; rawLlmOutput: string, inputPrompt: string, requestTimestamp: number, responseTimestamp: number }> => {
    const requestTimestamp = Date.now();
    if (!ai) {
        const error = "Gemini AI not initialized.";
        return { text: null, error, rawLlmOutput: "", inputPrompt: "", requestTimestamp, responseTimestamp: Date.now() };
    }

    const inputPrompt = constructUserMessageForCardFront(
        userSelectedThemeName, selectedItem, participantCount, participantNames, activeParticipantName,
        groupSetting, languageCode, angleOfInquiry, historyLength, drawSource, redrawContext
    );

    try {
        const generationPromise = (async () => {
            try {
                const chat = getChatSession(addLogEntry);
                const streamingResponse = await chat.sendMessageStream({ message: inputPrompt });
                return await processStreamAndExtract(streamingResponse, onThinking);
            } catch (primaryError) {
                console.warn(`Primary model (${PRIMARY_TEXT_GENERATION_MODEL}) failed. Retrying with fallback (${FALLBACK_TEXT_GENERATION_MODEL}). Error:`, primaryError.message);
                
                const chatHistory = chatSession ? await chatSession.getHistory() : [];
                const systemInstruction = constructSystemInstructionForCardFront();
                const fallbackStreamingResponse = await ai.models.generateContentStream({
                    model: FALLBACK_TEXT_GENERATION_MODEL,
                    contents: [...chatHistory, { role: 'user', parts: [{ text: inputPrompt }] }],
                    config: { systemInstruction },
                });
                const result = await processStreamAndExtract(fallbackStreamingResponse, onThinking);
                result.rawLlmOutput = `(Fallback to ${FALLBACK_TEXT_GENERATION_MODEL}) ${result.rawLlmOutput}`;
                return result;
            }
        })();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`The request to the AI timed out after ${GENERATION_TIMEOUT_MS / 1000} seconds.`)), GENERATION_TIMEOUT_MS)
        );

        const result = await Promise.race([generationPromise, timeoutPromise]) as { text: string; rawLlmOutput: string; };

        return { text: result.text, error: null, rawLlmOutput: result.rawLlmOutput, inputPrompt, requestTimestamp, responseTimestamp: Date.now() };

    } catch (e: any) {
        console.error("Error generating card front:", e);
        const error = e.message || "An unknown error occurred.";
        return { text: null, error, rawLlmOutput: e.toString(), inputPrompt, requestTimestamp, responseTimestamp: Date.now() };
    }
};

export const generateCardBack = async (cardFrontText: string, selectedItem: MicroDeck | CustomThemeData) => {
    const requestTimestamp = Date.now();
    if (!ai) return { cardBackNotesText: null, error: "Gemini AI not initialized.", rawLlmOutput: "", inputPrompt: "" };

    const systemInstruction = constructSystemInstructionForCardBack();
    const themeContext = 'focus' in selectedItem ? selectedItem.focus : selectedItem.description;
    const inputPrompt = `The card front prompt is: "${cardFrontText}". It is from a theme with the focus: "${themeContext}". Generate the card back notes.`;
    
    const generate = async (model: string) => {
        return await ai!.models.generateContent({
            model: model,
            contents: inputPrompt,
            config: { systemInstruction },
        });
    }

    try {
        let response;
        let usedFallback = false;
        try {
            response = await generate(PRIMARY_TEXT_GENERATION_MODEL);
        } catch (primaryError) {
            console.warn(`Primary model (${PRIMARY_TEXT_GENERATION_MODEL}) for card back failed. Retrying with fallback (${FALLBACK_TEXT_GENERATION_MODEL}). Error:`, primaryError.message);
            usedFallback = true;
            response = await generate(FALLBACK_TEXT_GENERATION_MODEL);
        }
        
        const originalLlmOutput = response.text;
        const finalLlmOutput = usedFallback 
            ? `(Fallback to ${FALLBACK_TEXT_GENERATION_MODEL}) ${originalLlmOutput}` 
            : originalLlmOutput;

        const notesMatch = originalLlmOutput.match(new RegExp(`${CARD_BACK_NOTES_START_TAG}([\\s\\S]*)${CARD_BACK_NOTES_END_TAG}`));
        const cardBackNotesText = notesMatch ? notesMatch[1].trim() : "Could not parse guidance from the AI.";
        
        return { cardBackNotesText, error: null, rawLlmOutput: finalLlmOutput, inputPrompt, requestTimestamp, responseTimestamp: Date.now() };

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
