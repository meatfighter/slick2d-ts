import type { Game } from "./Game.js";
import { AppGameContainer } from "./AppGameContainer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer extension used by desktop wrappers.
 *
 * Adds resizable-window compatibility on top of the browser canvas container.
 */
export declare class ApplicationGameContainer extends AppGameContainer {
    private resizable;
    constructor(game: Game);
    constructor(game: Game, width: number, height: number, fullscreen: boolean);
    /** Java desktop wrapper counterpart: ApplicationGameContainer.setResizable(boolean). */
    setResizable(resizable: boolean): void;
    /** Java desktop wrapper counterpart: ApplicationGameContainer.isResizable(). */
    isResizable(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    destroy(): void;
    protected handleBrowserResize(): void;
}
//# sourceMappingURL=ApplicationGameContainer.d.ts.map