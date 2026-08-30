import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
export declare enum BufferedScalingMode {
    Nearest = "nearest",
    Linear = "linear",
    Integer = "integer"
}
export interface BufferedScalableGameOptions {
    readonly maintainAspect?: boolean;
    readonly sourceX?: number;
    readonly sourceY?: number;
    readonly sourceWidth?: number;
    readonly sourceHeight?: number;
    readonly scalingMode?: BufferedScalingMode;
}
export interface BufferedPresentationInfo {
    readonly scalingMode: BufferedScalingMode;
    readonly logicalX: number;
    readonly logicalY: number;
    readonly logicalWidth: number;
    readonly logicalHeight: number;
    readonly physicalX: number;
    readonly physicalY: number;
    readonly physicalWidth: number;
    readonly physicalHeight: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly integerScale: number | null;
    readonly filter: number;
}
/**
 * Browser extension: renders a fixed-size game into a native-resolution image,
 * then presents the completed frame to the display.
 */
export declare class BufferedScalableGame implements Game {
    protected readonly held: Game;
    protected readonly normalWidth: number;
    protected readonly normalHeight: number;
    protected readonly maintainAspect: boolean;
    protected container: GameContainer | null;
    protected targetWidth: number;
    protected targetHeight: number;
    protected xoffset: number;
    protected yoffset: number;
    private sourceX;
    private sourceY;
    private sourceWidth;
    private sourceHeight;
    private scalingMode;
    private nativeFrame;
    private nativeGraphics;
    private lastContainerWidth;
    private lastContainerHeight;
    private lastBackingWidth;
    private lastBackingHeight;
    private presentationInfo;
    constructor(held: Game, normalWidth: number, normalHeight: number);
    constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    constructor(held: Game, normalWidth: number, normalHeight: number, options: BufferedScalableGameOptions);
    init(container: GameContainer): void | Promise<void>;
    update(container: GameContainer, delta: number): void;
    render(container: GameContainer, screenGraphics: Graphics): void;
    protected renderOverlay(_container: GameContainer, _g: Graphics): void;
    recalculateScale(): void;
    setScalingMode(mode: BufferedScalingMode): void;
    getScalingMode(): BufferedScalingMode;
    getPresentationInfo(): Readonly<BufferedPresentationInfo>;
    containerSizeChanged(container: GameContainer): void;
    setSourceRectangle(x: number, y: number, width: number, height: number): void;
    closeRequested(): boolean;
    getTitle(): string;
    getNormalWidth(): number;
    getNormalHeight(): number;
    private recalculatePresentation;
    private recalculateScaleIfNeeded;
    private calculatePhysicalPresentation;
    private calculateAspectFitPhysicalRect;
    private snapPhysicalRect;
    private applyPresentationFilter;
    private getConfiguredPresentationFilter;
    private getBackingWidth;
    private getBackingHeight;
    private releaseNativeFrame;
    private validateSourceRectangle;
}
//# sourceMappingURL=BufferedScalableGame.d.ts.map