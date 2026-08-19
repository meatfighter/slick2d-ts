import { Display } from "../lwjgl/opengl/Display.js";
import { AppGameContainer } from "./AppGameContainer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer extension used by desktop wrappers.
 *
 * Adds resizable-window compatibility on top of the browser canvas container.
 */
export class ApplicationGameContainer extends AppGameContainer {
    resizable = false;
    resizeHandler = null;
    /** Java counterpart: ApplicationGameContainer constructors. */
    constructor(game, width = 640, height = 480, fullscreen = false) {
        super(game, width, height, fullscreen);
    }
    /** Java desktop wrapper counterpart: ApplicationGameContainer.setResizable(boolean). */
    setResizable(resizable) {
        this.resizable = resizable;
        Display.setResizable(resizable);
        if (typeof window === "undefined") {
            return;
        }
        if (resizable && !this.resizeHandler) {
            this.resizeHandler = () => {
                if (!this.resizable || !this.canvas) {
                    return;
                }
                const rect = this.canvas.getBoundingClientRect();
                const width = Math.max(1, Math.trunc(rect.width || this.canvas.clientWidth || this.getWidth()));
                const height = Math.max(1, Math.trunc(rect.height || this.canvas.clientHeight || this.getHeight()));
                this.setDisplayMode(width, height, this.isFullscreen());
            };
            window.addEventListener("resize", this.resizeHandler);
        }
        else if (!resizable && this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }
    }
    /** Java desktop wrapper counterpart: ApplicationGameContainer.isResizable(). */
    isResizable() {
        return this.resizable;
    }
    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    destroy() {
        if (this.resizeHandler && typeof window !== "undefined") {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }
        this.resizable = false;
        Display.setResizable(false);
        super.destroy();
    }
}
//# sourceMappingURL=ApplicationGameContainer.js.map