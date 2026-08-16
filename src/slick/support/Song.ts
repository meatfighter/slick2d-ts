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
        if (this.intro?.playing()) {
            this.intro.stop();
        }
        if (this.intro2?.playing()) {
            this.intro2.stop();
        }
        if (this.loop?.playing()) {
            this.loop.stop();
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
        if (this.intro) {
            this.intro.play();
        } else if (this.intro2) {
            this.intro2.play();
        } else if (this.loop) {
            this.loop.loop();
        }
        this.playing = true;
    }

    /** Java counterpart: Song.update(). */
    public update(): void {
        if (this.playing) {
            if (this.intro === null || !this.intro.playing()) {
                if (!(this.intro2 === null || this.playedIntro2)) {
                    this.playedIntro2 = true;
                    this.intro2.play();
                } else if ((this.intro2 === null || !this.intro2.playing()) && this.loop !== null && !this.loop.playing()) {
                    this.loop.loop();
                }
            }
            if (this.loop === null && this.intro !== null && !this.intro.playing() && (this.intro2 === null || !this.intro2.playing())) {
                this.stop();
            }
        }
    }
}
