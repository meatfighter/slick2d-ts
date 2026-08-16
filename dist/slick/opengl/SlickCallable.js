import { Renderer } from "./renderer/Renderer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.SlickCallable.
 *
 * Safe-block boundary for code that mixes direct GL calls with Slick graphics.
 */
export class SlickCallable {
    static depth = 0;
    /** Java Slick2D counterpart: SlickCallable.enterSafeBlock(). */
    static enterSafeBlock() {
        Renderer.get().flush();
        Renderer.get().glPushMatrix();
        SlickCallable.depth++;
    }
    /** Java Slick2D counterpart: SlickCallable.leaveSafeBlock(). */
    static leaveSafeBlock() {
        if (SlickCallable.depth > 0) {
            Renderer.get().glPopMatrix();
            SlickCallable.depth--;
        }
        Renderer.get().flush();
    }
}
//# sourceMappingURL=SlickCallable.js.map