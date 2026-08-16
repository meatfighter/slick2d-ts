import type { GameContainer } from "./GameContainer.js";
import type { Graphics } from "./Graphics.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.Game.
 *
 * Synchronous game lifecycle interface used by Slick containers.
 */
export interface Game {
    /** Java Slick2D counterpart: Game.init(GameContainer). */
    init(container: GameContainer): void | Promise<void>;
    /** Java Slick2D counterpart: Game.update(GameContainer, int delta). */
    update(container: GameContainer, delta: number): void;
    /** Java Slick2D counterpart: Game.render(GameContainer, Graphics). */
    render(container: GameContainer, g: Graphics): void;
    /** Java Slick2D counterpart: Game.closeRequested(). */
    closeRequested(): boolean;
    /** Java Slick2D counterpart: Game.getTitle(). */
    getTitle(): string;
}
//# sourceMappingURL=Game.d.ts.map