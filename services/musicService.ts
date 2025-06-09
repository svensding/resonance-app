

import { GoogleGenAI } from "@google/genai";
import type { 
    LiveMusicSession, WeightedPrompt, LiveMusicGenerationConfig, LiveMusicServerMessage, 
    Scale as GenAIScale, LiveMusicSetConfigParameters, LiveMusicFilteredPrompt, SafetyRating 
} from "@google/genai"; 

export type { WeightedPrompt, LiveMusicGenerationConfig };
export { GenAIScale as Scale }; // Re-export Scale for use in App.tsx

const LYRIA_MODEL_NAME = 'models/lyria-realtime-exp';
const TARGET_SAMPLE_RATE = 48000; 
const NUM_CHANNELS = 2; 

export type MusicSessionState = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'PLAY_REQUESTED'
  | 'PLAYING' 
  | 'PAUSED' 
  | 'STOPPED' 
  | 'LOADING_BUFFER' 
  | 'ERROR';

const decodeBase64Audio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const BASE_MUSIC_PROMPTS_INTERNAL: WeightedPrompt[] = [
    { text: "ambient, calm, ethereal, spacious, generative music, slow, meditative, peaceful, background, soundscape", weight: 0.85 } 
];
const BASE_MUSIC_CONFIG_INTERNAL: LiveMusicGenerationConfig = { 
    bpm: 70, 
    density: 0.25, 
    brightness: 0.45, 
    guidance: 3.5, 
    temperature: 1.1,
    scale: undefined, 
    muteBass: false,
    muteDrums: false,
    onlyBassAndDrums: false,
};


export class MusicService {
    private apiKeyInternal: string | null; 
    private aiClient: GoogleGenAI | null = null; 
    private session: LiveMusicSession | null = null;
    private audioContext: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private audioQueue: AudioBuffer[] = [];
    private nextPlayTime: number = 0;
    private isPlayingAudio: boolean = false; 
    
    private readonly MAX_QUEUE_DURATION_SEC = 5; 
    private readonly MIN_BUFFER_BEFORE_PLAY_SEC = 0.5; 

    private onStateChange: (state: MusicSessionState) => void;
    private onError: (error: string) => void;

    private internalState: MusicSessionState = 'DISCONNECTED';
    
    private currentBasePrompts: WeightedPrompt[] = [...BASE_MUSIC_PROMPTS_INTERNAL.map(p => ({...p}))];
    private activeLayerPrompts: WeightedPrompt[] = [];
    private currentConfig: LiveMusicGenerationConfig = {...BASE_MUSIC_CONFIG_INTERNAL};
    
    private transitionIntervalId: number | null = null;
    private readonly TRANSITION_DURATION_MS = 6000;
    private readonly TRANSITION_INTERVAL_MS = 250; 


    constructor(
        apiKeyParam: string, 
        onStateChange: (state: MusicSessionState) => void,
        onError: (error: string) => void
    ) {
        this.apiKeyInternal = apiKeyParam; 
        this.onStateChange = onStateChange;
        this.onError = onError;

        if (!this.apiKeyInternal) {
            this.onError("API Key not provided for MusicService initialization.");
            this.setState('ERROR');
            return;
        }
        try {
            this.aiClient = new GoogleGenAI({ apiKey: this.apiKeyInternal, httpOptions: { apiVersion: 'v1alpha'} });
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI for MusicService:", error);
            this.onError("Failed to initialize AI Client for Music.");
            this.setState('ERROR');
            return;
        }
        this.initAudioContext();
    }

    private setState(state: MusicSessionState) {
        if (this.internalState === state) return;
        console.log(`MusicService: State change from ${this.internalState} to ${state}`);
        this.internalState = state;
        this.onStateChange(state); 
    }

    private initAudioContext() {
        if (typeof window !== 'undefined' && !this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: TARGET_SAMPLE_RATE });
                this.gainNode = this.audioContext.createGain();
                // Default volume, App.tsx will typically override this with user's preference.
                this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime); 
                this.gainNode.connect(this.audioContext.destination);
            } catch (e) {
                console.error("Failed to initialize AudioContext for music:", e);
                this.onError("AudioContext for music not supported or failed to initialize.");
                this.setState('ERROR');
            }
        }
    }

    private async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log("MusicService: AudioContext resumed.");
            } catch (e) {
                console.error("Could not resume audio context for music", e);
                this.onError("Failed to resume audio context.");
                this.setState('ERROR');
            }
        }
    }
    
    async connect() {
        if (!this.aiClient || !this.apiKeyInternal) { 
            this.onError("Gemini AI client or API Key not properly initialized for music service.");
            this.setState('ERROR');
            return;
        }
        if (this.session || this.internalState === 'CONNECTING' || this.internalState === 'CONNECTED' || this.internalState === 'PLAYING') {
            console.log("MusicService: Session already active or connecting/playing.");
            return;
        }

        await this.resumeAudioContext();
        if (this.internalState === 'ERROR' && this.audioContext?.state !== 'running') return; 

        this.setState('CONNECTING');
        console.log("MusicService: Attempting to connect to Lyria...");

        try {
            this.session = await this.aiClient.live.music.connect({
                model: LYRIA_MODEL_NAME,
                callbacks: {
                    onmessage: (msg: LiveMusicServerMessage) => this.handleServerMessage(msg),
                    onerror: (err: ErrorEvent) => this.handleServerError(err),
                    onclose: (closeEvent: CloseEvent) => this.handleServerClose(closeEvent),
                },
            });
        } catch (e: any) {
            console.error("MusicService: Failed to initiate Lyria connection:", e);
            this.onError(`Failed to connect to music service: ${e.message}`);
            this.setState('ERROR');
            this.session = null;
        }
    }

    private handleServerMessage(message: LiveMusicServerMessage) {
        if (message.setupComplete) {
            console.log("MusicService: Lyria setup complete. Connection established.");
            this.setState('CONNECTED');
        }

        // Handle prompt filtering information if available
        // message.promptFeedback is not available on LiveMusicServerMessage in the current SDK version.
        // We can only rely on message.filteredPrompt if it exists.
        if (message.filteredPrompt) {
            const filteredPromptText = message.filteredPrompt.text;
            const warningMessage = `MusicService: Lyria prompt was filtered. Text (approx.): "${filteredPromptText.substring(0, 50)}...". Detailed block/safety reasons via a 'promptFeedback' object are not available in the current message structure.`;
            const userFacingError = `A music prompt (starting with "${filteredPromptText.substring(0, 30)}...") was modified by the service.`;
            
            console.warn(warningMessage);
            this.onError(userFacingError);
        }
        
        const audioDataString = message.audioChunk?.data;
        if (typeof audioDataString === 'string') {
            const pcm16Data = decodeBase64Audio(audioDataString);
            this.processAudioChunk(pcm16Data);
        }
    }
    
    private handleServerError(error: ErrorEvent) {
        console.error("MusicService: Error from Lyria session:", error.message || error);
        this.onError(`Music service connection error: ${error.message || 'Unknown error'}`);
        this.setState('ERROR');
        if (this.session) {
            this.session.close(); 
            this.session = null;
        }
    }

    private handleServerClose(closeEvent: CloseEvent) {
        console.log(`MusicService: Lyria session closed. Code: ${closeEvent.code}, Reason: "${closeEvent.reason}", WasClean: ${closeEvent.wasClean}`);
        if (!closeEvent.wasClean && this.internalState !== 'DISCONNECTED' && this.internalState !== 'STOPPED') { 
            this.onError("Music service connection closed unexpectedly.");
            this.setState('ERROR');
        } else if (this.internalState !== 'DISCONNECTED' && this.internalState !== 'STOPPED') { 
             this.setState('STOPPED'); 
        }
        this.session = null; 
        this.isPlayingAudio = false;
        this.audioQueue = [];
        this.nextPlayTime = 0;
        if (this.transitionIntervalId) {
            clearInterval(this.transitionIntervalId);
            this.transitionIntervalId = null;
        }
    }


    private async processAudioChunk(pcm16Data: Uint8Array) {
        if (!this.audioContext || pcm16Data.length === 0) return;

        const numSamples = pcm16Data.byteLength / (NUM_CHANNELS * 2); 
        const audioBuffer = this.audioContext.createBuffer(NUM_CHANNELS, numSamples, TARGET_SAMPLE_RATE);
        
        const int16View = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);

        for (let channel = 0; channel < NUM_CHANNELS; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < numSamples; i++) {
                channelData[i] = int16View[i * NUM_CHANNELS + channel] / 32768.0; 
            }
        }
        
        this.audioQueue.push(audioBuffer);

        if (this.internalState === 'PLAYING' || this.internalState === 'LOADING_BUFFER' || this.internalState === 'PLAY_REQUESTED') {
            this.schedulePlayback();
        }
    }
    
    private getBufferedDuration(): number {
        return this.audioQueue.reduce((total, buffer) => total + buffer.duration, 0);
    }

    private schedulePlayback() {
        if (!this.audioContext || !this.gainNode || !this.isPlayingAudio) return;

        while (this.audioQueue.length > 0) {
            const bufferedDuration = this.getBufferedDuration();
            if (this.internalState === 'LOADING_BUFFER' && bufferedDuration < this.MIN_BUFFER_BEFORE_PLAY_SEC) {
                return; 
            }
            if (this.internalState === 'LOADING_BUFFER' && bufferedDuration >= this.MIN_BUFFER_BEFORE_PLAY_SEC) {
                this.setState('PLAYING'); 
                this.nextPlayTime = this.audioContext.currentTime; 
            }
            if (this.audioContext.currentTime < this.nextPlayTime && this.audioQueue.length === 0) { 
                 break; 
            } 

            const bufferToPlay = this.audioQueue.shift();
            if (!bufferToPlay) break;

            const source = this.audioContext.createBufferSource();
            source.buffer = bufferToPlay;
            source.connect(this.gainNode);

            const playAt = Math.max(this.audioContext.currentTime, this.nextPlayTime);
            source.start(playAt);
            this.nextPlayTime = playAt + bufferToPlay.duration;
            
            while (this.getBufferedDuration() > this.MAX_QUEUE_DURATION_SEC && this.audioQueue.length > 1) {
                this.audioQueue.shift(); 
            }
        } 
    }

    async playMusic() {
        await this.resumeAudioContext();
        if (!this.session || this.internalState === 'ERROR' || !this.audioContext || this.audioContext.state !== 'running') {
            console.warn("MusicService: No active session, session in error, or audio context not running. Cannot play.");
            this.onError("Cannot play music: Session not ready or audio context issue.");
            if (this.internalState !== 'ERROR') this.setState('ERROR');
            return;
        }

        if (this.internalState === 'PLAYING') {
            console.log("MusicService: Music already playing.");
            return;
        }
        
        this.setState('PLAY_REQUESTED');

        try {
            this.currentConfig = { ...BASE_MUSIC_CONFIG_INTERNAL };
            this.activeLayerPrompts = []; 

            await this.session.setWeightedPrompts({ weightedPrompts: [...this.currentBasePrompts] });
            await this.session.setMusicGenerationConfig({ musicGenerationConfig: this.currentConfig });
            if (this.currentConfig.bpm !== undefined || this.currentConfig.scale !== undefined) {
                 await this.session.resetContext(); 
            }
            
            await this.session.play();
            this.isPlayingAudio = true;
            this.setState('LOADING_BUFFER');
            this.nextPlayTime = this.audioContext.currentTime + this.MIN_BUFFER_BEFORE_PLAY_SEC; 
            this.schedulePlayback(); 
            console.log("MusicService: Play command sent with base theme. Prompts:", this.currentBasePrompts, "Config:", this.currentConfig);

        } catch (e: any) {
            console.error("MusicService: Error during playMusic setup:", e);
            this.onError(`Error starting music: ${e.message}`);
            this.setState('ERROR');
            this.isPlayingAudio = false;
        }
    }

    async pauseMusic() {
        if (!this.session || (this.internalState !== 'PLAYING' && this.internalState !== 'LOADING_BUFFER')) {
            console.warn("MusicService: No active playing session to pause.");
            return;
        }
        try {
            await this.session.pause();
            this.isPlayingAudio = false;
            this.setState('PAUSED');
            console.log("MusicService: Music paused.");
        } catch (e: any) {
            console.error("MusicService: Error pausing music:", e);
            this.onError(`Error pausing music: ${e.message}`);
            this.setState('ERROR');
        }
    }

    async stopMusic() {
        if (!this.session) {
            console.warn("MusicService: No active session to stop.");
            return;
        }
        if (this.transitionIntervalId) {
            clearInterval(this.transitionIntervalId);
            this.transitionIntervalId = null;
        }
        try {
            await this.session.stop();
            this.isPlayingAudio = false;
            this.audioQueue = [];
            this.nextPlayTime = 0;
            this.setState('STOPPED');
            console.log("MusicService: Music stopped.");
        } catch (e: any) {
            console.error("MusicService: Error stopping music:", e);
            this.onError(`Error stopping music: ${e.message}`);
            this.setState('ERROR');
        }
    }

    async steerMusic(newLayerPrompts: WeightedPrompt[], layerConfigChanges?: Partial<LiveMusicGenerationConfig>) {
        if (!this.session || (this.internalState !== 'PLAYING' && this.internalState !== 'LOADING_BUFFER' && this.internalState !== 'PAUSED' && this.internalState !== 'CONNECTED' && this.internalState !== 'PLAY_REQUESTED')) {
            console.warn("MusicService: No active session or session not in a state to be steered. Current state:", this.internalState);
            this.onError("Cannot steer music: Session not in a steerable state.");
            return;
        }

        if (this.transitionIntervalId) {
            clearInterval(this.transitionIntervalId);
            this.transitionIntervalId = null;
        }

        const oldLayerPrompts = [...this.activeLayerPrompts];
        const uniqueNewLayerPrompts = newLayerPrompts.filter(nlp => 
            !this.currentBasePrompts.some(bp => bp.text === nlp.text)
        );
        
        const finalTargetConfig = { ...BASE_MUSIC_CONFIG_INTERNAL, ...this.currentConfig, ...layerConfigChanges };
        
        const configChangedDrastically = 
            (finalTargetConfig.bpm !== undefined && finalTargetConfig.bpm !== this.currentConfig.bpm) ||
            (finalTargetConfig.scale !== undefined && finalTargetConfig.scale !== this.currentConfig.scale);

        if (configChangedDrastically) {
            try {
                await this.session.setMusicGenerationConfig({ musicGenerationConfig: finalTargetConfig });
                this.currentConfig = { ...finalTargetConfig };
                await this.session.resetContext();
                console.log("MusicService: Drastic config (BPM/Scale) updated, context reset:", this.currentConfig);
            } catch (e:any) {
                console.error("MusicService: Error applying drastic config update:", e);
                this.onError(`Error setting drastic music config: ${e.message}`);
            }
        } else {
            const significantNonDrasticChange = Object.keys(layerConfigChanges || {}).some(key =>
                (layerConfigChanges as any)[key] !== (this.currentConfig as any)[key] && key !== 'bpm' && key !== 'scale'
            );
            if (significantNonDrasticChange) {
                 try {
                    await this.session.setMusicGenerationConfig({ musicGenerationConfig: finalTargetConfig });
                    this.currentConfig = { ...finalTargetConfig };
                    console.log("MusicService: Non-drastic config updated:", this.currentConfig);
                } catch (e:any) {
                    console.error("MusicService: Error applying non-drastic config update:", e);
                     this.onError(`Error setting music config: ${e.message}`);
                }
            }
        }
        
        let step = 0;
        const numSteps = this.TRANSITION_DURATION_MS / this.TRANSITION_INTERVAL_MS;

        this.transitionIntervalId = window.setInterval(async () => {
            if (!this.session || this.internalState === 'ERROR' || this.internalState === 'DISCONNECTED' || this.internalState === 'STOPPED') {
                if(this.transitionIntervalId) clearInterval(this.transitionIntervalId);
                this.transitionIntervalId = null;
                return;
            }
            step++;
            const progress = Math.min(step / numSteps, 1.0);

            const interpolatedPrompts: WeightedPrompt[] = [...this.currentBasePrompts.map(p => ({...p}))];

            oldLayerPrompts.forEach(oldP => {
                if (!uniqueNewLayerPrompts.some(newP => newP.text === oldP.text)) {
                    const newWeight = oldP.weight * (1 - progress);
                    if (newWeight > 0.05) {
                        interpolatedPrompts.push({ text: oldP.text, weight: newWeight });
                    }
                }
            });

            uniqueNewLayerPrompts.forEach(newP => {
                const oldVersion = oldLayerPrompts.find(oldP => oldP.text === newP.text);
                const startWeight = oldVersion ? oldVersion.weight : 0;
                const targetWeight = newP.weight;
                const newWeight = startWeight * (1 - progress) + targetWeight * progress;
                if (newWeight > 0.05) {
                     interpolatedPrompts.push({ text: newP.text, weight: newWeight });
                }
            });
            
            try {
                if (interpolatedPrompts.length > 0) {
                     await this.session.setWeightedPrompts({ weightedPrompts: interpolatedPrompts });
                } else {
                    console.warn("MusicService: Interpolated prompts became empty during transition. Sending base only.");
                    await this.session.setWeightedPrompts({ weightedPrompts: [...this.currentBasePrompts] });
                }

                if (progress === 1) { 
                    if(this.transitionIntervalId) clearInterval(this.transitionIntervalId);
                    this.transitionIntervalId = null;
                    this.activeLayerPrompts = uniqueNewLayerPrompts.filter(p => p.weight > 0.05); 
                    console.log("MusicService: Transition complete. Active layers:", this.activeLayerPrompts);
                }
            } catch (e: any) {
                console.error("MusicService: Error during transition step:", e);
                if(this.transitionIntervalId) clearInterval(this.transitionIntervalId);
                this.transitionIntervalId = null;
                this.onError(`Error during music transition: ${e.message}`);
            }
        }, this.TRANSITION_INTERVAL_MS);
    }
    
    async disconnect() {
        console.log("MusicService: Disconnecting...");
        if (this.transitionIntervalId) {
            clearInterval(this.transitionIntervalId);
            this.transitionIntervalId = null;
        }
        if (this.session) {
            try {
                await this.stopMusic(); 
                this.session.close(); 
                console.log("MusicService: Lyria session closed successfully.");
            } catch (e: any) {
                console.error("MusicService: Error during session close:", e);
            } finally {
                this.session = null;
            }
        }
        this.isPlayingAudio = false;
        this.audioQueue = [];
        this.nextPlayTime = 0;
        this.setState('DISCONNECTED');
    }

    setVolume(volume: number) { 
        if (this.gainNode && this.audioContext) {
            const clampedVolume = Math.max(0, Math.min(1, volume));
            this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            console.log("MusicService: Volume set to", clampedVolume);
        }
    }

    public getActiveLayerPrompts(): WeightedPrompt[] {
        return this.activeLayerPrompts;
    }

    public getCurrentInternalState(): MusicSessionState { // Added for debugging or specific checks if absolutely needed, prefer onStateChange
        return this.internalState;
    }
}
