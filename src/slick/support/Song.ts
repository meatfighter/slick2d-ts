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
 * Public-field intro/intro2/loop sequencer.
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
        this.intro?.stop();
        this.intro2?.stop();
        this.loop?.stop();
        this.playing = false;
        this.playedIntro2 = false;
    }

    /** Java counterpart: Song.play(). */
    public play(): void {
        if (this.playing) {
            return;
        }
        this.playing = true;
        this.playedIntro2 = false;
        if (this.intro) {
            this.intro.play();
        } else if (this.intro2) {
            this.intro2.play();
            this.playedIntro2 = true;
        } else if (this.loop) {
            this.loop.loop();
        }
    }

    /** Java counterpart: Song.update(). */
    public update(): void {
        if (!this.playing) {
            return;
        }
        if (this.intro && this.intro.playing()) {
            return;
        }
        if (this.intro2 && !this.playedIntro2) {
            this.intro2.play();
            this.playedIntro2 = true;
            return;
        }
        if (this.intro2 && this.intro2.playing()) {
            return;
        }
        if (this.loop) {
            if (!this.loop.playing()) {
                this.loop.loop();
            }
        } else {
            this.stop();
        }
    }
}
