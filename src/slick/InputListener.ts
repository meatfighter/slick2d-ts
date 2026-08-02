import type { ControllerListener } from "./ControllerListener.js";
import type { KeyListener } from "./KeyListener.js";
import type { MouseListener } from "./MouseListener.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.InputListener.
 *
 * Composition interface for keyboard, mouse, and controller callbacks.
 */
export interface InputListener extends MouseListener, KeyListener, ControllerListener {
}
