import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { Color } from "./Color.js";
import type { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.SpriteSheet.
 *
 * Fixed-size tile view over a backing image.
 */
export class SpriteSheet extends Image {
    private static sheetInUse: SpriteSheet | null = null;

    private readonly target: Image;
    private readonly tileWidth: number;
    private readonly tileHeight: number;
    private readonly spacing: number;
    private readonly margin: number;
    private subImages: Image[][] | null = null;

    public constructor(ref: string, tw: number, th: number);
    public constructor(ref: string, tw: number, th: number, spacing: number);
    public constructor(ref: string, tw: number, th: number, spacing: number, margin: number);
    public constructor(ref: string, tw: number, th: number, col: Color);
    public constructor(ref: string, tw: number, th: number, col: Color, spacing: number);
    public constructor(image: Image, tw: number, th: number);
    public constructor(image: Image, tw: number, th: number, spacing: number);
    public constructor(image: Image, tw: number, th: number, spacing: number, margin: number);
    /** Java Slick2D counterpart: SpriteSheet constructors. */
    public constructor(refOrImage: string | Image, tw: number, th: number, spacingOrColor: number | Color = 0, marginOrSpacing: number = 0) {
        const refTarget =
            typeof refOrImage === "string"
                ? spacingOrColor instanceof Color
                    ? new Image(refOrImage, false, Image.FILTER_NEAREST, spacingOrColor)
                    : new Image(refOrImage, false, Image.FILTER_NEAREST)
                : refOrImage;
        super(refTarget);
        this.target = typeof refOrImage === "string" ? this : refTarget;
        this.tileWidth = tw;
        this.tileHeight = th;
        this.spacing = spacingOrColor instanceof Color ? marginOrSpacing : spacingOrColor;
        this.margin = spacingOrColor instanceof Color ? 0 : marginOrSpacing;
    }

    /** Java Slick2D counterpart: SpriteSheet.getSubImage(int, int). */
    public override getSubImage(x: number, y: number): Image;
    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    public override getSubImage(x: number, y: number, width: number, height: number): Image;
    public override getSubImage(x: number, y: number, width?: number, height?: number): Image {
        if (width !== undefined && height !== undefined) {
            return super.getSubImage(x, y, width, height);
        }
        this.initTiles();
        const subImages = this.requireTiles();
        const column = subImages[x];
        const image = column?.[y];
        if (!image) {
            throw new Error(`SubImage out of sheet bounds: ${x},${y}`);
        }
        return image;
    }

    private createSprite(x: number, y: number): Image {
        const px = this.margin + x * (this.tileWidth + this.spacing);
        const py = this.margin + y * (this.tileHeight + this.spacing);
        return this.target.getSubImage(px, py, this.tileWidth, this.tileHeight);
    }

    /** Java Slick2D counterpart: SpriteSheet.getSprite(int, int). */
    public getSprite(x: number, y: number): Image {
        this.initTiles();
        const subImages = this.requireTiles();
        const column = subImages[x];
        if (!column || y < 0 || y >= column.length) {
            throw new Error(`SubImage out of sheet bounds: ${x},${y}`);
        }
        return this.createSprite(x, y);
    }

    /** Java Slick2D counterpart: SpriteSheet.getHorizontalCount(). */
    public getHorizontalCount(): number {
        this.initTiles();
        return this.subImages?.length ?? 0;
    }

    /** Java Slick2D counterpart: SpriteSheet.getVerticalCount(). */
    public getVerticalCount(): number {
        this.initTiles();
        return this.subImages?.[0]?.length ?? 0;
    }

    /** Java Slick2D counterpart: SpriteSheet.startUse(). */
    public override startUse(): void {
        if (this.target === this) {
            super.startUse();
        } else {
            this.target.startUse();
        }
        SpriteSheet.sheetInUse = this;
    }

    /** Java Slick2D counterpart: SpriteSheet.renderInUse(int, int, int, int). */
    public renderInUse(x: number, y: number, sx: number, sy: number): void {
        if (SpriteSheet.sheetInUse !== this) {
            throw new SlickException("SpriteSheet.renderInUse called outside startUse/endUse");
        }
        this.getSubImage(sx, sy).drawEmbedded(x, y, this.tileWidth, this.tileHeight);
    }

    /** Java Slick2D counterpart: SpriteSheet.endUse(). */
    public override endUse(): void {
        if (this.target === this) {
            super.endUse();
        } else {
            this.target.endUse();
        }
        if (SpriteSheet.sheetInUse === this) {
            SpriteSheet.sheetInUse = null;
        }
    }

    /** Java Slick2D counterpart: SpriteSheet.setTexture(Texture). */
    public override setTexture(texture: WebGLTextureResource): void {
        this.subImages = null;
        if (this.target === this) {
            super.setTexture(texture);
            return;
        }
        this.target.setTexture(texture);
    }

    private initTiles(): void {
        if (this.subImages !== null) {
            return;
        }
        const denominatorX = this.tileWidth + this.spacing;
        const denominatorY = this.tileHeight + this.spacing;
        if (denominatorX <= 0 || denominatorY <= 0 || this.target.getWidth() <= 0 || this.target.getHeight() <= 0) {
            return;
        }
        const tilesAcross = Math.max(0, Math.trunc((this.target.getWidth() - this.margin * 2 - this.tileWidth) / denominatorX) + 1);
        let tilesDown = Math.max(0, Math.trunc((this.target.getHeight() - this.margin * 2 - this.tileHeight) / denominatorY) + 1);
        if ((this.target.getHeight() - this.tileHeight) % denominatorY !== 0) {
            tilesDown++;
        }
        this.subImages = Array.from({ length: tilesAcross }, (_unused, x) => Array.from({ length: tilesDown }, (_unused2, y) => this.createSprite(x, y)));
    }

    private requireTiles(): Image[][] {
        const tiles = this.subImages;
        if (!tiles || tiles.length === 0 || !tiles[0] || tiles[0].length === 0) {
            throw new SlickException("SpriteSheet image is not loaded or does not contain any tiles");
        }
        return tiles;
    }
}
