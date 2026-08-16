import type { GameContainer } from "./GameContainer.js";
import type { Graphics } from "./Graphics.js";
import type { Input } from "./Input.js";
import type { Game } from "./Game.js";
import type { InputListener } from "./InputListener.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.BasicGame.
 *
 * Convenience base class with no-op input callbacks.
 */
export declare abstract class BasicGame implements Game, InputListener {
    private readonly title;
    /**
     * Java Slick2D counterpart: BasicGame(String title).
     *
     * Stores the title returned by getTitle.
     */
    constructor(title: string);
    /** Java Slick2D counterpart: BasicGame.getTitle(). */
    getTitle(): string;
    /** Java Slick2D counterpart: BasicGame.closeRequested(). */
    closeRequested(): boolean;
    /** Java Slick2D counterpart: BasicGame.setInput(Input). */
    setInput(_input: Input): void;
    /** Java Slick2D counterpart: BasicGame.init(GameContainer). */
    abstract init(container: GameContainer): void | Promise<void>;
    /** Java Slick2D counterpart: BasicGame.update(GameContainer, int). */
    abstract update(container: GameContainer, delta: number): void;
    /** Java Slick2D counterpart: BasicGame.render(GameContainer, Graphics). */
    abstract render(container: GameContainer, g: Graphics): void;
    /** Java Slick2D counterpart: ControlledInputReciever.isAcceptingInput(). */
    isAcceptingInput(): boolean;
    /** Java Slick2D counterpart: ControlledInputReciever.inputStarted(). */
    inputStarted(): void;
    /** Java Slick2D counterpart: ControlledInputReciever.inputEnded(). */
    inputEnded(): void;
    /** Java Slick2D counterpart: KeyListener.keyPressed(int, char). */
    keyPressed(_key: number, _c: string): void;
    /** Java Slick2D counterpart: KeyListener.keyReleased(int, char). */
    keyReleased(_key: number, _c: string): void;
    /** Java Slick2D counterpart: MouseListener.mouseWheelMoved(int). */
    mouseWheelMoved(_change: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseClicked(int, int, int, int). */
    mouseClicked(_button: number, _x: number, _y: number, _clickCount: number): void;
    /** Java Slick2D counterpart: MouseListener.mousePressed(int, int, int). */
    mousePressed(_button: number, _x: number, _y: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseReleased(int, int, int). */
    mouseReleased(_button: number, _x: number, _y: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseMoved(int, int, int, int). */
    mouseMoved(_oldx: number, _oldy: number, _newx: number, _newy: number): void;
    /** Java Slick2D counterpart: MouseListener.mouseDragged(int, int, int, int). */
    mouseDragged(_oldx: number, _oldy: number, _newx: number, _newy: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerLeftPressed(int). */
    controllerLeftPressed(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerLeftReleased(int). */
    controllerLeftReleased(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerRightPressed(int). */
    controllerRightPressed(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerRightReleased(int). */
    controllerRightReleased(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerUpPressed(int). */
    controllerUpPressed(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerUpReleased(int). */
    controllerUpReleased(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerDownPressed(int). */
    controllerDownPressed(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerDownReleased(int). */
    controllerDownReleased(_controller: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerButtonPressed(int, int). */
    controllerButtonPressed(_controller: number, _button: number): void;
    /** Java Slick2D counterpart: ControllerListener.controllerButtonReleased(int, int). */
    controllerButtonReleased(_controller: number, _button: number): void;
}
//# sourceMappingURL=BasicGame.d.ts.map