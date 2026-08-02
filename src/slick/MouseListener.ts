import type { ControlledInputReciever } from "./ControlledInputReciever.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.MouseListener.
 *
 * Mouse callback contract using Slick container coordinates.
 */
export interface MouseListener extends ControlledInputReciever {
    /** Java Slick2D counterpart: MouseListener.mouseWheelMoved(int). */
    mouseWheelMoved(change: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseClicked(int, int, int, int). */
    mouseClicked(button: number, x: number, y: number, clickCount: number): void;
    /** Java Slick2D counterpart: MouseListener.mousePressed(int, int, int). */
    mousePressed(button: number, x: number, y: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseReleased(int, int, int). */
    mouseReleased(button: number, x: number, y: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseMoved(int, int, int, int). */
    mouseMoved(oldx: number, oldy: number, newx: number, newy: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseDragged(int, int, int, int). */
    mouseDragged(oldx: number, oldy: number, newx: number, newy: number): void;
}
