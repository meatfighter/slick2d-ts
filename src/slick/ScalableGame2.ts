import { GL11 } from "../lwjgl/opengl/GL11.js";
import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import type { Graphics } from "./Graphics.js";
import type { InputListener } from "./InputListener.js";
import { SlickCallable } from "./opengl/SlickCallable.js";
import { ScalableGame } from "./ScalableGame.js";

function isInputListener(value: unknown): value is InputListener {
    const candidate = value as Partial<InputListener> | null;
    return !!candidate
        && typeof candidate.setInput === "function"
        && typeof candidate.isAcceptingInput === "function"
        && typeof candidate.keyPressed === "function"
        && typeof candidate.mousePressed === "function"
        && typeof candidate.controllerButtonPressed === "function";
}

/**
 * Java counterpart: copied project ScalableGame2 helper.
 *
 * Keeps the observed wide-screen aspect branch and input scaling behavior.
 */
export class ScalableGame2 extends ScalableGame {
    public constructor(held: Game, normalWidth: number, normalHeight: number);
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    /** Java counterpart: ScalableGame2 constructors. */
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean = false) {
        super(held, normalWidth, normalHeight, maintainAspect);
    }

    /** Java Slick2D counterpart: ScalableGame.init(GameContainer). */
    public override init(container: GameContainer): void | Promise<void> {
        this.container = container;
        this.calculateTargetSize(container);
        if (isInputListener(this.held)) {
            container.getInput().addListener(this.held);
        }
        this.applyInputTransform(container);
        return this.held.init(container);
    }

    /** Java counterpart: ScalableGame2.containerSizeChanged(GameContainer). */
    public containerSizeChanged(container: GameContainer): void {
        this.container = container;
        this.calculateTargetSize(container);
        this.applyInputTransform(container);
    }

    private calculateTargetSize(container: GameContainer): void {
        this.targetWidth = container.getWidth();
        this.targetHeight = container.getHeight();
        if (this.maintainAspect) {
            const normalIsWide = this.normalWidth / this.normalHeight > 1.6;
            const containerIsWide = this.targetWidth / this.targetHeight > 1.6;
            const wScale = this.targetWidth / this.normalWidth;
            const hScale = this.targetHeight / this.normalHeight;

            if (normalIsWide && containerIsWide) {
                const scale = wScale < hScale ? wScale : hScale;
                this.targetWidth = Math.trunc(this.normalWidth * scale);
                this.targetHeight = Math.trunc(this.normalHeight * scale);
            } else if (normalIsWide && !containerIsWide) {
                this.targetWidth = Math.trunc(this.normalWidth * wScale);
                this.targetHeight = Math.trunc(this.normalHeight * wScale);
            } else if (!normalIsWide && containerIsWide) {
                this.targetWidth = Math.trunc(this.normalWidth * hScale);
                this.targetHeight = Math.trunc(this.normalHeight * hScale);
            } else {
                const scale = wScale < hScale ? wScale : hScale;
                this.targetWidth = Math.trunc(this.normalWidth * scale);
                this.targetHeight = Math.trunc(this.normalHeight * scale);
            }
        }
    }

    private applyInputTransform(container: GameContainer): void {
        container.getInput().setScale(this.normalWidth / this.targetWidth, this.normalHeight / this.targetHeight);
        this.calculateScalableGame2Offsets(container);
        container.getInput().setOffset(
            -this.xoffset / (this.targetWidth / this.normalWidth),
            -this.yoffset / (this.targetHeight / this.normalHeight)
        );
    }

    /** Java Slick2D counterpart: ScalableGame.render(GameContainer, Graphics). */
    public override render(container: GameContainer, g: Graphics): void {
        this.container = container;
        this.calculateScalableGame2Offsets(container);
        SlickCallable.enterSafeBlock();
        g.setClip(this.xoffset, this.yoffset, this.targetWidth, this.targetHeight);
        GL11.glTranslatef(this.xoffset, this.yoffset, 0);
        GL11.glScalef(this.targetWidth / this.normalWidth, this.targetHeight / this.normalHeight, 0);
        GL11.glPushMatrix();
        this.held.render(container, g);
        GL11.glPopMatrix();
        g.clearClip();
        SlickCallable.leaveSafeBlock();
        this.renderOverlay(container, g);
    }

    private calculateScalableGame2Offsets(container: GameContainer): void {
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
}
