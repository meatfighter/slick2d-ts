import { Music } from "../Music.js";
function toMusic(value) {
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
    static STREAMING = false;
    intro;
    intro2;
    loop;
    playing = false;
    playedIntro2 = false;
    /** Java counterpart: Song constructors. */
    constructor(a, b, c) {
        if (c !== undefined) {
            this.intro = toMusic(a);
            this.intro2 = toMusic(b ?? null);
            this.loop = toMusic(c);
        }
        else if (b !== undefined) {
            this.intro = toMusic(a);
            this.intro2 = null;
            this.loop = toMusic(b);
        }
        else {
            this.intro = toMusic(a);
            this.intro2 = null;
            this.loop = null;
        }
    }
    /** Java counterpart: Song.stop(). */
    stop() {
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
    play() {
        if (this.playing) {
            return;
        }
        this.stop();
        if (this.intro) {
            this.intro.play();
        }
        else if (this.intro2) {
            this.intro2.play();
        }
        else if (this.loop) {
            this.loop.loop();
        }
        this.playing = true;
    }
    /** Java counterpart: Song.update(). */
    update() {
        if (this.playing) {
            if (this.intro === null || !this.intro.playing()) {
                if (!(this.intro2 === null || this.playedIntro2)) {
                    this.playedIntro2 = true;
                    this.intro2.play();
                }
                else if ((this.intro2 === null || !this.intro2.playing()) && this.loop !== null && !this.loop.playing()) {
                    this.loop.loop();
                }
            }
            if (this.loop === null && this.intro !== null && !this.intro.playing() && (this.intro2 === null || !this.intro2.playing())) {
                this.stop();
            }
        }
    }
}
//# sourceMappingURL=Song.js.map