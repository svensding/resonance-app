
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voices: SpeechSynthesisVoice[] = [];

const getAudioContext = (): AudioContext | null => {
  if (!audioContext && typeof window !== 'undefined') {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.", e);
      return null;
    }
  }
  return audioContext;
};

// Function to populate voices. Must be called, possibly after onvoiceschanged.
const populateVoiceList = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices();
    if (voices.length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
        // Fallback for browsers that load voices asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
        };
    }
  }
};

// Call it once to initially attempt to populate
if (typeof window !== 'undefined' && window.speechSynthesis) {
    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
}


const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

interface AudioParams {
  sampleRate: number;
  bitsPerSample: number;
  numChannels: number;
  isRawPcm: boolean;
}

const parseAudioMimeType = (mimeType: string): AudioParams => {
  let sampleRate = 24000; 
  let bitsPerSample = 16;  
  const numChannels = 1;     
  let isRawPcm = false;

  const parts = mimeType.toLowerCase().split(';');
  const mainType = parts[0].trim();

  if (mainType.startsWith('audio/l')) {
    isRawPcm = true;
    const bitsMatch = mainType.match(/audio\/l(\d+)/);
    if (bitsMatch && bitsMatch[1]) {
      bitsPerSample = parseInt(bitsMatch[1], 10);
    }
  }

  for (let i = 1; i < parts.length; i++) {
    const param = parts[i].trim();
    if (param.startsWith('rate=')) {
      const rateMatch = param.match(/rate=(\d+)/);
      if (rateMatch && rateMatch[1]) {
        sampleRate = parseInt(rateMatch[1], 10);
      }
    }
  }

  console.log(`Parsed audio MIME type "${mimeType}":`, { sampleRate, bitsPerSample, numChannels, isRawPcm });
  return { sampleRate, bitsPerSample, numChannels, isRawPcm };
};

const createWavArrayBuffer = (audioData: ArrayBuffer, params: Omit<AudioParams, 'isRawPcm'>): ArrayBuffer => {
  const { sampleRate, bitsPerSample, numChannels } = params;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.byteLength;

  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); 
  view.setUint32(4, 36 + dataSize, true); 
  view.setUint32(8, 0x57415645, false); 

  view.setUint32(12, 0x666d7420, false); 
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, byteRate, true); 
  view.setUint16(32, blockAlign, true); 
  view.setUint16(34, bitsPerSample, true); 

  view.setUint32(36, 0x64617461, false); 
  view.setUint32(40, dataSize, true); 

  const audioBytes = new Uint8Array(audioData);
  for (let i = 0; i < dataSize; i++) {
    view.setUint8(headerSize + i, audioBytes[i]);
  }

  return buffer;
};

// This function is for playing pre-generated audio data (e.g., from a file or different API)
export const playAudioData = async (base64Audio: string, mimeType: string, isMuted: boolean = false): Promise<void> => {
  if (isMuted) {
    console.log("Audio is muted. Skipping playback.");
    stopSpeechServicePlayback(); // Ensure any previously playing audio/speech is stopped.
    return;
  }

  const context = getAudioContext();
  if (!context) {
    console.warn("AudioContext not available. Cannot play audio.");
    return;
  }

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch (e) {
      console.error("Failed to resume AudioContext:", e);
      return;
    }
  }
  
  stopSpeechServicePlayback(); 

  try {
    let audioBufferToDecode: ArrayBuffer = base64ToArrayBuffer(base64Audio);
    const audioParams = parseAudioMimeType(mimeType);

    if (audioParams.isRawPcm) {
      console.log("Raw PCM detected, creating WAV header.");
      audioBufferToDecode = createWavArrayBuffer(audioBufferToDecode, audioParams);
    } else {
      console.log("Assuming pre-formatted audio, attempting direct decode for MIME:", mimeType);
    }
    
    const audioBuffer = await context.decodeAudioData(audioBufferToDecode);

    currentSource = context.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(context.destination);
    currentSource.start();
    
    currentSource.onended = () => {
      if (currentSource) {
        currentSource.disconnect();
      }
      currentSource = null;
    };
  } catch (error) {
    console.error("Error playing audio data:", error);
    if (error instanceof DOMException && error.name === 'EncodingError') {
        console.error("Failed to decode audio data. This might be due to an unsupported format or corrupted data. MIME Type provided:", mimeType);
    }
    if (currentSource) {
        try { currentSource.disconnect(); } catch(e) {}
        currentSource = null;
    }
  }
};


export const speakText = (
    text: string, 
    languageCode: string, // e.g., 'en-US'
    isMuted: boolean = false
): void => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn("Speech Synthesis not supported in this browser.");
        return;
    }

    if (isMuted) {
        console.log("Speech is muted. Skipping TTS playback.");
        stopSpeechServicePlayback(); // Ensure any previously playing speech/audio is stopped.
        return;
    }

    stopSpeechServicePlayback(); // Stop any ongoing speech or audio

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;

    if (voices.length > 0) {
        const langSpecificVoices = voices.filter(voice => voice.lang === languageCode);
        if (langSpecificVoices.length > 0) {
            utterance.voice = langSpecificVoices[0]; // Use the first available voice for the language
        } else {
            // Fallback to a voice that might support the language broadly (e.g., 'en' for 'en-US')
            const broaderLangMatch = languageCode.split('-')[0];
            const broaderVoices = voices.filter(voice => voice.lang.startsWith(broaderLangMatch));
            if (broaderVoices.length > 0) {
                utterance.voice = broaderVoices[0];
            }
            // If still no match, browser will use its default.
        }
    }
     // If voices array is empty or no match, browser uses its default voice for the lang.

    utterance.onend = () => {
        currentUtterance = null;
    };
    utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance.onerror:", event);
        currentUtterance = null;
    };
    
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
};

export const cancelSpeech = (): void => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
};

const cancelLegacyAudio = (): void => {
  if (currentSource) {
    try {
      currentSource.stop(); 
    } catch (e) {
      // This can throw if already stopped or not started.
    } finally {
      try { currentSource.disconnect(); } catch(discErr) {}
      currentSource = null;
    }
  }
};

export const stopSpeechServicePlayback = (): void => {
  cancelLegacyAudio();
  cancelSpeech();
};
