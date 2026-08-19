import { Display } from "../lwjgl/opengl/Display.js";
import type { Game } from "./Game.js";
import { AppGameContainer } from "./AppGameContainer.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer extension used by desktop wrappers.
 *
 * Adds resizable-window compatibility on top of the browser canvas container.
 */
export class ApplicationGameContainer extends AppGameContainer {
    private resizable = false;
    private resizeHandler: (() => void) | null = null;

    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
    /** Java counterpart: ApplicationGameContainer constructors. */
    public constructor(game: Game, width: number = 640, height: number = 480, fullscreen: boolean = false) {
        super(game, width, height, fullscreen);
    }

    /** Java desktop wrapper counterpart: ApplicationGameContainer.setResizable(boolean). */
    public setResizable(resizable: boolean): void {
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
        } else if (!resizable && this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }
    }

    /** Java desktop wrapper counterpart: ApplicationGameContainer.isResizable(). */
    public isResizable(): boolean {
        return this.resizable;
    }

    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    public override destroy(): void {
        if (this.resizeHandler && typeof window !== "undefined") {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }
        this.resizable = false;
        Display.setResizable(false);
        super.destroy();
    }
}
