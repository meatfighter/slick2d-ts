import { Music } from "../Music.js";
/**
 * Java counterpart: source Song helper classes.
 *
 * Public-field intro/intro2/loop sequencer.
 */
export declare class Song {
    static readonly STREAMING = false;
    intro: Music | null;
    intro2: Music | null;
    loop: Music | null;
    playing: boolean;
    playedIntro2: boolean;
    constructor(intro: string);
    constructor(intro: Music);
    constructor(intro: string | null, loop: string);
    constructor(intro: Music | null, loop: Music);
    constructor(intro: string | null, intro2: string | null, loop: string);
    constructor(intro: Music | null, intro2: Music | null, loop: Music);
    /** Java counterpart: Song.stop(). */
    stop(): void;
    /** Java counterpart: Song.play(). */
    play(): void;
    /** Java counterpart: Song.update(). */
    update(): void;
}
//# sourceMappingURL=Song.d.ts.map