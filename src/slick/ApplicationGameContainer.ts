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
    }

    /** Java desktop wrapper counterpart: ApplicationGameContainer.isResizable(). */
    public isResizable(): boolean {
        return this.resizable;
    }

    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    public override destroy(): void {
        this.resizable = false;
        Display.setResizable(false);
        super.destroy();
    }

    protected override handleBrowserResize(): void {
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
