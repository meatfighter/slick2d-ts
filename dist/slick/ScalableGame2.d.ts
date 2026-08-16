import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import type { Graphics } from "./Graphics.js";
import { ScalableGame } from "./ScalableGame.js";
/**
 * Java counterpart: copied project ScalableGame2 helper.
 *
 * Keeps the observed wide-screen aspect branch and input scaling behavior.
 */
export declare class ScalableGame2 extends ScalableGame {
    constructor(held: Game, normalWidth: number, normalHeight: number);
    constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    /** Java Slick2D counterpart: ScalableGame.init(GameContainer). */
    init(container: GameContainer): void | Promise<void>;
    /** Java counterpart: ScalableGame2.containerSizeChanged(GameContainer). */
    containerSizeChanged(container: GameContainer): void;
    private calculateTargetSize;
    private applyInputTransform;
    /** Java Slick2D counterpart: ScalableGame.render(GameContainer, Graphics). */
    render(container: GameContainer, g: Graphics): void;
    private calculateScalableGame2Offsets;
}
//# sourceMappingURL=ScalableGame2.d.ts.map