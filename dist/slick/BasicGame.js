/**
 * Java Slick2D counterpart: org.newdawn.slick.BasicGame.
 *
 * Convenience base class with no-op input callbacks.
 */
export class BasicGame {
    title;
    /**
     * Java Slick2D counterpart: BasicGame(String title).
     *
     * Stores the title returned by getTitle.
     */
    constructor(title) {
        this.title = title;
    }
    /** Java Slick2D counterpart: BasicGame.getTitle(). */
    getTitle() {
        return this.title;
    }
    /** Java Slick2D counterpart: BasicGame.closeRequested(). */
    closeRequested() {
        return true;
    }
    /** Java Slick2D counterpart: BasicGame.setInput(Input). */
    setInput(_input) { }
    /** Java Slick2D counterpart: ControlledInputReciever.isAcceptingInput(). */
    isAcceptingInput() {
        return true;
    }
    /** Java Slick2D counterpart: ControlledInputReciever.inputStarted(). */
    inputStarted() { }
    /** Java Slick2D counterpart: ControlledInputReciever.inputEnded(). */
    inputEnded() { }
    /** Java Slick2D counterpart: KeyListener.keyPressed(int, char). */
    keyPressed(_key, _c) { }
    /** Java Slick2D counterpart: KeyListener.keyReleased(int, char). */
    keyReleased(_key, _c) { }
    /** Java Slick2D counterpart: MouseListener.mouseWheelMoved(int). */
    mouseWheelMoved(_change) { }
    /** Java Slick2D counterpart: MouseListener.mouseClicked(int, int, int, int). */
    mouseClicked(_button, _x, _y, _clickCount) { }
    /** Java Slick2D counterpart: MouseListener.mousePressed(int, int, int). */
    mousePressed(_button, _x, _y) { }
    /** Java Slick2D counterpart: MouseListener.mouseReleased(int, int, int). */
    mouseReleased(_button, _x, _y) { }
    /** Java Slick2D counterpart: MouseListener.mouseMoved(int, int, int, int). */
    mouseMoved(_oldx, _oldy, _newx, _newy) { }
    /** Java Slick2D counterpart: MouseListener.mouseDragged(int, int, int, int). */
    mouseDragged(_oldx, _oldy, _newx, _newy) { }
    /** Java Slick2D counterpart: ControllerListener.controllerLeftPressed(int). */
    controllerLeftPressed(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerLeftReleased(int). */
    controllerLeftReleased(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerRightPressed(int). */
    controllerRightPressed(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerRightReleased(int). */
    controllerRightReleased(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerUpPressed(int). */
    controllerUpPressed(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerUpReleased(int). */
    controllerUpReleased(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerDownPressed(int). */
    controllerDownPressed(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerDownReleased(int). */
    controllerDownReleased(_controller) { }
    /** Java Slick2D counterpart: ControllerListener.controllerButtonPressed(int, int). */
    controllerButtonPressed(_controller, _button) { }
    /** Java Slick2D counterpart: ControllerListener.controllerButtonReleased(int, int). */
    controllerButtonReleased(_controller, _button) { }
}
//# sourceMappingURL=BasicGame.js.map