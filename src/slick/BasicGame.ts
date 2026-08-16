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
export abstract class BasicGame implements Game, InputListener {
    private readonly title: string;

    /**
     * Java Slick2D counterpart: BasicGame(String title).
     *
     * Stores the title returned by getTitle.
     */
    public constructor(title: string) {
        this.title = title;
    }

    /** Java Slick2D counterpart: BasicGame.getTitle(). */
    public getTitle(): string {
        return this.title;
    }

    /** Java Slick2D counterpart: BasicGame.closeRequested(). */
    public closeRequested(): boolean {
        return true;
    }

    /** Java Slick2D counterpart: BasicGame.setInput(Input). */
    public setInput(_input: Input): void {}

    /** Java Slick2D counterpart: BasicGame.init(GameContainer). */
    public abstract init(container: GameContainer): void | Promise<void>;

    /** Java Slick2D counterpart: BasicGame.update(GameContainer, int). */
    public abstract update(container: GameContainer, delta: number): void;

    /** Java Slick2D counterpart: BasicGame.render(GameContainer, Graphics). */
    public abstract render(container: GameContainer, g: Graphics): void;

    /** Java Slick2D counterpart: ControlledInputReciever.isAcceptingInput(). */
    public isAcceptingInput(): boolean {
        return true;
    }

    /** Java Slick2D counterpart: ControlledInputReciever.inputStarted(). */
    public inputStarted(): void {}

    /** Java Slick2D counterpart: ControlledInputReciever.inputEnded(). */
    public inputEnded(): void {}

    /** Java Slick2D counterpart: KeyListener.keyPressed(int, char). */
    public keyPressed(_key: number, _c: string): void {}

    /** Java Slick2D counterpart: KeyListener.keyReleased(int, char). */
    public keyReleased(_key: number, _c: string): void {}

    /** Java Slick2D counterpart: MouseListener.mouseWheelMoved(int). */
    public mouseWheelMoved(_change: number): void {}

    /** Java Slick2D counterpart: MouseListener.mouseClicked(int, int, int, int). */
    public mouseClicked(_button: number, _x: number, _y: number, _clickCount: number): void {}

    /** Java Slick2D counterpart: MouseListener.mousePressed(int, int, int). */
    public mousePressed(_button: number, _x: number, _y: number): void {}

    /** Java Slick2D counterpart: MouseListener.mouseReleased(int, int, int). */
    public mouseReleased(_button: number, _x: number, _y: number): void {}

    /** Java Slick2D counterpart: MouseListener.mouseMoved(int, int, int, int). */
    public mouseMoved(_oldx: number, _oldy: number, _newx: number, _newy: number): void {}

    /** Java Slick2D counterpart: MouseListener.mouseDragged(int, int, int, int). */
    public mouseDragged(_oldx: number, _oldy: number, _newx: number, _newy: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerLeftPressed(int). */
    public controllerLeftPressed(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerLeftReleased(int). */
    public controllerLeftReleased(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerRightPressed(int). */
    public controllerRightPressed(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerRightReleased(int). */
    public controllerRightReleased(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerUpPressed(int). */
    public controllerUpPressed(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerUpReleased(int). */
    public controllerUpReleased(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerDownPressed(int). */
    public controllerDownPressed(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerDownReleased(int). */
    public controllerDownReleased(_controller: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerButtonPressed(int, int). */
    public controllerButtonPressed(_controller: number, _button: number): void {}

    /** Java Slick2D counterpart: ControllerListener.controllerButtonReleased(int, int). */
    public controllerButtonReleased(_controller: number, _button: number): void {}
}
