import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import type { Graphics } from "./Graphics.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.ScalableGame.
 *
 * Wraps a held game and renders it at a fixed logical resolution.
 */
export declare class ScalableGame implements Game {
    protected readonly held: Game;
    protected readonly normalWidth: number;
    protected readonly normalHeight: number;
    protected readonly maintainAspect: boolean;
    protected container: GameContainer | null;
    protected targetWidth: number;
    protected targetHeight: number;
    protected xoffset: number;
    protected yoffset: number;
    constructor(held: Game, normalWidth: number, normalHeight: number);
    constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    /** Java Slick2D counterpart: ScalableGame.init(GameContainer). */
    init(container: GameContainer): void | Promise<void>;
    /** Java Slick2D counterpart: ScalableGame.update(GameContainer, int). */
    update(container: GameContainer, delta: number): void;
    /** Java Slick2D counterpart: ScalableGame.render(GameContainer, Graphics). */
    render(container: GameContainer, g: Graphics): void;
    /** Java Slick2D counterpart: ScalableGame.renderOverlay(GameContainer, Graphics). */
    protected renderOverlay(_container: GameContainer, _g: Graphics): void;
    /** Java Slick2D counterpart: ScalableGame.recalculateScale(). */
    recalculateScale(): void;
    private calculateOffsets;
    /** Java Slick2D counterpart: ScalableGame.closeRequested(). */
    closeRequested(): boolean;
    /** Java Slick2D counterpart: ScalableGame.getTitle(). */
    getTitle(): string;
}
//# sourceMappingURL=ScalableGame.d.ts.map