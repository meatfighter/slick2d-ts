import type { Input } from "./Input.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.ControlledInputReciever.
 *
 * Base contract for Slick2D input listener implementations.
 */
export interface ControlledInputReciever {
    /** Java Slick2D counterpart: ControlledInputReciever.setInput(Input). */
    setInput(input: Input): void;

    /** Java Slick2D counterpart: ControlledInputReciever.isAcceptingInput(). */
    isAcceptingInput(): boolean;

    /** Java Slick2D counterpart: ControlledInputReciever.inputEnded(). */
    inputEnded(): void;

    /** Java Slick2D counterpart: ControlledInputReciever.inputStarted(). */
    inputStarted(): void;
}
