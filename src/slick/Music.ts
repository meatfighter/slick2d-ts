import type { MusicListener } from "./MusicListener.js";
import { copyMusicPlaybackSnapshot, type MusicPlaybackSnapshot, type MusicTransportState } from "./MusicPlaybackState.js";
import { SlickException } from "./SlickException.js";
import { type AudioPlaybackHandle, SoundStore } from "./openal/SoundStore.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type FadeState = {
    duration: number;
    elapsed: number;
    startVolume: number;
    endVolume: number;
    stopAfterFade: boolean;
};

/** Java Slick2D Music, with logical transport independent of disposable Web Audio nodes. */
export class Music {
    private static currentMusic: Music | null = null;
    private readonly ref: string;
    private readonly readyPromise: Promise<void>;
    private readonly listeners: MusicListener[] = [];
    private source: AudioBufferSourceNode | null = null;
    private sourceContext: AudioContext | null = null;
    private gain: GainNode | null = null;
    private buffer: AudioBuffer | null = null;
    private volume = 1;
    private fadeState: FadeState | null = null;
    private looped = false;
    private playbackRate = 1;
    private positionOffset = 0;
    private startedAt = 0;
    private paused = false;
    private playingFlag = false;
    private globallySuspended = false;
    private generationDetached = false;
    private stopRequested = false;
    private endPending = false;
    private startToken = 0;
    private handle: AudioPlaybackHandle | null = null;

    public constructor(ref: string);
    public constructor(ref: string, streamingHint: boolean);
    public constructor(url: URL);
    public constructor(url: URL, streamingHint: boolean);
    public constructor(input: ArrayBuffer | Blob, ref: string);
    public constructor(refOrUrlOrInput: string | URL | ArrayBuffer | Blob, streamingOrRef?: boolean | string) {
        let preparation: Promise<void>;
        if (typeof refOrUrlOrInput === "string" || refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
            preparation = SoundStore.get().preloadAudioBuffer(this.ref);
        } else {
            this.ref = typeof streamingOrRef === "string" ? streamingOrRef : "music";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
                preparation = SoundStore.get().preloadAudioBuffer(this.ref);
            } else {
                preparation = ResourceLoader.track(
                    refOrUrlOrInput.arrayBuffer().then((bytes) => {
                        ResourceLoader.registerResource(this.ref, bytes);
                        return SoundStore.get().preloadAudioBuffer(this.ref);
                    }),
                    this.ref
                );
            }
        }
        this.buffer = SoundStore.get().getDecodedAudioBuffer(this.ref);
        this.readyPromise = preparation.then(() => {
            this.buffer = SoundStore.get().getDecodedAudioBuffer(this.ref);
        });
        void this.readyPromise.catch(() => undefined);
    }

    /** Only the accepted gameplay clock advances transport, fades, and completion delivery. */
    public static poll(delta: number): void {
        const store = SoundStore.get();
        if (store.isUsingExplicitPlaybackGenerations() && !store.isLogicalPlaybackActive()) {
            return;
        }
        const current = Music.currentMusic;
        if (current === null) {
            return;
        }
        store.poll(delta);
        if (current.endPending) {
            Music.currentMusic = null;
            current.finishEnded();
            return;
        }
        current.poll(delta);
    }

    public static resetPlaybackState(): void {
        const current = Music.currentMusic;
        Music.currentMusic = null;
        current?.resetLogicalState();
    }

    public ready(): Promise<void> {
        return this.readyPromise;
    }

    public load(): Promise<void> {
        return this.ready();
    }

    public addListener(listener: MusicListener): void {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    public removeListener(listener: MusicListener): void {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }

    public play(): void;
    public play(pitch: number, volume: number): void;
    public play(pitch = 1, volume = 1): void {
        this.start(false, pitch, volume);
    }

    public loop(): void;
    public loop(pitch: number, volume: number): void;
    public loop(pitch = 1, volume = 1): void {
        this.start(true, pitch, volume);
    }

    public pause(): void {
        if (this.endPending || Music.currentMusic !== this || !this.playingFlag) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        this.stopSource(true, true);
        this.paused = true;
        this.playingFlag = false;
        this.generationDetached = true;
    }

    public stop(): void {
        this.startToken++;
        this.stopSource(true);
        this.positionOffset = 0;
        this.paused = false;
        this.playingFlag = false;
        this.globallySuspended = false;
        this.generationDetached = false;
        this.fadeState = null;
        this.endPending = Music.currentMusic === this;
    }

    public resume(): void {
        if (this.endPending || Music.currentMusic !== this) {
            return;
        }
        if (this.paused) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset, false);
        } else if (SoundStore.get().musicOn() && (this.globallySuspended || this.generationDetached)) {
            this.resumeForMusicOn();
        }
    }

    public playing(): boolean {
        return Music.currentMusic === this && this.playingFlag;
    }

    public getTransportState(): MusicTransportState {
        if (Music.currentMusic !== this) {
            return "stopped";
        }
        if (this.endPending) {
            return "ended-pending";
        }
        return this.paused ? "paused" : this.playingFlag ? "playing" : "stopped";
    }

    public isCompletionPending(): boolean {
        return this.getTransportState() === "ended-pending";
    }

    /** A detached graph or an explicit pause must not make a Song advance to its next part. */
    public isTransportActive(): boolean {
        const state = this.getTransportState();
        return state === "playing" || state === "paused";
    }

    public setVolume(volume: number): void {
        this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
        if (this.gain !== null) {
            this.gain.gain.value = this.volume;
        }
    }

    public getVolume(): number {
        return this.volume;
    }

    public isLooped(): boolean {
        return this.looped;
    }

    public isPaused(): boolean {
        return Music.currentMusic === this && this.paused;
    }

    public getPlaybackRate(): number {
        return this.playbackRate;
    }

    public getDuration(): number | null {
        const duration = this.buffer?.duration;
        return typeof duration === "number" && Number.isFinite(duration) && duration >= 0 ? duration : null;
    }

    public setPosition(position: number): boolean {
        this.positionOffset = this.buffer === null ? this.sanitizeOffset(position) : this.normalizeOffset(this.buffer, position, this.looped);
        if (this.source !== null) {
            this.startToken++;
            this.stopSource(true, true);
            this.generationDetached = true;
            this.requestAttach();
        }
        return true;
    }

    public getPosition(): number {
        // The source's clock belongs to its own generation, never a replacement singleton context.
        const context = this.sourceContext;
        if (context === null || this.source === null) {
            return this.positionOffset;
        }
        const position = this.positionOffset + Math.max(0, context.currentTime - this.startedAt) * this.playbackRate;
        return this.buffer === null ? this.sanitizeOffset(position) : this.normalizeOffset(this.buffer, position, this.looped);
    }

    public fade(duration: number, endVolume: number, stopAfterFade: boolean): void {
        this.fadeState = {
            duration: Number.isFinite(duration) ? Math.max(1, duration) : 1,
            elapsed: 0,
            startVolume: this.volume,
            endVolume: Number.isFinite(endVolume) ? Math.max(0, Math.min(1, endVolume)) : 0,
            stopAfterFade
        };
    }

    /** Capture durable logical state without manufacturing or resuming a context. */
    public capturePlaybackState(): MusicPlaybackSnapshot {
        const fade = this.fadeState;
        return {
            transport: this.getTransportState(),
            looped: this.looped,
            playbackRate: this.playbackRate,
            positionSeconds: this.getPosition(),
            volume: this.volume,
            fade:
                fade === null
                    ? null
                    : {
                          durationMs: fade.duration,
                          elapsedMs: Math.min(fade.elapsed, fade.duration),
                          startVolume: fade.startVolume,
                          endVolume: fade.endVolume,
                          stopAfterFade: fade.stopAfterFade
                      }
        };
    }

    /**
     * Atomically import transport only. This never plays a source, queues a timer,
     * changes global preferences, or delivers a Music listener notification.
     * Playback attachment belongs to the shell's accepted start transaction.
     */
    public restorePlaybackState(snapshot: MusicPlaybackSnapshot): void {
        const state = copyMusicPlaybackSnapshot(snapshot);
        const old = Music.currentMusic;
        if (state.transport !== "stopped" && old !== null && old !== this) {
            old.resetLogicalState();
        }
        this.startToken++;
        this.stopSource(true);
        if (Music.currentMusic === this || state.transport !== "stopped") {
            Music.currentMusic = state.transport === "stopped" ? null : this;
        }
        this.looped = state.looped;
        this.playbackRate = state.playbackRate;
        this.positionOffset = this.buffer === null ? state.positionSeconds : this.normalizeOffset(this.buffer, state.positionSeconds, state.looped);
        this.volume = state.volume;
        this.paused = state.transport === "paused";
        this.playingFlag = state.transport === "playing";
        this.endPending = state.transport === "ended-pending";
        this.globallySuspended = !SoundStore.get().musicOn();
        this.generationDetached = state.transport !== "stopped";
        this.stopRequested = false;
        this.fadeState =
            state.fade === null
                ? null
                : {
                      duration: state.fade.durationMs,
                      elapsed: state.fade.elapsedMs,
                      startVolume: state.fade.startVolume,
                      endVolume: state.fade.endVolume,
                      stopAfterFade: state.fade.stopAfterFade
                  };
        if (state.transport !== "stopped") {
            this.ensureHandle();
        }
    }

    /** Attach the imported/live transport only to the currently accepted playback generation. */
    public attachPlaybackGeneration(): Promise<void> {
        const store = SoundStore.get();
        if (Music.currentMusic !== this || this.endPending || this.paused || !this.playingFlag || !store.musicOn()) {
            return Promise.resolve();
        }
        if (store.isUsingExplicitPlaybackGenerations() && !store.isPlaybackCommitted()) {
            this.generationDetached = true;
            return Promise.resolve();
        }
        const context = store.getAudioContext();
        if (context === null || String(context.state) !== "running") {
            this.generationDetached = true;
            return Promise.resolve();
        }
        if (this.source !== null && this.sourceContext === context) {
            return Promise.resolve();
        }
        const generation = store.getPlaybackGeneration();
        const token = ++this.startToken;
        const attach = (buffer: AudioBuffer): void => {
            if (
                token !== this.startToken ||
                Music.currentMusic !== this ||
                this.endPending ||
                this.paused ||
                !this.playingFlag ||
                !store.musicOn() ||
                (store.isUsingExplicitPlaybackGenerations() && (!store.isPlaybackGenerationCurrent(generation, context) || !store.isPlaybackCommitted()))
            ) {
                return;
            }
            this.buffer = buffer;
            this.globallySuspended = false;
            this.generationDetached = false;
            this.startSource(buffer, context, generation);
        };
        try {
            const cached = this.buffer ?? store.getDecodedAudioBuffer(this.ref);
            if (cached !== null) {
                attach(cached);
                return Promise.resolve();
            }
            return this.readyPromise.then(() => this.loadBuffer()).then(attach);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    private start(loop: boolean, pitch: number, volume: number, offset = 0, resetFade = true): void {
        const old = Music.currentMusic;
        if (old !== null && old !== this) {
            old.stopForSwap(this);
        }
        this.startToken++;
        this.stopSource(true);
        Music.currentMusic = this;
        this.endPending = false;
        if (resetFade) {
            this.fadeState = null;
        }
        this.looped = loop;
        this.playbackRate = Number.isFinite(pitch) ? Math.max(0.25, Math.min(4, pitch)) : 1;
        this.positionOffset = this.buffer === null ? this.sanitizeOffset(offset) : this.normalizeOffset(this.buffer, offset, loop);
        this.setVolume(volume);
        this.paused = false;
        this.playingFlag = true;
        this.globallySuspended = !SoundStore.get().musicOn();
        this.generationDetached = true;
        this.ensureHandle();
        this.requestAttach();
    }

    private requestAttach(): void {
        const attachment = this.attachPlaybackGeneration();
        const token = this.startToken;
        void attachment.catch((error) => {
            if (token !== this.startToken || Music.currentMusic !== this) {
                return;
            }
            this.stopSource(true, true);
            this.generationDetached = true;
            Log.error(`Failed to attach music: ${this.ref}`, error);
            SoundStore.get().reportPlaybackInterruption("music-start-failed");
        });
    }

    private poll(delta: number): void {
        if (this.paused || this.globallySuspended || !this.playingFlag) {
            return;
        }
        const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        const store = SoundStore.get();
        if (this.source === null && store.isSilentPlaybackActive() && this.buffer !== null) {
            const position = this.positionOffset + (elapsed / 1000) * this.playbackRate;
            this.positionOffset = this.normalizeOffset(this.buffer, position, this.looped);
            if (!this.looped && position >= this.buffer.duration) {
                this.playingFlag = false;
                this.endPending = true;
            }
        }
        const fade = this.fadeState;
        if (fade === null) {
            return;
        }
        fade.elapsed = Math.min(fade.duration, fade.elapsed + elapsed);
        const t = fade.elapsed / fade.duration;
        this.setVolume(fade.startVolume + (fade.endVolume - fade.startVolume) * t);
        if (t >= 1) {
            this.fadeState = null;
            if (fade.stopAfterFade) {
                this.stop();
            }
        }
    }

    private async loadBuffer(): Promise<AudioBuffer> {
        if (this.buffer === null) {
            this.buffer = await SoundStore.get().loadAudioBuffer(this.ref);
        }
        return this.buffer;
    }

    private stopForSwap(newMusic: Music): void {
        this.resetLogicalState();
        if (Music.currentMusic === this) {
            Music.currentMusic = null;
        }
        for (const listener of this.listeners) {
            listener.musicSwapped(this, newMusic);
        }
    }

    private resetLogicalState(): void {
        this.startToken++;
        this.stopSource(true);
        this.positionOffset = 0;
        this.playingFlag = false;
        this.paused = false;
        this.globallySuspended = false;
        this.generationDetached = false;
        this.endPending = false;
        this.fadeState = null;
    }

    private finishEnded(): void {
        this.resetLogicalState();
        for (const listener of this.listeners) {
            listener.musicEnded(this);
        }
    }

    private stopSource(requested: boolean, keepHandle = false): void {
        this.stopRequested = requested;
        const source = this.source;
        const gain = this.gain;
        this.source = null;
        this.sourceContext = null;
        this.gain = null;
        if (!keepHandle) {
            this.clearHandle();
        }
        this.cleanupSourceGraph(source, gain, true);
    }

    private cleanupSourceGraph(source: AudioBufferSourceNode | null, gain: GainNode | null, stopSource: boolean): void {
        if (source !== null) {
            source.onended = null;
            if (stopSource) {
                try {
                    source.stop();
                } catch {
                    // A source may already have ended or failed before start().
                }
            }
            try {
                source.disconnect();
            } catch {
                // Retirement must finish even if the browser has already disposed a node.
            }
        }
        try {
            gain?.disconnect();
        } catch {
            // Best-effort cleanup never changes the logical transport.
        }
    }

    private startSource(buffer: AudioBuffer, context: AudioContext, generation: number): void {
        const store = SoundStore.get();
        const bus = store.getMusicBus();
        if (bus === null || String(context.state) !== "running") {
            throw new SlickException("Music playback requires a running Web Audio context");
        }
        if (store.isUsingExplicitPlaybackGenerations() && !store.isPlaybackGenerationCurrent(generation, context)) {
            return;
        }
        this.stopSource(true, true);
        this.ensureHandle();
        let source: AudioBufferSourceNode | null = null;
        let gain: GainNode | null = null;
        try {
            source = context.createBufferSource();
            gain = context.createGain();
            source.buffer = buffer;
            source.loop = this.looped;
            source.playbackRate.value = this.playbackRate;
            gain.gain.value = this.volume;
            source.connect(gain);
            gain.connect(bus);
            this.positionOffset = this.normalizeOffset(buffer, this.positionOffset, this.looped);
            this.startedAt = context.currentTime;
            this.stopRequested = false;
            this.source = source;
            this.sourceContext = context;
            this.gain = gain;
            const startedSource = source;
            const startedGain = gain;
            const loop = this.looped;
            source.onended = () => {
                this.cleanupSourceGraph(startedSource, startedGain, false);
                if (this.source !== startedSource || this.sourceContext !== context) {
                    return;
                }
                this.source = null;
                this.sourceContext = null;
                this.gain = null;
                if (!this.stopRequested && !loop) {
                    this.positionOffset = buffer.duration;
                    this.playingFlag = false;
                    this.endPending = true;
                }
            };
            source.start(0, this.positionOffset);
        } catch (error) {
            if (this.source === source) {
                this.source = null;
                this.sourceContext = null;
                this.gain = null;
            }
            this.cleanupSourceGraph(source, gain, true);
            throw error;
        }
    }

    private sanitizeOffset(offset: number): number {
        return Number.isFinite(offset) ? Math.max(0, offset) : 0;
    }

    private normalizeOffset(buffer: AudioBuffer, offset: number, loop: boolean): number {
        const value = this.sanitizeOffset(offset);
        const duration = buffer.duration;
        if (!Number.isFinite(duration)) {
            return value;
        }
        return duration <= 0 ? 0 : loop ? value % duration : Math.min(value, duration);
    }

    private suspendForMusicOff(): void {
        if (Music.currentMusic !== this || this.endPending) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        this.globallySuspended = true;
        this.stopSource(true, true);
        this.generationDetached = true;
    }

    private resumeForMusicOn(): void {
        if (Music.currentMusic !== this || this.endPending || !SoundStore.get().musicOn()) {
            return;
        }
        this.globallySuspended = false;
        if (!this.paused && this.playingFlag) {
            this.requestAttach();
        }
    }

    private detachPlaybackGeneration(): void {
        if (Music.currentMusic !== this) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        this.stopSource(true, true);
        this.generationDetached = true;
    }

    private ensureHandle(): void {
        if (this.handle === null) {
            this.handle = {
                stop: () => this.stop(),
                pause: () => this.pause(),
                suspend: () => this.suspendForMusicOff(),
                resume: () => this.resumeForMusicOn(),
                detachPlaybackGeneration: () => this.detachPlaybackGeneration(),
                attachPlaybackGeneration: () => this.attachPlaybackGeneration(),
                playing: () => Music.currentMusic === this && (this.playingFlag || this.paused || this.endPending || this.generationDetached)
            };
        }
        SoundStore.get().track(this.handle);
    }

    private clearHandle(): void {
        if (this.handle !== null) {
            SoundStore.get().untrack(this.handle);
            this.handle = null;
        }
    }
}
