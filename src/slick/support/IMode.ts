import type { GameContainer } from "../GameContainer.js";
import type { Graphics } from "../Graphics.js";

/**
 * Java counterpart: shared project IMode helper interfaces.
 *
 * Generic lifecycle contract for game-local mode/state objects.
 */
export interface IMode<TMain = unknown> {
    /** Java counterpart: IMode.init(Main, GameContainer). */
    init(main: TMain, gc: GameContainer): void | Promise<void>;
    /** Java counterpart: IMode.update(GameContainer). */
    update(gc: GameContainer): void;
    /** Java counterpart: IMode.render(GameContainer, Graphics). */
    render(gc: GameContainer, g: Graphics): void;
}
