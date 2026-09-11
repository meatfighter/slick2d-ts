import { Music } from "../Music.js";

type MusicOrString = Music | string | null;

function toMusic(value: MusicOrString): Music | null {
    if (value === null) {
        return null;
    }
    return value instanceof Music ? value : new Music(value, Song.STREAMING);
}

/**
 * Java counterpart: source Song helper classes.
 *
 * Public-field intro/intro2/loop sequencer. A paused or detached transport is
 * still active; replacing its physical audio generation must not skip a part.
 */
export class Song {
    public static readonly STREAMING = false;
    public intro: Music | null;
    public intro2: Music | null;
    public loop: Music | null;
    public playing = false;
    public playedIntro2 = false;

    public constructor(intro: string);
    public constructor(intro: Music);
    public constructor(intro: string | null, loop: string);
    public constructor(intro: Music | null, loop: Music);
    public constructor(intro: string | null, intro2: string | null, loop: string);
    public constructor(intro: Music | null, intro2: Music | null, loop: Music);
    /** Java counterpart: Song constructors. */
    public constructor(a: MusicOrString, b?: MusicOrString, c?: MusicOrString) {
        if (c !== undefined) {
            this.intro = toMusic(a);
            this.intro2 = toMusic(b ?? null);
            this.loop = toMusic(c);
        } else if (b !== undefined) {
            this.intro = toMusic(a);
            this.intro2 = null;
            this.loop = toMusic(b);
        } else {
            this.intro = toMusic(a);
            this.intro2 = null;
            this.loop = null;
        }
    }

    /** Java counterpart: Song.stop(). */
    public stop(): void {
        for (const music of [this.intro, this.intro2, this.loop]) {
            if (music !== null && music.getTransportState() !== "stopped") {
                music.stop();
            }
        }
        this.playing = false;
        this.playedIntro2 = false;
    }

    /** Java counterpart: Song.play(). */
    public play(): void {
        if (this.playing) {
            return;
        }
        this.stop();
        if (this.intro !== null) {
            this.intro.play();
        } else if (this.intro2 !== null) {
            this.playedIntro2 = true;
            this.intro2.play();
        } else if (this.loop !== null) {
            this.loop.loop();
        } else {
            return;
        }
        // Preserve the Java ordering: the selected Music starts while Song itself
        // is still stopped. This also keeps reentrant listener behavior stable.
        this.playing = true;
    }

    /** Java counterpart: Song.update(). */
    public update(): void {
        if (!this.playing || this.intro?.isTransportActive()) {
            return;
        }
        if (this.intro2 !== null && !this.playedIntro2) {
            this.playedIntro2 = true;
            this.intro2.play();
            return;
        }
        if (this.intro2?.isTransportActive()) {
            return;
        }
        if (this.loop !== null) {
            if (!this.loop.isTransportActive()) {
                this.loop.loop();
            }
        } else {
            this.stop();
        }
    }
}
