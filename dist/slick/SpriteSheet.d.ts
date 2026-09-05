import { Image } from "./Image.js";
import { Color } from "./Color.js";
import type { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.SpriteSheet.
 *
 * Fixed-size tile view over a backing image.
 */
export declare class SpriteSheet extends Image {
    private static sheetInUse;
    /** @internal Clears an interrupted accelerated-use guard at a renderer lifecycle boundary. */
    static __resetUseState(): void;
    private readonly target;
    private readonly tileWidth;
    private readonly tileHeight;
    private readonly spacing;
    private readonly margin;
    private subImages;
    constructor(ref: string, tw: number, th: number);
    constructor(ref: string, tw: number, th: number, spacing: number);
    constructor(ref: string, tw: number, th: number, spacing: number, margin: number);
    constructor(ref: string, tw: number, th: number, col: Color);
    constructor(ref: string, tw: number, th: number, col: Color, spacing: number);
    constructor(image: Image, tw: number, th: number);
    constructor(image: Image, tw: number, th: number, spacing: number);
    constructor(image: Image, tw: number, th: number, spacing: number, margin: number);
    /** Java Slick2D counterpart: SpriteSheet.getSubImage(int, int). */
    getSubImage(x: number, y: number): Image;
    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    getSubImage(x: number, y: number, width: number, height: number): Image;
    private createSprite;
    /** Java Slick2D counterpart: SpriteSheet.getSprite(int, int). */
    getSprite(x: number, y: number): Image;
    /** Java Slick2D counterpart: SpriteSheet.getHorizontalCount(). */
    getHorizontalCount(): number;
    /** Java Slick2D counterpart: SpriteSheet.getVerticalCount(). */
    getVerticalCount(): number;
    /** Java Slick2D counterpart: SpriteSheet.startUse(). */
    startUse(): void;
    /** Java Slick2D counterpart: SpriteSheet.renderInUse(int, int, int, int). */
    renderInUse(x: number, y: number, sx: number, sy: number): void;
    /** Java Slick2D counterpart: SpriteSheet.endUse(). */
    endUse(): void;
    /** Java Slick2D counterpart: SpriteSheet.setTexture(Texture). */
    setTexture(texture: WebGLTextureResource): void;
    private initTiles;
    private requireTiles;
}
//# sourceMappingURL=SpriteSheet.d.ts.map