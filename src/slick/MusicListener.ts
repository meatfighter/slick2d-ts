import type { Music } from "./Music.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.MusicListener.
 *
 * Listener for music end/swap notifications.
 */
export interface MusicListener {
    /** Java Slick2D counterpart: MusicListener.musicEnded(Music). */
    musicEnded(music: Music): void;
    /** Java Slick2D counterpart: MusicListener.musicSwapped(Music, Music). */
    musicSwapped(music: Music, newMusic: Music): void;
}
