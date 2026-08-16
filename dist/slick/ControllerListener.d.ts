import type { ControlledInputReciever } from "./ControlledInputReciever.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.ControllerListener.
 *
 * Controller callback contract. Button callback indexes start at one.
 */
export interface ControllerListener extends ControlledInputReciever {
    /** Java Slick2D counterpart: ControllerListener.controllerLeftPressed(int). */
    controllerLeftPressed(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerLeftReleased(int). */
    controllerLeftReleased(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerRightPressed(int). */
    controllerRightPressed(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerRightReleased(int). */
    controllerRightReleased(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerUpPressed(int). */
    controllerUpPressed(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerUpReleased(int). */
    controllerUpReleased(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerDownPressed(int). */
    controllerDownPressed(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerDownReleased(int). */
    controllerDownReleased(controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerButtonPressed(int, int). */
    controllerButtonPressed(controller: number, button: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerButtonReleased(int, int). */
    controllerButtonReleased(controller: number, button: number): void;
}
//# sourceMappingURL=ControllerListener.d.ts.map