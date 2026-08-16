import { GL11 } from "../lwjgl/opengl/GL11.js";
import { SlickCallable } from "./opengl/SlickCallable.js";
function isInputListener(value) {
    const candidate = value;
    return (!!candidate &&
        typeof candidate.setInput === "function" &&
        typeof candidate.isAcceptingInput === "function" &&
        typeof candidate.keyPressed === "function" &&
        typeof candidate.mousePressed === "function" &&
        typeof candidate.controllerButtonPressed === "function");
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.ScalableGame.
 *
 * Wraps a held game and renders it at a fixed logical resolution.
 */
export class ScalableGame {
    held;
    normalWidth;
    normalHeight;
    maintainAspect;
    container = null;
    targetWidth = 0;
    targetHeight = 0;
    xoffset = 0;
    yoffset = 0;
    /** Java Slick2D counterpart: ScalableGame constructors. */
    constructor(held, normalWidth, normalHeight, maintainAspect = false) {
        this.held = held;
        this.normalWidth = normalWidth;
        this.normalHeight = normalHeight;
        this.maintainAspect = maintainAspect;
    }
    /** Java Slick2D counterpart: ScalableGame.init(GameContainer). */
    init(container) {
        this.container = container;
        this.recalculateScale();
        return this.held.init(container);
    }
    /** Java Slick2D counterpart: ScalableGame.update(GameContainer, int). */
    update(container, delta) {
        this.container = container;
        if (this.targetHeight !== container.getHeight() || this.targetWidth !== container.getWidth()) {
            this.recalculateScale();
        }
        this.held.update(container, delta);
    }
    /** Java Slick2D counterpart: ScalableGame.render(GameContainer, Graphics). */
    render(container, g) {
        this.container = container;
        this.calculateOffsets(container);
        SlickCallable.enterSafeBlock();
        g.setClip(this.xoffset, this.yoffset, this.targetWidth, this.targetHeight);
        GL11.glTranslatef(this.xoffset, this.yoffset, 0);
        g.scale(this.targetWidth / this.normalWidth, this.targetHeight / this.normalHeight);
        GL11.glPushMatrix();
        this.held.render(container, g);
        GL11.glPopMatrix();
        g.clearClip();
        SlickCallable.leaveSafeBlock();
        this.renderOverlay(container, g);
    }
    /** Java Slick2D counterpart: ScalableGame.renderOverlay(GameContainer, Graphics). */
    renderOverlay(_container, _g) { }
    /** Java Slick2D counterpart: ScalableGame.recalculateScale(). */
    recalculateScale() {
        if (!this.container) {
            return;
        }
        this.targetWidth = this.container.getWidth();
        this.targetHeight = this.container.getHeight();
        if (this.maintainAspect) {
            const normalIsWide = this.normalWidth / this.normalHeight > 1.6;
            const containerIsWide = this.targetWidth / this.targetHeight > 1.6;
            const wScale = this.targetWidth / this.normalWidth;
            const hScale = this.targetHeight / this.normalHeight;
            if (normalIsWide && containerIsWide) {
                const scale = wScale < hScale ? wScale : hScale;
                this.targetWidth = Math.trunc(this.normalWidth * scale);
                this.targetHeight = Math.trunc(this.normalHeight * scale);
            }
            else if (normalIsWide && !containerIsWide) {
                this.targetWidth = Math.trunc(this.normalWidth * wScale);
                this.targetHeight = Math.trunc(this.normalHeight * wScale);
            }
            else if (!normalIsWide && containerIsWide) {
                this.targetWidth = Math.trunc(this.normalWidth * hScale);
                this.targetHeight = Math.trunc(this.normalHeight * hScale);
            }
            else {
                const scale = wScale < hScale ? wScale : hScale;
                this.targetWidth = Math.trunc(this.normalWidth * scale);
                this.targetHeight = Math.trunc(this.normalHeight * scale);
            }
        }
        if (isInputListener(this.held)) {
            this.container.getInput().addListener(this.held);
        }
        this.container.getInput().setScale(this.normalWidth / this.targetWidth, this.normalHeight / this.targetHeight);
        this.calculateOffsets(this.container);
        this.container.getInput().setOffset(-this.xoffset / (this.targetWidth / this.normalWidth), -this.yoffset / (this.targetHeight / this.normalHeight));
    }
    calculateOffsets(container) {
        let xoffset = 0;
        let yoffset = 0;
        if (this.targetHeight < container.getHeight()) {
            yoffset = Math.trunc((container.getHeight() - this.targetHeight) / 2);
        }
        if (this.targetWidth < container.getWidth()) {
            xoffset = Math.trunc((container.getWidth() - this.targetWidth) / 2);
        }
        this.xoffset = xoffset;
        this.yoffset = yoffset;
    }
    /** Java Slick2D counterpart: ScalableGame.closeRequested(). */
    closeRequested() {
        return this.held.closeRequested();
    }
    /** Java Slick2D counterpart: ScalableGame.getTitle(). */
    getTitle() {
        return this.held.getTitle();
    }
}
//# sourceMappingURL=ScalableGame.js.map