import { SlickException } from "./SlickException.js";
import { SoundStore } from "./openal/SoundStore.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.Music.
 *
 * Longer music track wrapper with play, loop, fade, and seek support.
 */
export class Music {
    static currentMusic = null;
    static active = new Set();
    ref;
    readyPromise;
    listeners = [];
    source = null;
    gain = null;
    buffer = null;
    volume = 1;
    fadeState = null;
    looped = false;
    playbackRate = 1;
    positionOffset = 0;
    startedAt = 0;
    paused = false;
    playingFlag = false;
    globallySuspended = false;
    stopRequested = false;
    startToken = 0;
    handle = null;
    /**
     * Java Slick2D counterpart: Music constructors.
     *
     * Stores a resource reference and queues browser loading when possible.
     */
    constructor(refOrUrlOrInput, streamingOrRef) {
        if (typeof refOrUrlOrInput === "string") {
            this.ref = refOrUrlOrInput;
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        }
        else if (refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        }
        else {
            this.ref = typeof streamingOrRef === "string" ? streamingOrRef : "music";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
                this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
            }
            else {
                const registered = refOrUrlOrInput.arrayBuffer().then((bytes) => {
                    ResourceLoader.registerResource(this.ref, bytes);
                });
                this.readyPromise = ResourceLoader.track(registered.then(() => SoundStore.get().loadAudioBuffer(this.ref)).then(() => undefined), this.ref);
                void this.readyPromise.catch(() => undefined);
            }
        }
    }
    /** Java Slick2D counterpart: Music.poll(int). */
    static poll(delta) {
        if (Music.currentMusic && Music.currentMusic.playingFlag) {
            Music.currentMusic.poll(delta);
        }
        for (const music of Music.active) {
            if (music !== Music.currentMusic) {
                music.poll(delta);
            }
        }
    }
    /** Browser parity helper: waits for constructor-queued audio decode. */
    ready() {
        return this.readyPromise;
    }
    /** Browser parity helper: Java-style explicit load alias. */
    load() {
        return this.ready();
    }
    /** Java Slick2D counterpart: Music.addListener(MusicListener). */
    addListener(listener) {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }
    /** Java Slick2D counterpart: Music.removeListener(MusicListener). */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }
    play(pitch = 1, volume = 1) {
        this.start(false, pitch, volume);
    }
    loop(pitch = 1, volume = 1) {
        this.start(true, pitch, volume);
    }
    /** Java Slick2D counterpart: Music.pause(). */
    pause() {
        if (Music.currentMusic !== this || (!this.source && !this.playingFlag)) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        this.stopSource(true, true);
        this.paused = true;
        this.playingFlag = false;
        this.globallySuspended = false;
        Music.active.delete(this);
    }
    /** Java Slick2D counterpart: Music.stop(). */
    stop() {
        this.startToken++;
        this.stopSource(true);
        this.positionOffset = 0;
        this.paused = false;
        this.playingFlag = false;
        this.globallySuspended = false;
        Music.active.delete(this);
        this.fadeState = null;
        if (Music.currentMusic === this) {
            Music.currentMusic = null;
        }
    }
    /** Java Slick2D counterpart: Music.resume(). */
    resume() {
        if (this.paused) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
        }
        else if (this.globallySuspended && SoundStore.get().musicOn()) {
            this.resumeForMusicOn();
        }
    }
    /** Java Slick2D counterpart: Music.playing(). */
    playing() {
        return Music.currentMusic === this && this.playingFlag;
    }
    /** Java Slick2D counterpart: Music.setVolume(float). */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gain) {
            this.gain.gain.value = this.volume;
        }
    }
    /** Java Slick2D counterpart: Music.getVolume(). */
    getVolume() {
        return this.volume;
    }
    /** Java Slick2D counterpart: Music.setPosition(float). */
    setPosition(position) {
        this.positionOffset = this.buffer ? this.normalizeOffset(this.buffer, position, this.looped) : this.sanitizeOffset(position);
        if (this.source) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
        }
        return true;
    }
    /** Java Slick2D counterpart: Music.getPosition(). */
    getPosition() {
        const context = SoundStore.get().getAudioContext();
        if (!context || !this.source) {
            return this.positionOffset;
        }
        const position = this.positionOffset + (context.currentTime - this.startedAt) * this.playbackRate;
        return this.buffer ? this.normalizeOffset(this.buffer, position, this.looped) : this.sanitizeOffset(position);
    }
    /** Java Slick2D counterpart: Music.fade(int, float, boolean). */
    fade(duration, endVolume, stopAfterFade) {
        this.fadeState = {
            duration: Math.max(1, duration),
            elapsed: 0,
            startVolume: this.volume,
            endVolume: Math.max(0, Math.min(1, endVolume)),
            stopAfterFade
        };
        Music.active.add(this);
    }
    start(loop, pitch, volume, offset = 0) {
        const oldMusic = Music.currentMusic;
        if (oldMusic && oldMusic !== this) {
            oldMusic.stopForSwap(this);
        }
        else if (oldMusic === this) {
            this.stopSource(true);
        }
        Music.currentMusic = this;
        this.looped = loop;
        this.playbackRate = Math.max(0.25, Math.min(4, pitch));
        this.positionOffset = this.buffer ? this.normalizeOffset(this.buffer, offset, loop) : this.sanitizeOffset(offset);
        this.setVolume(volume);
        this.paused = false;
        this.playingFlag = true;
        this.globallySuspended = !SoundStore.get().musicOn();
        this.ensureHandle();
        const token = ++this.startToken;
        void this.readyPromise
            .then(() => this.loadBuffer())
            .then((buffer) => {
            if (token !== this.startToken || Music.currentMusic !== this || !this.playingFlag) {
                return;
            }
            this.buffer = buffer;
            this.positionOffset = this.normalizeOffset(buffer, this.positionOffset, loop);
            if (!SoundStore.get().musicOn()) {
                this.globallySuspended = true;
                return;
            }
            this.globallySuspended = false;
            this.startSource(buffer, loop, this.positionOffset);
        })
            .catch((error) => {
            if (token === this.startToken && Music.currentMusic === this) {
                this.playingFlag = false;
                this.globallySuspended = false;
                Music.currentMusic = null;
                this.clearHandle();
            }
            Log.error(`Failed to start music: ${this.ref}`, error);
        });
    }
    poll(delta) {
        if (!this.fadeState) {
            return;
        }
        const fade = this.fadeState;
        fade.elapsed += delta;
        const t = Math.min(1, fade.elapsed / fade.duration);
        this.setVolume(fade.startVolume + (fade.endVolume - fade.startVolume) * t);
        if (t >= 1) {
            this.fadeState = null;
            if (fade.stopAfterFade) {
                this.stop();
            }
        }
    }
    async loadBuffer() {
        if (this.buffer) {
            return this.buffer;
        }
        this.buffer = await SoundStore.get().loadAudioBuffer(this.ref);
        return this.buffer;
    }
    stopForSwap(newMusic) {
        this.startToken++;
        this.stopSource(true);
        this.playingFlag = false;
        this.paused = false;
        this.globallySuspended = false;
        this.fadeState = null;
        Music.active.delete(this);
        if (Music.currentMusic === this) {
            Music.currentMusic = null;
        }
        for (const listener of this.listeners) {
            listener.musicSwapped(this, newMusic);
        }
    }
    stopSource(requested, keepHandle = false) {
        if (!this.source) {
            if (!keepHandle) {
                this.clearHandle();
            }
            return;
        }
        this.stopRequested = requested;
        const source = this.source;
        this.source = null;
        this.gain = null;
        if (!keepHandle) {
            this.clearHandle();
        }
        try {
            source.stop();
        }
        catch {
            // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
        }
    }
    startSource(buffer, loop, offset) {
        const context = SoundStore.get().getAudioContext();
        const bus = SoundStore.get().getMusicBus();
        if (!context || !bus) {
            throw new SlickException("Music playback requires Web Audio API");
        }
        this.stopSource(true);
        this.ensureHandle();
        void context.resume().catch(() => undefined);
        const source = context.createBufferSource();
        this.source = source;
        this.gain = context.createGain();
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = this.playbackRate;
        this.gain.gain.value = this.volume;
        source.connect(this.gain);
        this.gain.connect(bus);
        this.positionOffset = this.normalizeOffset(buffer, offset, loop);
        this.startedAt = context.currentTime;
        this.stopRequested = false;
        source.onended = () => {
            if (this.source !== source) {
                return;
            }
            const requested = this.stopRequested;
            this.source = null;
            this.gain = null;
            if (!requested && !loop) {
                this.clearHandle();
                this.playingFlag = false;
                this.globallySuspended = false;
                this.positionOffset = 0;
                Music.active.delete(this);
                if (Music.currentMusic === this) {
                    Music.currentMusic = null;
                }
                for (const listener of this.listeners) {
                    listener.musicEnded(this);
                }
            }
        };
        source.start(0, this.positionOffset);
        Music.active.add(this);
    }
    sanitizeOffset(offset) {
        return Number.isFinite(offset) ? Math.max(0, offset) : 0;
    }
    normalizeOffset(buffer, offset, loop) {
        const sanitized = this.sanitizeOffset(offset);
        const duration = buffer.duration;
        if (!Number.isFinite(duration)) {
            return sanitized;
        }
        if (duration <= 0) {
            return 0;
        }
        if (loop) {
            return sanitized % duration;
        }
        return Math.min(sanitized, duration);
    }
    suspendForMusicOff() {
        if (Music.currentMusic !== this || !this.playingFlag || this.globallySuspended) {
            return;
        }
        this.positionOffset = this.getPosition();
        this.globallySuspended = true;
        this.stopSource(true, true);
    }
    resumeForMusicOn() {
        if (Music.currentMusic !== this || !this.playingFlag || this.paused || !this.globallySuspended) {
            return;
        }
        this.globallySuspended = false;
        this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
    }
    ensureHandle() {
        if (this.handle) {
            SoundStore.get().track(this.handle);
            return;
        }
        this.handle = {
            stop: () => this.stop(),
            pause: () => this.pause(),
            suspend: () => this.suspendForMusicOff(),
            resume: () => this.resumeForMusicOn(),
            playing: () => this.playing()
        };
        SoundStore.get().track(this.handle);
    }
    clearHandle() {
        if (!this.handle) {
            return;
        }
        SoundStore.get().untrack(this.handle);
        this.handle = null;
    }
}
//# sourceMappingURL=Music.js.map