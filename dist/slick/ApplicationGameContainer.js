import { Display } from "../lwjgl/opengl/Display.js";
import { AppGameContainer } from "./AppGameContainer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer extension used by desktop wrappers.
 *
 * Adds resizable-window compatibility on top of the browser canvas container.
 */
export class ApplicationGameContainer extends AppGameContainer {
    resizable = false;
    /** Java counterpart: ApplicationGameContainer constructors. */
    constructor(game, width = 640, height = 480, fullscreen = false) {
        super(game, width, height, fullscreen);
    }
    /** Java desktop wrapper counterpart: ApplicationGameContainer.setResizable(boolean). */
    setResizable(resizable) {
        this.resizable = resizable;
        Display.setResizable(resizable);
    }
    /** Java desktop wrapper counterpart: ApplicationGameContainer.isResizable(). */
    isResizable() {
        return this.resizable;
    }
    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    destroy() {
        this.resizable = false;
        Display.setResizable(false);
        super.destroy();
    }
    handleBrowserResize() {
        if (this.isFullscreen() || !this.resizable || !this.canvas) {
            super.handleBrowserResize();
            return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.trunc(rect.width || this.canvas.clientWidth || this.getWidth()));
        const height = Math.max(1, Math.trunc(rect.height || this.canvas.clientHeight || this.getHeight()));
        this.setDisplayMode(width, height, false);
    }
}
//# sourceMappingURL=ApplicationGameContainer.js.map