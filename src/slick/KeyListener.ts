import type { ControlledInputReciever } from "./ControlledInputReciever.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.KeyListener.
 *
 * Keyboard callback contract using LWJGL key codes.
 */
export interface KeyListener extends ControlledInputReciever {
    /** Java Slick2D counterpart: KeyListener.keyPressed(int, char). */
    keyPressed(key: number, c: string): void;

    /** Java Slick2D counterpart: KeyListener.keyReleased(int, char). */
    keyReleased(key: number, c: string): void;
}
